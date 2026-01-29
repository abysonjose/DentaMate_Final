"""
Redis client configuration for caching and task queuing
"""

import logging
import redis.asyncio as redis
from .settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Global Redis client
_redis_client = None


async def init_redis():
    """Initialize Redis connection"""
    global _redis_client
    
    try:
        _redis_client = redis.from_url(
            settings.REDIS_URL,
            password=settings.REDIS_PASSWORD,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True
        )
        
        # Test connection
        await _redis_client.ping()
        logger.info("Connected to Redis successfully")
        
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        raise


def get_redis():
    """Get Redis client instance"""
    if _redis_client is None:
        raise RuntimeError("Redis not initialized. Call init_redis() first.")
    return _redis_client


async def close_redis():
    """Close Redis connection"""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        logger.info("Redis connection closed")


class CacheKeys:
    """Redis cache key patterns"""
    
    @staticmethod
    def inference_status(request_id: str) -> str:
        return f"inference:status:{request_id}"
    
    @staticmethod
    def inference_result(request_id: str) -> str:
        return f"inference:result:{request_id}"
    
    @staticmethod
    def model_metadata(model_id: str) -> str:
        return f"model:metadata:{model_id}"
    
    @staticmethod
    def tenant_models(tenant_id: str) -> str:
        return f"tenant:models:{tenant_id}"
    
    @staticmethod
    def processing_queue() -> str:
        return "inference:queue:processing"
    
    @staticmethod
    def completed_queue() -> str:
        return "inference:queue:completed"