from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
from src.config.settings import settings
from src.utils.logger import get_logger

logger = get_logger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    database = None

db = Database()

async def get_database():
    """Get database instance"""
    return db.database

async def init_db():
    """Initialize database connection"""
    try:
        db.client = AsyncIOMotorClient(settings.MONGODB_URL)
        db.database = db.client[settings.DATABASE_NAME]
        
        # Test connection
        await db.client.admin.command('ping')
        logger.info(f"Connected to MongoDB: {settings.DATABASE_NAME}")
        
        # Create indexes
        await create_indexes()
        
    except ConnectionFailure as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise

async def close_db():
    """Close database connection"""
    if db.client:
        db.client.close()
        logger.info("MongoDB connection closed")

async def create_indexes():
    """Create database indexes"""
    try:
        # OCR Requests collection indexes
        ocr_requests = db.database.ocr_requests
        await ocr_requests.create_index("request_id", unique=True)
        await ocr_requests.create_index("tenant_id")
        await ocr_requests.create_index("branch_id")
        await ocr_requests.create_index("appointment_id")
        await ocr_requests.create_index("status")
        await ocr_requests.create_index("created_at")
        
        # OCR Results collection indexes
        ocr_results = db.database.ocr_results
        await ocr_results.create_index("request_id", unique=True)
        await ocr_results.create_index("tenant_id")
        await ocr_results.create_index("branch_id")
        
        # Audit Logs collection indexes
        audit_logs = db.database.audit_logs
        await audit_logs.create_index("request_id")
        await audit_logs.create_index("tenant_id")
        await audit_logs.create_index("user_id")
        await audit_logs.create_index("timestamp")
        
        logger.info("Database indexes created successfully")
        
    except Exception as e:
        logger.error(f"Failed to create indexes: {e}")
        raise