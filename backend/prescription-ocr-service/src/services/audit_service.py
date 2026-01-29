from typing import Dict, Any, Optional
from datetime import datetime
from src.config.database import get_database
from src.models.ocr_models import OCRAuditLog
from src.utils.logger import get_logger

logger = get_logger(__name__)

class AuditService:
    def __init__(self):
        self.collection_name = "audit_logs"
    
    async def log_action(
        self,
        request_id: str,
        tenant_id: str,
        branch_id: str,
        user_id: str,
        action: str,
        details: Dict[str, Any] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log an audit action"""
        try:
            db = await get_database()
            collection = db[self.collection_name]
            
            audit_log = OCRAuditLog(
                request_id=request_id,
                tenant_id=tenant_id,
                branch_id=branch_id,
                user_id=user_id,
                action=action,
                details=details or {},
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            await collection.insert_one(audit_log.model_dump())
            logger.info(f"Audit log created: {action} by {user_id} for request {request_id}")
            
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")
            # Don't raise exception to avoid breaking main flow
    
    async def log_ocr_request(
        self,
        request_id: str,
        tenant_id: str,
        branch_id: str,
        user_id: str,
        file_info: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log OCR request creation"""
        await self.log_action(
            request_id=request_id,
            tenant_id=tenant_id,
            branch_id=branch_id,
            user_id=user_id,
            action="OCR_REQUEST_CREATED",
            details={
                "file_name": file_info.get("file_name"),
                "file_size": file_info.get("file_size"),
                "mime_type": file_info.get("mime_type")
            },
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    async def log_ocr_processing_start(
        self,
        request_id: str,
        tenant_id: str,
        branch_id: str,
        user_id: str
    ):
        """Log OCR processing start"""
        await self.log_action(
            request_id=request_id,
            tenant_id=tenant_id,
            branch_id=branch_id,
            user_id=user_id,
            action="OCR_PROCESSING_STARTED"
        )
    
    async def log_ocr_processing_complete(
        self,
        request_id: str,
        tenant_id: str,
        branch_id: str,
        user_id: str,
        processing_details: Dict[str, Any]
    ):
        """Log OCR processing completion"""
        await self.log_action(
            request_id=request_id,
            tenant_id=tenant_id,
            branch_id=branch_id,
            user_id=user_id,
            action="OCR_PROCESSING_COMPLETED",
            details=processing_details
        )
    
    async def log_ocr_processing_failed(
        self,
        request_id: str,
        tenant_id: str,
        branch_id: str,
        user_id: str,
        error_details: Dict[str, Any]
    ):
        """Log OCR processing failure"""
        await self.log_action(
            request_id=request_id,
            tenant_id=tenant_id,
            branch_id=branch_id,
            user_id=user_id,
            action="OCR_PROCESSING_FAILED",
            details=error_details
        )
    
    async def log_doctor_approval(
        self,
        request_id: str,
        tenant_id: str,
        branch_id: str,
        user_id: str,
        approval_details: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log doctor approval"""
        await self.log_action(
            request_id=request_id,
            tenant_id=tenant_id,
            branch_id=branch_id,
            user_id=user_id,
            action="PRESCRIPTION_APPROVED",
            details=approval_details,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    async def log_doctor_rejection(
        self,
        request_id: str,
        tenant_id: str,
        branch_id: str,
        user_id: str,
        rejection_details: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log doctor rejection"""
        await self.log_action(
            request_id=request_id,
            tenant_id=tenant_id,
            branch_id=branch_id,
            user_id=user_id,
            action="PRESCRIPTION_REJECTED",
            details=rejection_details,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    async def log_pharmacy_access(
        self,
        request_id: str,
        tenant_id: str,
        branch_id: str,
        user_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log pharmacy access to prescription"""
        await self.log_action(
            request_id=request_id,
            tenant_id=tenant_id,
            branch_id=branch_id,
            user_id=user_id,
            action="PHARMACY_ACCESS",
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    async def get_audit_logs(
        self,
        tenant_id: str,
        request_id: Optional[str] = None,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 100,
        skip: int = 0
    ) -> list:
        """Get audit logs with filters"""
        try:
            db = await get_database()
            collection = db[self.collection_name]
            
            # Build filter
            filter_dict = {"tenant_id": tenant_id}
            
            if request_id:
                filter_dict["request_id"] = request_id
            if user_id:
                filter_dict["user_id"] = user_id
            if action:
                filter_dict["action"] = action
            
            # Query with pagination
            cursor = collection.find(filter_dict).sort("timestamp", -1).skip(skip).limit(limit)
            logs = await cursor.to_list(length=limit)
            
            return logs
            
        except Exception as e:
            logger.error(f"Failed to get audit logs: {e}")
            return []
    
    async def get_request_audit_trail(self, request_id: str, tenant_id: str) -> list:
        """Get complete audit trail for a specific request"""
        return await self.get_audit_logs(
            tenant_id=tenant_id,
            request_id=request_id,
            limit=1000
        )