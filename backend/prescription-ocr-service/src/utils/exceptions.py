"""Custom exceptions for the prescription OCR service"""

class PrescriptionOCRException(Exception):
    """Base exception for prescription OCR service"""
    pass

class OCRProcessingError(PrescriptionOCRException):
    """Exception raised when OCR processing fails"""
    pass

class FileProcessingError(PrescriptionOCRException):
    """Exception raised when file processing fails"""
    pass

class DatabaseError(PrescriptionOCRException):
    """Exception raised when database operations fail"""
    pass

class AuthenticationError(PrescriptionOCRException):
    """Exception raised when authentication fails"""
    pass

class AuthorizationError(PrescriptionOCRException):
    """Exception raised when authorization fails"""
    pass

class ValidationError(PrescriptionOCRException):
    """Exception raised when data validation fails"""
    pass

class ExternalServiceError(PrescriptionOCRException):
    """Exception raised when external service calls fail"""
    pass