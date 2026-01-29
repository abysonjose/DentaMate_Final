from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uvicorn
import os
from contextlib import asynccontextmanager

from src.config.settings import settings
from src.config.database import init_db
from src.config.redis_client import init_redis
from src.middleware.auth import verify_jwt_token
from src.middleware.tenant import get_tenant_context
from src.routes import ocr_routes, health_routes
from src.utils.logger import get_logger

logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting Prescription OCR Service")
    await init_db()
    await init_redis()
    logger.info("Service initialized successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Prescription OCR Service")

# Initialize FastAPI app
app = FastAPI(
    title="Prescription OCR Service",
    description="OCR and normalization service for prescription processing",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure based on environment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Include routes
app.include_router(health_routes.router, prefix="/health", tags=["Health"])
app.include_router(
    ocr_routes.router, 
    prefix="/ocr", 
    tags=["OCR"],
    dependencies=[Depends(verify_jwt_token), Depends(get_tenant_context)]
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Prescription OCR Service",
        "version": "1.0.0",
        "status": "running"
    }

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )