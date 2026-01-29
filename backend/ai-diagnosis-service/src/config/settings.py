"""
Application settings and configuration
"""

import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings"""
    
    # Service configuration
    SERVICE_NAME: str = "ai-diagnosis-service"
    VERSION: str = "1.0.0"
    DEBUG: bool = Field(default=False, env="DEBUG")
    PORT: int = Field(default=8003, env="PORT")
    
    # Security
    JWT_SECRET: str = Field(..., env="JWT_SECRET")
    JWT_ALGORITHM: str = Field(default="HS256", env="JWT_ALGORITHM")
    
    # Database
    MONGODB_URI: str = Field(..., env="MONGODB_URI")
    DATABASE_NAME: str = Field(default="dentamate", env="DATABASE_NAME")
    
    # Redis
    REDIS_URL: str = Field(..., env="REDIS_URL")
    REDIS_PASSWORD: str = Field(default="", env="REDIS_PASSWORD")
    
    # File storage
    MAX_FILE_SIZE: int = Field(default=50 * 1024 * 1024, env="MAX_FILE_SIZE")  # 50MB
    ALLOWED_EXTENSIONS: List[str] = Field(
        default=["png", "jpg", "jpeg", "dcm", "tiff", "bmp"],
        env="ALLOWED_EXTENSIONS"
    )
    
    # AI Models
    MODELS_PATH: str = Field(default="models/", env="MODELS_PATH")
    MODEL_VERSION: str = Field(default="v1.2.0", env="MODEL_VERSION")
    GPU_ENABLED: bool = Field(default=False, env="GPU_ENABLED")
    
    # Processing
    ASYNC_PROCESSING: bool = Field(default=True, env="ASYNC_PROCESSING")
    MAX_CONCURRENT_INFERENCES: int = Field(default=5, env="MAX_CONCURRENT_INFERENCES")
    INFERENCE_TIMEOUT: int = Field(default=300, env="INFERENCE_TIMEOUT")  # 5 minutes
    
    # External services
    LAB_DIAGNOSTICS_SERVICE_URL: str = Field(..., env="LAB_DIAGNOSTICS_SERVICE_URL")
    NOTIFICATION_SERVICE_URL: str = Field(..., env="NOTIFICATION_SERVICE_URL")
    
    # CORS
    ALLOWED_ORIGINS: List[str] = Field(
        default=["http://localhost:4200", "http://localhost:3000"],
        env="ALLOWED_ORIGINS"
    )
    
    # Logging
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FILE: str = Field(default="logs/ai-diagnosis.log", env="LOG_FILE")
    
    # XAI (Explainable AI)
    GENERATE_HEATMAPS: bool = Field(default=True, env="GENERATE_HEATMAPS")
    HEATMAP_RESOLUTION: int = Field(default=512, env="HEATMAP_RESOLUTION")
    
    # Audit and compliance
    AUDIT_ENABLED: bool = Field(default=True, env="AUDIT_ENABLED")
    RETENTION_DAYS: int = Field(default=2555, env="RETENTION_DAYS")  # 7 years
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
_settings = None


def get_settings() -> Settings:
    """Get application settings singleton"""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings