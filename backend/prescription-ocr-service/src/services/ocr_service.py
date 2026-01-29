import asyncio
import time
from typing import List, Optional, Tuple
import pytesseract
import easyocr
import cv2
import numpy as np
from PIL import Image
import os
import re
from src.config.settings import settings
from src.models.ocr_models import MedicineExtraction, OCRResult, OCRStatus
from src.services.medicine_parser import MedicineParser
from src.utils.logger import get_logger
from src.utils.exceptions import OCRProcessingError

logger = get_logger(__name__)

class OCRService:
    def __init__(self):
        self.medicine_parser = MedicineParser()
        self.easyocr_reader = None
        
        # Initialize EasyOCR if enabled
        if settings.USE_EASYOCR_FALLBACK:
            try:
                self.easyocr_reader = easyocr.Reader(['en'])
                logger.info("EasyOCR initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize EasyOCR: {e}")
                self.easyocr_reader = None
    
    async def process_prescription(
        self, 
        file_path: str, 
        request_id: str,
        tenant_id: str,
        branch_id: str
    ) -> OCRResult:
        """Process prescription image and extract structured data"""
        start_time = time.time()
        
        try:
            # Preprocess image
            processed_image = await self._preprocess_image(file_path)
            
            # Extract text using OCR
            raw_text, confidence, ocr_engine = await self._extract_text(processed_image)
            
            if not raw_text.strip():
                raise OCRProcessingError("No text could be extracted from the image")
            
            # Parse medicines from extracted text
            medicines = await self._parse_medicines(raw_text)
            
            # Calculate overall confidence
            overall_confidence = self._calculate_overall_confidence(medicines, confidence)
            
            processing_time = time.time() - start_time
            
            # Create OCR result
            result = OCRResult(
                request_id=request_id,
                tenant_id=tenant_id,
                branch_id=branch_id,
                raw_text=raw_text,
                medicines=medicines,
                overall_confidence=overall_confidence,
                processing_time=processing_time,
                ocr_engine=ocr_engine
            )
            
            logger.info(f"OCR processing completed for request {request_id} in {processing_time:.2f}s")
            return result
            
        except Exception as e:
            logger.error(f"OCR processing failed for request {request_id}: {e}")
            raise OCRProcessingError(f"OCR processing failed: {str(e)}")
    
    async def _preprocess_image(self, file_path: str) -> np.ndarray:
        """Preprocess image for better OCR results"""
        try:
            # Load image
            if file_path.lower().endswith('.pdf'):
                # Handle PDF files (convert first page to image)
                image = await self._pdf_to_image(file_path)
            else:
                image = cv2.imread(file_path)
            
            if image is None:
                raise OCRProcessingError("Could not load image file")
            
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply noise reduction
            denoised = cv2.medianBlur(gray, 3)
            
            # Apply adaptive thresholding
            thresh = cv2.adaptiveThreshold(
                denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            
            # Apply morphological operations to clean up
            kernel = np.ones((1, 1), np.uint8)
            cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            
            return cleaned
            
        except Exception as e:
            logger.error(f"Image preprocessing failed: {e}")
            raise OCRProcessingError(f"Image preprocessing failed: {str(e)}")
    
    async def _pdf_to_image(self, pdf_path: str) -> np.ndarray:
        """Convert PDF first page to image"""
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(pdf_path)
            page = doc[0]  # First page
            pix = page.get_pixmap()
            img_data = pix.tobytes("ppm")
            
            # Convert to OpenCV format
            nparr = np.frombuffer(img_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            doc.close()
            
            return image
            
        except ImportError:
            logger.error("PyMuPDF not installed, cannot process PDF files")
            raise OCRProcessingError("PDF processing not supported")
        except Exception as e:
            logger.error(f"PDF to image conversion failed: {e}")
            raise OCRProcessingError(f"PDF processing failed: {str(e)}")
    
    async def _extract_text(self, image: np.ndarray) -> Tuple[str, float, str]:
        """Extract text using OCR engines"""
        try:
            # Try Tesseract first
            text, confidence = await self._tesseract_ocr(image)
            
            # If confidence is low and EasyOCR is available, try as fallback
            if (confidence < settings.OCR_CONFIDENCE_THRESHOLD and 
                self.easyocr_reader is not None):
                logger.info("Using EasyOCR as fallback due to low Tesseract confidence")
                easyocr_text, easyocr_confidence = await self._easyocr_ocr(image)
                
                if easyocr_confidence > confidence:
                    return easyocr_text, easyocr_confidence, "EasyOCR"
            
            return text, confidence, "Tesseract"
            
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            raise OCRProcessingError(f"Text extraction failed: {str(e)}")
    
    async def _tesseract_ocr(self, image: np.ndarray) -> Tuple[str, float]:
        """Extract text using Tesseract OCR"""
        try:
            # Configure Tesseract
            config = settings.TESSERACT_CONFIG
            
            # Extract text
            text = pytesseract.image_to_string(image, config=config)
            
            # Get confidence scores
            data = pytesseract.image_to_data(image, config=config, output_type=pytesseract.Output.DICT)
            confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
            
            # Calculate average confidence
            avg_confidence = sum(confidences) / len(confidences) / 100.0 if confidences else 0.0
            
            return text.strip(), avg_confidence
            
        except Exception as e:
            logger.error(f"Tesseract OCR failed: {e}")
            raise OCRProcessingError(f"Tesseract OCR failed: {str(e)}")
    
    async def _easyocr_ocr(self, image: np.ndarray) -> Tuple[str, float]:
        """Extract text using EasyOCR"""
        try:
            if self.easyocr_reader is None:
                raise OCRProcessingError("EasyOCR not initialized")
            
            # Run EasyOCR in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                None, self.easyocr_reader.readtext, image
            )
            
            # Extract text and confidence
            text_parts = []
            confidences = []
            
            for (bbox, text, conf) in results:
                if conf > 0.3:  # Filter low confidence detections
                    text_parts.append(text)
                    confidences.append(conf)
            
            text = ' '.join(text_parts)
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
            
            return text.strip(), avg_confidence
            
        except Exception as e:
            logger.error(f"EasyOCR failed: {e}")
            raise OCRProcessingError(f"EasyOCR failed: {str(e)}")
    
    async def _parse_medicines(self, raw_text: str) -> List[MedicineExtraction]:
        """Parse medicines from raw OCR text"""
        try:
            return await self.medicine_parser.parse_prescription_text(raw_text)
        except Exception as e:
            logger.error(f"Medicine parsing failed: {e}")
            # Return empty list if parsing fails
            return []
    
    def _calculate_overall_confidence(self, medicines: List[MedicineExtraction], ocr_confidence: float) -> float:
        """Calculate overall confidence score"""
        if not medicines:
            return ocr_confidence * 0.5  # Penalize if no medicines found
        
        # Average medicine confidence
        medicine_confidences = [med.confidence for med in medicines]
        avg_medicine_confidence = sum(medicine_confidences) / len(medicine_confidences)
        
        # Weighted average of OCR and medicine parsing confidence
        overall = (ocr_confidence * 0.4) + (avg_medicine_confidence * 0.6)
        
        return min(overall, 1.0)