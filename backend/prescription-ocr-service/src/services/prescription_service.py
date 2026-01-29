from typing import Optional, List
from datetime import datetime
from src.config.database import get_database
from src.models.ocr_models import (
    OCRRequest, OCRResult, OCRStatus, ApprovalStatus, MedicineExtraction
)
from src.utils.logger import get_logger
from src.utils.exceptions import DatabaseError

logger = get_logger(__name__)

class PrescriptionService:
    def __init__(self):
        self.ocr_requests_collection = "ocr_requests"
        self.ocr_results_collection = "ocr_results"
    
    async def create_ocr_request(
        self,
        tenant_id: str,
        branch_id: str,
        doctor_id: str,
        file_path: str,
        file_name: str,
        file_size: int,
        mime_type: str,
        created_by: str,
        appointment_id: Optional[str] = None,
        patient_id: Optional[str] = None
    ) -> OCRRequest:
        """Create a new OCR request"""
        try:
            db = await get_database()
            collection = db[self.ocr_requests_collection]
            
            ocr_request = OCRRequest(
                tenant_id=tenant_id,
                branch_id=branch_id,
                appointment_id=appointment_id,
                patient_id=patient_id,
                doctor_id=doctor_id,
                file_path=file_path,
                file_name=file_name,
                file_size=file_size,
                mime_type=mime_type,
                created_by=created_by
            )
            
            await collection.insert_one(ocr_request.model_dump())
            logger.info(f"OCR request created: {ocr_request.request_id}")
            
            return ocr_request
            
        except Exception as e:
            logger.error(f"Failed to create OCR request: {e}")
            raise DatabaseError(f"Failed to create OCR request: {str(e)}")
    
    async def get_ocr_request(self, request_id: str, tenant_id: str) -> Optional[OCRRequest]:
        """Get OCR request by ID"""
        try:
            db = await get_database()
            collection = db[self.ocr_requests_collection]
            
            doc = await collection.find_one({
                "request_id": request_id,
                "tenant_id": tenant_id
            })
            
            if doc:
                return OCRRequest(**doc)
            return None
            
        except Exception as e:
            logger.error(f"Failed to get OCR request: {e}")
            raise DatabaseError(f"Failed to get OCR request: {str(e)}")
    
    async def update_ocr_status(
        self, 
        request_id: str, 
        tenant_id: str, 
        status: OCRStatus
    ) -> bool:
        """Update OCR request status"""
        try:
            db = await get_database()
            collection = db[self.ocr_requests_collection]
            
            result = await collection.update_one(
                {"request_id": request_id, "tenant_id": tenant_id},
                {
                    "$set": {
                        "status": status.value,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Failed to update OCR status: {e}")
            raise DatabaseError(f"Failed to update OCR status: {str(e)}")
    
    async def save_ocr_result(self, ocr_result: OCRResult) -> bool:
        """Save OCR processing result"""
        try:
            db = await get_database()
            collection = db[self.ocr_results_collection]
            
            await collection.insert_one(ocr_result.model_dump())
            logger.info(f"OCR result saved: {ocr_result.request_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to save OCR result: {e}")
            raise DatabaseError(f"Failed to save OCR result: {str(e)}")
    
    async def get_ocr_result(self, request_id: str, tenant_id: str) -> Optional[OCRResult]:
        """Get OCR result by request ID"""
        try:
            db = await get_database()
            collection = db[self.ocr_results_collection]
            
            doc = await collection.find_one({
                "request_id": request_id,
                "tenant_id": tenant_id
            })
            
            if doc:
                return OCRResult(**doc)
            return None
            
        except Exception as e:
            logger.error(f"Failed to get OCR result: {e}")
            raise DatabaseError(f"Failed to get OCR result: {str(e)}")
    
    async def approve_prescription(
        self,
        request_id: str,
        tenant_id: str,
        medicines: List[MedicineExtraction],
        approved_by: str,
        doctor_notes: Optional[str] = None
    ) -> OCRResult:
        """Approve prescription with doctor's corrections"""
        try:
            db = await get_database()
            
            # Update OCR request status
            requests_collection = db[self.ocr_requests_collection]
            await requests_collection.update_one(
                {"request_id": request_id, "tenant_id": tenant_id},
                {
                    "$set": {
                        "status": OCRStatus.APPROVED.value,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Update OCR result with approval
            results_collection = db[self.ocr_results_collection]
            now = datetime.utcnow()
            
            await results_collection.update_one(
                {"request_id": request_id, "tenant_id": tenant_id},
                {
                    "$set": {
                        "medicines": [med.model_dump() for med in medicines],
                        "approval_status": ApprovalStatus.APPROVED.value,
                        "doctor_notes": doctor_notes,
                        "approved_by": approved_by,
                        "approved_at": now,
                        "updated_at": now
                    }
                }
            )
            
            # Return updated result
            updated_result = await self.get_ocr_result(request_id, tenant_id)
            logger.info(f"Prescription approved: {request_id}")
            
            return updated_result
            
        except Exception as e:
            logger.error(f"Failed to approve prescription: {e}")
            raise DatabaseError(f"Failed to approve prescription: {str(e)}")
    
    async def reject_prescription(
        self,
        request_id: str,
        tenant_id: str,
        rejection_reason: str,
        rejected_by: str
    ) -> OCRResult:
        """Reject prescription"""
        try:
            db = await get_database()
            
            # Update OCR request status
            requests_collection = db[self.ocr_requests_collection]
            await requests_collection.update_one(
                {"request_id": request_id, "tenant_id": tenant_id},
                {
                    "$set": {
                        "status": OCRStatus.REJECTED.value,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Update OCR result with rejection
            results_collection = db[self.ocr_results_collection]
            now = datetime.utcnow()
            
            await results_collection.update_one(
                {"request_id": request_id, "tenant_id": tenant_id},
                {
                    "$set": {
                        "approval_status": ApprovalStatus.REJECTED.value,
                        "doctor_notes": rejection_reason,
                        "approved_by": rejected_by,
                        "approved_at": now,
                        "updated_at": now
                    }
                }
            )
            
            # Return updated result
            updated_result = await self.get_ocr_result(request_id, tenant_id)
            logger.info(f"Prescription rejected: {request_id}")
            
            return updated_result
            
        except Exception as e:
            logger.error(f"Failed to reject prescription: {e}")
            raise DatabaseError(f"Failed to reject prescription: {str(e)}")
    
    async def get_doctor_prescriptions(
        self,
        doctor_id: str,
        tenant_id: str,
        branch_id: Optional[str] = None,
        status: Optional[OCRStatus] = None,
        limit: int = 50,
        skip: int = 0
    ) -> List[OCRRequest]:
        """Get prescriptions for a doctor"""
        try:
            db = await get_database()
            collection = db[self.ocr_requests_collection]
            
            # Build filter
            filter_dict = {
                "doctor_id": doctor_id,
                "tenant_id": tenant_id
            }
            
            if branch_id:
                filter_dict["branch_id"] = branch_id
            if status:
                filter_dict["status"] = status.value
            
            # Query with pagination
            cursor = collection.find(filter_dict).sort("created_at", -1).skip(skip).limit(limit)
            docs = await cursor.to_list(length=limit)
            
            return [OCRRequest(**doc) for doc in docs]
            
        except Exception as e:
            logger.error(f"Failed to get doctor prescriptions: {e}")
            raise DatabaseError(f"Failed to get doctor prescriptions: {str(e)}")
    
    async def get_pending_approvals(
        self,
        tenant_id: str,
        branch_id: Optional[str] = None,
        limit: int = 50,
        skip: int = 0
    ) -> List[OCRRequest]:
        """Get prescriptions pending doctor approval"""
        try:
            db = await get_database()
            collection = db[self.ocr_requests_collection]
            
            # Build filter
            filter_dict = {
                "tenant_id": tenant_id,
                "status": OCRStatus.COMPLETED.value
            }
            
            if branch_id:
                filter_dict["branch_id"] = branch_id
            
            # Query with pagination
            cursor = collection.find(filter_dict).sort("created_at", 1).skip(skip).limit(limit)
            docs = await cursor.to_list(length=limit)
            
            return [OCRRequest(**doc) for doc in docs]
            
        except Exception as e:
            logger.error(f"Failed to get pending approvals: {e}")
            raise DatabaseError(f"Failed to get pending approvals: {str(e)}")
    
    async def get_approved_prescriptions(
        self,
        tenant_id: str,
        branch_id: Optional[str] = None,
        limit: int = 50,
        skip: int = 0
    ) -> List[dict]:
        """Get approved prescriptions with results"""
        try:
            db = await get_database()
            requests_collection = db[self.ocr_requests_collection]
            results_collection = db[self.ocr_results_collection]
            
            # Build filter
            filter_dict = {
                "tenant_id": tenant_id,
                "status": OCRStatus.APPROVED.value
            }
            
            if branch_id:
                filter_dict["branch_id"] = branch_id
            
            # Get approved requests
            cursor = requests_collection.find(filter_dict).sort("updated_at", -1).skip(skip).limit(limit)
            requests = await cursor.to_list(length=limit)
            
            # Get corresponding results
            prescriptions = []
            for request in requests:
                result = await results_collection.find_one({
                    "request_id": request["request_id"],
                    "tenant_id": tenant_id
                })
                
                prescriptions.append({
                    "request": OCRRequest(**request),
                    "result": OCRResult(**result) if result else None
                })
            
            return prescriptions
            
        except Exception as e:
            logger.error(f"Failed to get approved prescriptions: {e}")
            raise DatabaseError(f"Failed to get approved prescriptions: {str(e)}")