import redis.asyncio as redis
from src.config.settings import settings
from src.utils.logger import get_logger

logger = get_logger(__name__)

class RedisClient:
    def __init__(self):
        self.redis_client = None
    
    async def connect(self):
        """Connect to Redis"""
        try:
            self.redis_client = redis.from_url(
                settings.REDIS_URL,
                db=settings.REDIS_DB,
                decode_responses=True
            )
            # Test connection
            await self.redis_client.ping()
            logger.info("Connected to Redis successfully")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Redis connection closed")
    
    async def get(self, key: str):
        """Get value from Redis"""
        try:
            return await self.redis_client.get(key)
        except Exception as e:
            logger.error(f"Redis GET error for key {key}: {e}")
            return None
    
    async def set(self, key: str, value: str, expire: int = None):
        """Set value in Redis"""
        try:
            await self.redis_client.set(key, value, ex=expire)
            return True
        except Exception as e:
            logger.error(f"Redis SET error for key {key}: {e}")
            return False
    
    async def delete(self, key: str):
        """Delete key from Redis"""
        try:
            await self.redis_client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Redis DELETE error for key {key}: {e}")
            return False
    
    async def exists(self, key: str):
        """Check if key exists in Redis"""
        try:
            return await self.redis_client.exists(key)
        except Exception as e:
            logger.error(f"Redis EXISTS error for key {key}: {e}")
            return False

# Global Redis client instance
redis_client = RedisClient()

async def get_redis():
    """Get Redis client instance"""
    return redis_client

async def init_redis():
    """Initialize Redis connection"""
    await redis_client.connect()

async def close_redis():
    """Close Redis connection"""
    await redis_client.disconnect()