"""
Database configuration and connection management
"""

import logging
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
from .settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Global database client
_client = None
_database = None


async def init_database():
    """Initialize database connection"""
    global _client, _database
    
    try:
        _client = AsyncIOMotorClient(settings.MONGODB_URI)
        _database = _client[settings.DATABASE_NAME]
        
        # Test connection
        await _client.admin.command('ping')
        logger.info("Connected to MongoDB successfully")
        
        # Create indexes
        await create_indexes()
        
    except ConnectionFailure as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        raise


async def create_indexes():
    """Create database indexes for optimal performance"""
    try:
        # Inference requests indexes
        await _database.inference_requests.create_index([
            ("tenant_id", 1),
            ("status", 1),
            ("created_at", -1)
        ])
        
        await _database.inference_requests.create_index([
            ("request_id", 1)
        ], unique=True)
        
        # Inference results indexes
        await _database.inference_results.create_index([
            ("request_id", 1)
        ], unique=True)
        
        await _database.inference_results.create_index([
            ("tenant_id", 1),
            ("patient_id", 1),
            ("created_at", -1)
        ])
        
        # Audit logs indexes
        await _database.ai_audit_logs.create_index([
            ("tenant_id", 1),
            ("timestamp", -1)
        ])
        
        await _database.ai_audit_logs.create_index([
            ("request_id", 1)
        ])
        
        # Model metadata indexes
        await _database.model_metadata.create_index([
            ("model_id", 1),
            ("version", 1)
        ], unique=True)
        
        logger.info("Database indexes created successfully")
        
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")


def get_database():
    """Get database instance"""
    if _database is None:
        raise RuntimeError("Database not initialized. Call init_database() first.")
    return _database


async def close_database():
    """Close database connection"""
    global _client
    if _client:
        _client.close()
        logger.info("Database connection closed")