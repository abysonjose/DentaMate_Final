import re
import spacy
from typing import List, Dict, Optional, Tuple
from src.models.ocr_models import MedicineExtraction
from src.utils.logger import get_logger

logger = get_logger(__name__)

class MedicineParser:
    def __init__(self):
        self.nlp = None
        self._load_nlp_model()
        self._load_medicine_patterns()
        self._load_frequency_mappings()
        self._load_dosage_patterns()
    
    def _load_nlp_model(self):
        """Load spaCy NLP model"""
        try:
            self.nlp = spacy.load("en_core_web_sm")
            logger.info("spaCy model loaded successfully")
        except OSError:
            logger.warning("spaCy model not found, using regex-only parsing")
            self.nlp = None
    
    def _load_medicine_patterns(self):
        """Load common medicine name patterns"""
        self.medicine_patterns = [
            # Common antibiotics
            r'\b(amoxicillin|ampicillin|penicillin|erythromycin|azithromycin|clarithromycin)\b',
            # Pain relievers
            r'\b(ibuprofen|acetaminophen|paracetamol|aspirin|diclofenac|naproxen)\b',
            # Dental specific
            r'\b(lidocaine|benzocaine|chlorhexidine|fluoride|metronidazole)\b',
            # General pattern for medicine names (capitalized words)
            r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b'
        ]
    
    def _load_frequency_mappings(self):
        """Load frequency abbreviation mappings"""
        self.frequency_mappings = {
            # Standard abbreviations
            'od': 'Once a day',
            'o.d.': 'Once a day',
            'once daily': 'Once a day',
            'qd': 'Once a day',
            
            'bd': 'Twice a day',
            'b.d.': 'Twice a day',
            'bid': 'Twice a day',
            'twice daily': 'Twice a day',
            
            'tid': 'Three times a day',
            't.i.d.': 'Three times a day',
            'three times daily': 'Three times a day',
            
            'qid': 'Four times a day',
            'q.i.d.': 'Four times a day',
            'four times daily': 'Four times a day',
            
            # Time-based
            'q4h': 'Every 4 hours',
            'q6h': 'Every 6 hours',
            'q8h': 'Every 8 hours',
            'q12h': 'Every 12 hours',
            
            # Meal-based
            'ac': 'Before meals',
            'pc': 'After meals',
            'with food': 'With meals',
            'on empty stomach': 'On empty stomach'
        }
    
    def _load_dosage_patterns(self):
        """Load dosage pattern regex"""
        self.dosage_patterns = [
            r'\b(\d+(?:\.\d+)?)\s*(mg|g|ml|mcg|µg|units?)\b',
            r'\b(\d+(?:\.\d+)?)\s*(milligrams?|grams?|milliliters?|micrograms?)\b',
            r'\b(\d+)\s*(tablets?|capsules?|drops?|teaspoons?|tablespoons?)\b'
        ]
        
        self.duration_patterns = [
            r'\b(\d+)\s*(days?|weeks?|months?)\b',
            r'\bfor\s+(\d+)\s*(days?|weeks?|months?)\b',
            r'\b(\d+)\s*-\s*(\d+)\s*(days?|weeks?|months?)\b'
        ]
    
    async def parse_prescription_text(self, text: str) -> List[MedicineExtraction]:
        """Parse prescription text and extract medicine information"""
        try:
            # Clean and normalize text
            cleaned_text = self._clean_text(text)
            
            # Split into lines for line-by-line processing
            lines = [line.strip() for line in cleaned_text.split('\n') if line.strip()]
            
            medicines = []
            
            for line in lines:
                # Skip lines that are clearly not prescriptions
                if self._is_prescription_line(line):
                    medicine = await self._parse_medicine_line(line)
                    if medicine:
                        medicines.append(medicine)
            
            # Post-process to improve confidence and normalize
            medicines = self._post_process_medicines(medicines)
            
            logger.info(f"Parsed {len(medicines)} medicines from prescription text")
            return medicines
            
        except Exception as e:
            logger.error(f"Medicine parsing failed: {e}")
            return []
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize OCR text"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Fix common OCR errors
        text = text.replace('0', 'O')  # Zero to O in medicine names
        text = text.replace('1', 'I')  # One to I in some contexts
        
        # Normalize case
        text = text.lower()
        
        return text.strip()
    
    def _is_prescription_line(self, line: str) -> bool:
        """Check if line contains prescription information"""
        # Skip header lines, patient info, etc.
        skip_patterns = [
            r'patient\s+name',
            r'doctor\s+name',
            r'date',
            r'clinic',
            r'hospital',
            r'address',
            r'phone',
            r'email'
        ]
        
        line_lower = line.lower()
        for pattern in skip_patterns:
            if re.search(pattern, line_lower):
                return False
        
        # Check if line contains medicine-like content
        medicine_indicators = [
            r'\b\d+\s*(mg|g|ml|mcg|µg)\b',  # Dosage
            r'\b(od|bd|tid|qid|once|twice|three|four)\b',  # Frequency
            r'\b\d+\s*(days?|weeks?|months?)\b',  # Duration
            r'\btablets?\b|\bcapsules?\b|\bdrops?\b'  # Forms
        ]
        
        for pattern in medicine_indicators:
            if re.search(pattern, line_lower):
                return True
        
        return False
    
    async def _parse_medicine_line(self, line: str) -> Optional[MedicineExtraction]:
        """Parse a single line to extract medicine information"""
        try:
            # Extract medicine name
            name = self._extract_medicine_name(line)
            if not name:
                return None
            
            # Extract dosage
            dosage = self._extract_dosage(line)
            
            # Extract frequency
            frequency = self._extract_frequency(line)
            
            # Extract duration
            duration = self._extract_duration(line)
            
            # Calculate confidence based on extracted information
            confidence = self._calculate_medicine_confidence(name, dosage, frequency, duration, line)
            
            # Normalize extracted data
            normalized_frequency = self._normalize_frequency(frequency) if frequency else None
            
            return MedicineExtraction(
                name=name,
                dosage=dosage,
                frequency=normalized_frequency or frequency,
                duration=duration,
                confidence=confidence,
                raw_text=line,
                normalized=bool(normalized_frequency)
            )
            
        except Exception as e:
            logger.error(f"Failed to parse medicine line '{line}': {e}")
            return None
    
    def _extract_medicine_name(self, line: str) -> Optional[str]:
        """Extract medicine name from line"""
        # Try known medicine patterns first
        for pattern in self.medicine_patterns[:-1]:  # Exclude generic pattern
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                return match.group(1).title()
        
        # Try generic pattern (capitalized words at start of line)
        words = line.split()
        if words:
            # Look for capitalized word(s) at the beginning
            name_parts = []
            for word in words:
                if word[0].isupper() and word.isalpha():
                    name_parts.append(word)
                else:
                    break
            
            if name_parts:
                return ' '.join(name_parts)
        
        return None
    
    def _extract_dosage(self, line: str) -> Optional[str]:
        """Extract dosage information from line"""
        for pattern in self.dosage_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                if len(match.groups()) >= 2:
                    amount, unit = match.groups()[:2]
                    return f"{amount}{unit}"
                else:
                    return match.group(0)
        
        return None
    
    def _extract_frequency(self, line: str) -> Optional[str]:
        """Extract frequency information from line"""
        line_lower = line.lower()
        
        # Check for exact matches in frequency mappings
        for abbrev, full_form in self.frequency_mappings.items():
            if abbrev in line_lower:
                return abbrev
        
        # Check for numeric patterns
        numeric_patterns = [
            r'\b(\d+)\s*times?\s*(?:a\s*|per\s*)?day\b',
            r'\bevery\s*(\d+)\s*hours?\b',
            r'\b(\d+)x\s*daily\b'
        ]
        
        for pattern in numeric_patterns:
            match = re.search(pattern, line_lower)
            if match:
                return match.group(0)
        
        return None
    
    def _extract_duration(self, line: str) -> Optional[str]:
        """Extract duration information from line"""
        for pattern in self.duration_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                return match.group(0)
        
        return None
    
    def _normalize_frequency(self, frequency: str) -> Optional[str]:
        """Normalize frequency to standard format"""
        if not frequency:
            return None
        
        freq_lower = frequency.lower().strip()
        return self.frequency_mappings.get(freq_lower)
    
    def _calculate_medicine_confidence(
        self, 
        name: Optional[str], 
        dosage: Optional[str], 
        frequency: Optional[str], 
        duration: Optional[str], 
        raw_line: str
    ) -> float:
        """Calculate confidence score for extracted medicine"""
        confidence = 0.0
        
        # Base confidence for having a name
        if name:
            confidence += 0.4
            
            # Bonus for known medicine names
            name_lower = name.lower()
            for pattern in self.medicine_patterns[:-1]:
                if re.search(pattern, name_lower):
                    confidence += 0.1
                    break
        
        # Confidence for dosage
        if dosage:
            confidence += 0.2
        
        # Confidence for frequency
        if frequency:
            confidence += 0.2
            
            # Bonus for normalized frequency
            if self._normalize_frequency(frequency):
                confidence += 0.1
        
        # Confidence for duration
        if duration:
            confidence += 0.1
        
        # Penalty for very short or very long lines
        line_length = len(raw_line.split())
        if line_length < 2:
            confidence *= 0.5
        elif line_length > 20:
            confidence *= 0.8
        
        return min(confidence, 1.0)
    
    def _post_process_medicines(self, medicines: List[MedicineExtraction]) -> List[MedicineExtraction]:
        """Post-process medicines to improve quality"""
        # Remove duplicates
        seen_names = set()
        unique_medicines = []
        
        for medicine in medicines:
            name_key = medicine.name.lower() if medicine.name else ""
            if name_key not in seen_names:
                seen_names.add(name_key)
                unique_medicines.append(medicine)
        
        # Sort by confidence
        unique_medicines.sort(key=lambda x: x.confidence, reverse=True)
        
        return unique_medicines