from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
import os

class Settings(BaseSettings):
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8007
    DEBUG: bool = False
    
    # Database Configuration
    MONGODB_URL: str = "mongodb+srv://username:password@cluster0.ozkxezh.mongodb.net/?appName=Cluster0"
    DATABASE_NAME: str = "prescription_ocr_db"
    
    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_DB: int = 0
    
    # JWT Configuration
    JWT_SECRET_KEY: str = Field(default_factory=lambda: os.getenv("JWT_SECRET_KEY", "your-super-secret-jwt-key-here"))
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30
    
    # File Storage Configuration
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 10485760  # 10MB
    ALLOWED_EXTENSIONS: List[str] = ["jpg", "jpeg", "png", "pdf", "tiff", "bmp"]
    
    # OCR Configuration
    TESSERACT_PATH: str = "/usr/bin/tesseract"
    TESSERACT_CONFIG: str = "--oem 3 --psm 6"
    OCR_CONFIDENCE_THRESHOLD: float = 0.6
    USE_EASYOCR_FALLBACK: bool = True
    
    # External Services
    API_GATEWAY_URL: str = "http://localhost:8000"
    PHARMACY_SERVICE_URL: str = "http://localhost:8008"
    AUDIT_SERVICE_URL: str = "http://localhost:8009"
    
    # Logging Configuration
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create settings instance
settings = Settings()