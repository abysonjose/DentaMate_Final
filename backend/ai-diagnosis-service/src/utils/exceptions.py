"""
Custom exceptions for AI Diagnosis Service
"""


class AIServiceException(Exception):
    """Base exception for AI service errors"""
    
    def __init__(self, message: str, error_code: str = "AI_SERVICE_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


class ValidationError(AIServiceException):
    """Exception for validation errors"""
    
    def __init__(self, message: str):
        super().__init__(message, "VALIDATION_ERROR")


class AuthenticationError(AIServiceException):
    """Exception for authentication errors"""
    
    def __init__(self, message: str):
        super().__init__(message, "AUTHENTICATION_ERROR")


class AuthorizationError(AIServiceException):
    """Exception for authorization errors"""
    
    def __init__(self, message: str):
        super().__init__(message, "AUTHORIZATION_ERROR")


class TenantIsolationError(AIServiceException):
    """Exception for tenant isolation violations"""
    
    def __init__(self, message: str):
        super().__init__(message, "TENANT_ISOLATION_ERROR")


class ModelLoadError(AIServiceException):
    """Exception for model loading errors"""
    
    def __init__(self, message: str):
        super().__init__(message, "MODEL_LOAD_ERROR")


class ModelNotFoundError(AIServiceException):
    """Exception for model not found errors"""
    
    def __init__(self, message: str):
        super().__init__(message, "MODEL_NOT_FOUND")


class ImageProcessingError(AIServiceException):
    """Exception for image processing errors"""
    
    def __init__(self, message: str):
        super().__init__(message, "IMAGE_PROCESSING_ERROR")


class XAIGenerationError(AIServiceException):
    """Exception for XAI generation errors"""
    
    def __init__(self, message: str):
        super().__init__(message, "XAI_GENERATION_ERROR")


class InferenceError(AIServiceException):
    """Exception for inference processing errors"""
    
    def __init__(self, message: str):
        super().__init__(message, "INFERENCE_ERROR")


class DatabaseError(AIServiceException):
    """Exception for database operation errors"""
    
    def __init__(self, message: str):
        super().__init__(message, "DATABASE_ERROR")


class CacheError(AIServiceException):
    """Exception for cache operation errors"""
    
    def __init__(self, message: str):
        super().__init__(message, "CACHE_ERROR")


class ExternalServiceError(AIServiceException):
    """Exception for external service communication errors"""
    
    def __init__(self, message: str, service_name: str = "unknown"):
        self.service_name = service_name
        super().__init__(f"{service_name}: {message}", "EXTERNAL_SERVICE_ERROR")


class ConfigurationError(AIServiceException):
    """Exception for configuration errors"""
    
    def __init__(self, message: str):
        super().__init__(message, "CONFIGURATION_ERROR")


class ResourceLimitError(AIServiceException):
    """Exception for resource limit errors"""
    
    def __init__(self, message: str):
        super().__init__(message, "RESOURCE_LIMIT_ERROR")


class TimeoutError(AIServiceException):
    """Exception for timeout errors"""
    
    def __init__(self, message: str, timeout_seconds: int = 0):
        self.timeout_seconds = timeout_seconds
        super().__init__(f"Timeout after {timeout_seconds}s: {message}", "TIMEOUT_ERROR")


# Error code mappings for HTTP status codes
ERROR_CODE_TO_HTTP_STATUS = {
    "VALIDATION_ERROR": 400,
    "AUTHENTICATION_ERROR": 401,
    "AUTHORIZATION_ERROR": 403,
    "TENANT_ISOLATION_ERROR": 403,
    "MODEL_NOT_FOUND": 404,
    "MODEL_LOAD_ERROR": 500,
    "IMAGE_PROCESSING_ERROR": 422,
    "XAI_GENERATION_ERROR": 500,
    "INFERENCE_ERROR": 500,
    "DATABASE_ERROR": 500,
    "CACHE_ERROR": 500,
    "EXTERNAL_SERVICE_ERROR": 502,
    "CONFIGURATION_ERROR": 500,
    "RESOURCE_LIMIT_ERROR": 429,
    "TIMEOUT_ERROR": 408,
    "AI_SERVICE_ERROR": 500
}


def get_http_status_for_error(error: AIServiceException) -> int:
    """Get appropriate HTTP status code for an exception"""
    return ERROR_CODE_TO_HTTP_STATUS.get(error.error_code, 500)


def create_error_response(error: AIServiceException) -> dict:
    """Create standardized error response"""
    return {
        "error": {
            "code": error.error_code,
            "message": error.message,
            "timestamp": "2024-01-01T00:00:00Z"  # Would use actual timestamp
        }
    }