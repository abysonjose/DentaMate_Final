"""
AI Diagnosis Service - Main Application
Provides AI-powered dental image analysis with explainable results
"""

import os
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
import uvicorn

from src.config.settings import get_settings
from src.config.database import init_database
from src.config.redis_client import init_redis
from src.middleware.auth import verify_jwt_token, get_current_service
from src.middleware.tenant import extract_tenant_context
from src.models.inference import InferenceRequest, InferenceResult, InferenceStatus
from src.services.inference_service import InferenceService
from src.services.model_service import ModelService
from src.services.xai_service import XAIService
from src.utils.logger import setup_logger
from src.utils.exceptions import AIServiceException

# Setup logging
logger = setup_logger(__name__)
settings = get_settings()

# Security
security = HTTPBearer()

"""
AI Diagnosis Service - Main Application
Provides AI-powered dental image analysis with explainable results
"""

import os
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
import uvicorn

from src.config.settings import get_settings
from src.config.database import init_database
from src.config.redis_client import init_redis
from src.middleware.auth import verify_jwt_token, get_current_service
from src.middleware.tenant import extract_tenant_context
from src.models.inference import InferenceRequest, InferenceResult, InferenceStatus
from src.services.inference_service import InferenceService
from src.services.model_service import ModelService
from src.services.xai_service import XAIService
from src.utils.logger import setup_logger
from src.utils.exceptions import AIServiceException

# Setup logging
logger = setup_logger(__name__)
settings = get_settings()

# Security
security = HTTPBearer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Starting AI Diagnosis Service...")
    
    # Initialize database
    await init_database()
    
    # Initialize Redis
    await init_redis()
    
    # Initialize ML models
    model_service = ModelService()
    await model_service.load_models()
    
    logger.info("AI Diagnosis Service started successfully")
    yield
    
    logger.info("Shutting down AI Diagnosis Service...")

# FastAPI app
app = FastAPI(
    title="AI Diagnosis Service",
    description="AI-powered dental image analysis with explainable results",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ai-diagnosis-service",
        "version": "1.0.0"
    }

# Inference endpoints
@app.post("/inference/analyze", response_model=dict)
async def analyze_image(
    background_tasks: BackgroundTasks,
    diagnostic_order_id: str,
    patient_id: str,
    appointment_id: str,
    branch_id: str,
    image_file: UploadFile = File(...),
    current_service: dict = Depends(get_current_service),
    tenant_context: dict = Depends(extract_tenant_context)
):
    """
    Analyze dental image using AI models
    Returns request ID for async processing
    """
    try:
        inference_service = InferenceService()
        
        # Create inference request
        request_id = await inference_service.create_inference_request(
            diagnostic_order_id=diagnostic_order_id,
            patient_id=patient_id,
            appointment_id=appointment_id,
            branch_id=branch_id,
            tenant_id=tenant_context["tenant_id"],
            image_file=image_file,
            requesting_service=current_service["service_name"]
        )
        
        # Start async processing
        background_tasks.add_task(
            inference_service.process_inference,
            request_id
        )
        
        return {
            "status": "accepted",
            "request_id": request_id,
            "message": "Image analysis started"
        }
        
    except AIServiceException as e:
        logger.error(f"AI service error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in analyze_image: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/inference/status/{request_id}")
async def get_inference_status(
    request_id: str,
    current_service: dict = Depends(get_current_service),
    tenant_context: dict = Depends(extract_tenant_context)
):
    """Get inference request status"""
    try:
        inference_service = InferenceService()
        status = await inference_service.get_inference_status(
            request_id, 
            tenant_context["tenant_id"]
        )
        
        if not status:
            raise HTTPException(status_code=404, detail="Inference request not found")
            
        return status
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting inference status: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/inference/result/{request_id}")
async def get_inference_result(
    request_id: str,
    current_service: dict = Depends(get_current_service),
    tenant_context: dict = Depends(extract_tenant_context)
):
    """Get inference result with XAI artifacts"""
    try:
        inference_service = InferenceService()
        result = await inference_service.get_inference_result(
            request_id,
            tenant_context["tenant_id"]
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Inference result not found")
            
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting inference result: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Model management endpoints (Internal)
@app.get("/models")
async def list_models(
    current_service: dict = Depends(get_current_service)
):
    """List available AI models"""
    try:
        model_service = ModelService()
        models = await model_service.list_models()
        return {"models": models}
        
    except Exception as e:
        logger.error(f"Error listing models: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/models/activate")
async def activate_model(
    model_id: str,
    version: str,
    current_service: dict = Depends(get_current_service)
):
    """Activate a specific model version"""
    try:
        model_service = ModelService()
        success = await model_service.activate_model(model_id, version)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to activate model")
            
        return {"status": "success", "message": f"Model {model_id} v{version} activated"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating model: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/models/deactivate")
async def deactivate_model(
    model_id: str,
    current_service: dict = Depends(get_current_service)
):
    """Deactivate a model"""
    try:
        model_service = ModelService()
        success = await model_service.deactivate_model(model_id)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to deactivate model")
            
        return {"status": "success", "message": f"Model {model_id} deactivated"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating model: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Error handlers
@app.exception_handler(AIServiceException)
async def ai_service_exception_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={"error": "AI Service Error", "detail": str(exc)}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error", "detail": "An unexpected error occurred"}
    )

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8003)),
        reload=settings.DEBUG,
        log_level="info"
    )