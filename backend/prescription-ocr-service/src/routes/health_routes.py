from fastapi import APIRouter, HTTPException, status
from datetime import datetime
from src.config.database import get_database
from src.config.redis_client import get_redis
from src.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()

@router.get("/")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "service": "prescription-ocr-service",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@router.get("/detailed")
async def detailed_health_check():
    """Detailed health check with dependency status"""
    health_status = {
        "status": "healthy",
        "service": "prescription-ocr-service",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "dependencies": {}
    }
    
    overall_healthy = True
    
    # Check MongoDB connection
    try:
        db = await get_database()
        await db.command("ping")
        health_status["dependencies"]["mongodb"] = {
            "status": "healthy",
            "response_time_ms": 0  # Could measure actual response time
        }
    except Exception as e:
        logger.error(f"MongoDB health check failed: {e}")
        health_status["dependencies"]["mongodb"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        overall_healthy = False
    
    # Check Redis connection
    try:
        redis_client = await get_redis()
        await redis_client.redis_client.ping()
        health_status["dependencies"]["redis"] = {
            "status": "healthy",
            "response_time_ms": 0
        }
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        health_status["dependencies"]["redis"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        overall_healthy = False
    
    # Check OCR engines
    try:
        import pytesseract
        # Simple test to ensure Tesseract is available
        pytesseract.get_tesseract_version()
        health_status["dependencies"]["tesseract"] = {
            "status": "healthy",
            "version": str(pytesseract.get_tesseract_version())
        }
    except Exception as e:
        logger.error(f"Tesseract health check failed: {e}")
        health_status["dependencies"]["tesseract"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        overall_healthy = False
    
    # Check EasyOCR (optional)
    try:
        import easyocr
        health_status["dependencies"]["easyocr"] = {
            "status": "healthy",
            "available": True
        }
    except Exception as e:
        health_status["dependencies"]["easyocr"] = {
            "status": "unavailable",
            "error": str(e)
        }
        # EasyOCR is optional, so don't mark overall as unhealthy
    
    # Set overall status
    if not overall_healthy:
        health_status["status"] = "unhealthy"
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=health_status
        )
    
    return health_status

@router.get("/ready")
async def readiness_check():
    """Kubernetes readiness probe endpoint"""
    try:
        # Check critical dependencies
        db = await get_database()
        await db.command("ping")
        
        redis_client = await get_redis()
        await redis_client.redis_client.ping()
        
        return {"status": "ready"}
        
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "not ready", "error": str(e)}
        )

@router.get("/live")
async def liveness_check():
    """Kubernetes liveness probe endpoint"""
    return {"status": "alive"}