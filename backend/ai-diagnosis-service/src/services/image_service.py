"""
Image processing and management service
"""

import asyncio
import logging
import os
import hashlib
import uuid
from typing import Dict, Optional, Any
from datetime import datetime
import numpy as np
from PIL import Image, ImageEnhance
import cv2
from fastapi import UploadFile
import aiofiles

from ..models.inference import ImageType
from ..config.settings import get_settings
from ..utils.exceptions import ValidationError, ImageProcessingError

logger = logging.getLogger(__name__)
settings = get_settings()


class ImageService:
    """Service for image processing and management"""
    
    def __init__(self):
        self.max_file_size = settings.MAX_FILE_SIZE
        self.allowed_extensions = settings.ALLOWED_EXTENSIONS
        self.storage_path = "storage/images/"
        
        # Ensure storage directory exists
        os.makedirs(self.storage_path, exist_ok=True)
    
    async def validate_image_file(self, image_file: UploadFile) -> bool:
        """Validate uploaded image file"""
        try:
            # Check if file exists
            if not image_file:
                raise ValidationError("No image file provided")
            
            # Check filename
            if not image_file.filename:
                raise ValidationError("Invalid filename")
            
            # Check file extension
            file_extension = image_file.filename.split('.')[-1].lower()
            if file_extension not in self.allowed_extensions:
                raise ValidationError(
                    f"File type '{file_extension}' not allowed. "
                    f"Allowed types: {', '.join(self.allowed_extensions)}"
                )
            
            # Check file size
            contents = await image_file.read()
            file_size = len(contents)
            
            if file_size > self.max_file_size:
                raise ValidationError(
                    f"File too large ({file_size} bytes). "
                    f"Maximum size: {self.max_file_size} bytes"
                )
            
            # Reset file pointer
            await image_file.seek(0)
            
            # Try to open image to validate format
            try:
                image = Image.open(image_file.file)
                image.verify()  # Verify image integrity
                await image_file.seek(0)  # Reset again
            except Exception as e:
                raise ValidationError(f"Invalid image format: {str(e)}")
            
            return True
            
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error validating image file: {e}")
            raise ValidationError(f"Image validation failed: {str(e)}")
    
    async def detect_image_type(self, image_file: UploadFile) -> ImageType:
        """Detect the type of medical image"""
        try:
            # Read image
            contents = await image_file.read()
            await image_file.seek(0)
            
            # Open with PIL
            image = Image.open(image_file.file)
            await image_file.seek(0)
            
            # Get image properties
            width, height = image.size
            mode = image.mode
            
            # Simple heuristics for image type detection
            # In production, this would use more sophisticated methods
            
            # Check filename for hints
            filename = image_file.filename.lower()
            
            if any(keyword in filename for keyword in ['xray', 'x-ray', 'radiograph']):
                if width > 1000 or height > 1000:
                    return ImageType.PANORAMIC
                else:
                    return ImageType.XRAY
            
            elif any(keyword in filename for keyword in ['cbct', '3d', 'cone']):
                return ImageType.CBCT
            
            elif any(keyword in filename for keyword in ['intraoral', 'clinical', 'photo']):
                return ImageType.INTRAORAL
            
            # Fallback based on image characteristics
            if mode == 'L' or mode == 'LA':  # Grayscale
                if width > 1500 or height > 1500:
                    return ImageType.PANORAMIC
                else:
                    return ImageType.XRAY
            else:  # Color
                return ImageType.INTRAORAL
            
        except Exception as e:
            logger.error(f"Error detecting image type: {e}")
            # Default to X-ray if detection fails
            return ImageType.XRAY
    
    async def store_image(self, image_file: UploadFile, tenant_id: str, request_id: str) -> str:
        """Store image securely and return URL"""
        try:
            # Generate secure filename
            file_extension = image_file.filename.split('.')[-1].lower()
            secure_filename = f"{tenant_id}_{request_id}_{uuid.uuid4().hex}.{file_extension}"
            
            # Create tenant directory
            tenant_dir = os.path.join(self.storage_path, tenant_id)
            os.makedirs(tenant_dir, exist_ok=True)
            
            # Full file path
            file_path = os.path.join(tenant_dir, secure_filename)
            
            # Save file
            contents = await image_file.read()
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(contents)
            
            # Reset file pointer
            await image_file.seek(0)
            
            # Return secure URL (in production, this would be a signed URL)
            return f"file://{file_path}"
            
        except Exception as e:
            logger.error(f"Error storing image: {e}")
            raise ImageProcessingError(f"Failed to store image: {str(e)}")
    
    async def load_image(self, image_url: str) -> np.ndarray:
        """Load image from URL and return as numpy array"""
        try:
            # Extract file path from URL
            if image_url.startswith("file://"):
                file_path = image_url[7:]  # Remove "file://" prefix
            else:
                raise ImageProcessingError(f"Unsupported URL scheme: {image_url}")
            
            # Check if file exists
            if not os.path.exists(file_path):
                raise ImageProcessingError(f"Image file not found: {file_path}")
            
            # Load image
            image = Image.open(file_path)
            
            # Convert to numpy array
            image_array = np.array(image)
            
            return image_array
            
        except Exception as e:
            logger.error(f"Error loading image: {e}")
            raise ImageProcessingError(f"Failed to load image: {str(e)}")
    
    async def extract_metadata(self, image_file: UploadFile) -> Dict[str, Any]:
        """Extract metadata from image file"""
        try:
            # Read image
            image = Image.open(image_file.file)
            await image_file.seek(0)
            
            # Basic metadata
            metadata = {
                'filename': image_file.filename,
                'format': image.format,
                'mode': image.mode,
                'size': image.size,
                'width': image.size[0],
                'height': image.size[1]
            }
            
            # EXIF data if available
            if hasattr(image, '_getexif') and image._getexif():
                exif_data = image._getexif()
                if exif_data:
                    metadata['exif'] = {
                        str(k): str(v) for k, v in exif_data.items() 
                        if isinstance(v, (str, int, float))
                    }
            
            # File size
            contents = await image_file.read()
            metadata['file_size'] = len(contents)
            await image_file.seek(0)
            
            # Calculate hash for deduplication
            metadata['hash'] = hashlib.md5(contents).hexdigest()
            
            return metadata
            
        except Exception as e:
            logger.error(f"Error extracting metadata: {e}")
            return {
                'filename': image_file.filename,
                'error': str(e)
            }
    
    async def preprocess_image(self, image_array: np.ndarray, image_type: ImageType) -> np.ndarray:
        """Preprocess image based on type for AI analysis"""
        try:
            if image_type in [ImageType.XRAY, ImageType.PANORAMIC]:
                return await self._preprocess_xray(image_array)
            elif image_type == ImageType.INTRAORAL:
                return await self._preprocess_intraoral(image_array)
            elif image_type == ImageType.CBCT:
                return await self._preprocess_cbct(image_array)
            else:
                return await self._preprocess_generic(image_array)
                
        except Exception as e:
            logger.error(f"Error preprocessing image: {e}")
            raise ImageProcessingError(f"Image preprocessing failed: {str(e)}")
    
    async def _preprocess_xray(self, image_array: np.ndarray) -> np.ndarray:
        """Preprocess X-ray images"""
        try:
            # Convert to grayscale if needed
            if len(image_array.shape) == 3:
                if image_array.shape[2] == 3:  # RGB
                    image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
                elif image_array.shape[2] == 4:  # RGBA
                    image_array = cv2.cvtColor(image_array, cv2.COLOR_RGBA2GRAY)
            
            # Resize to standard size
            target_size = (512, 512)
            image_array = cv2.resize(image_array, target_size, interpolation=cv2.INTER_LANCZOS4)
            
            # Apply histogram equalization for better contrast
            image_array = cv2.equalizeHist(image_array.astype(np.uint8))
            
            # Normalize to [0, 1]
            image_array = image_array.astype(np.float32) / 255.0
            
            # Add batch and channel dimensions
            image_array = np.expand_dims(image_array, axis=(0, -1))
            
            return image_array
            
        except Exception as e:
            logger.error(f"Error preprocessing X-ray: {e}")
            raise ImageProcessingError(f"X-ray preprocessing failed: {str(e)}")
    
    async def _preprocess_intraoral(self, image_array: np.ndarray) -> np.ndarray:
        """Preprocess intraoral images"""
        try:
            # Ensure RGB format
            if len(image_array.shape) == 2:  # Grayscale
                image_array = cv2.cvtColor(image_array, cv2.COLOR_GRAY2RGB)
            elif len(image_array.shape) == 3 and image_array.shape[2] == 4:  # RGBA
                image_array = cv2.cvtColor(image_array, cv2.COLOR_RGBA2RGB)
            
            # Resize to standard size
            target_size = (224, 224)
            image_array = cv2.resize(image_array, target_size, interpolation=cv2.INTER_LANCZOS4)
            
            # Color enhancement
            image_pil = Image.fromarray(image_array.astype(np.uint8))
            
            # Enhance contrast
            enhancer = ImageEnhance.Contrast(image_pil)
            image_pil = enhancer.enhance(1.2)
            
            # Enhance color
            enhancer = ImageEnhance.Color(image_pil)
            image_pil = enhancer.enhance(1.1)
            
            # Convert back to numpy
            image_array = np.array(image_pil)
            
            # Normalize to [0, 1]
            image_array = image_array.astype(np.float32) / 255.0
            
            # Add batch dimension
            image_array = np.expand_dims(image_array, axis=0)
            
            return image_array
            
        except Exception as e:
            logger.error(f"Error preprocessing intraoral image: {e}")
            raise ImageProcessingError(f"Intraoral preprocessing failed: {str(e)}")
    
    async def _preprocess_cbct(self, image_array: np.ndarray) -> np.ndarray:
        """Preprocess CBCT images"""
        try:
            # For CBCT, we might have 3D data, but for now treat as 2D slice
            if len(image_array.shape) == 3 and image_array.shape[2] > 4:
                # Take middle slice if 3D
                image_array = image_array[:, :, image_array.shape[2] // 2]
            
            # Convert to grayscale if needed
            if len(image_array.shape) == 3:
                if image_array.shape[2] == 3:  # RGB
                    image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
                elif image_array.shape[2] == 4:  # RGBA
                    image_array = cv2.cvtColor(image_array, cv2.COLOR_RGBA2GRAY)
            
            # Resize to standard size
            target_size = (512, 512)
            image_array = cv2.resize(image_array, target_size, interpolation=cv2.INTER_LANCZOS4)
            
            # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            image_array = clahe.apply(image_array.astype(np.uint8))
            
            # Normalize to [0, 1]
            image_array = image_array.astype(np.float32) / 255.0
            
            # Add batch and channel dimensions
            image_array = np.expand_dims(image_array, axis=(0, -1))
            
            return image_array
            
        except Exception as e:
            logger.error(f"Error preprocessing CBCT: {e}")
            raise ImageProcessingError(f"CBCT preprocessing failed: {str(e)}")
    
    async def _preprocess_generic(self, image_array: np.ndarray) -> np.ndarray:
        """Generic image preprocessing"""
        try:
            # Convert to RGB if needed
            if len(image_array.shape) == 2:  # Grayscale
                image_array = cv2.cvtColor(image_array, cv2.COLOR_GRAY2RGB)
            elif len(image_array.shape) == 3 and image_array.shape[2] == 4:  # RGBA
                image_array = cv2.cvtColor(image_array, cv2.COLOR_RGBA2RGB)
            
            # Resize to standard size
            target_size = (224, 224)
            image_array = cv2.resize(image_array, target_size, interpolation=cv2.INTER_LANCZOS4)
            
            # Normalize to [0, 1]
            image_array = image_array.astype(np.float32) / 255.0
            
            # Add batch dimension
            image_array = np.expand_dims(image_array, axis=0)
            
            return image_array
            
        except Exception as e:
            logger.error(f"Error in generic preprocessing: {e}")
            raise ImageProcessingError(f"Generic preprocessing failed: {str(e)}")
    
    async def calculate_image_hash(self, image_file: UploadFile) -> str:
        """Calculate hash of image for deduplication"""
        try:
            contents = await image_file.read()
            await image_file.seek(0)
            
            return hashlib.md5(contents).hexdigest()
            
        except Exception as e:
            logger.error(f"Error calculating image hash: {e}")
            return ""
    
    async def cleanup_old_images(self, days_old: int = 30):
        """Clean up old image files"""
        try:
            cutoff_time = datetime.now().timestamp() - (days_old * 24 * 3600)
            
            for root, dirs, files in os.walk(self.storage_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    
                    # Check file age
                    if os.path.getmtime(file_path) < cutoff_time:
                        try:
                            os.remove(file_path)
                            logger.info(f"Cleaned up old image: {file_path}")
                        except Exception as e:
                            logger.error(f"Error removing old image {file_path}: {e}")
            
        except Exception as e:
            logger.error(f"Error during image cleanup: {e}")