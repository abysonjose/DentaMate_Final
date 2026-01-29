"""
Core inference service for AI diagnosis
"""

import asyncio
import logging
import uuid
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from fastapi import UploadFile
import aiofiles
import os

from ..config.database import get_database
from ..config.redis_client import get_redis, CacheKeys
from ..models.inference import (
    InferenceRequest, InferenceResult, InferenceStatus, 
    InferenceError, ImageType, AuditLog
)
from ..services.model_service import ModelService
from ..services.xai_service import XAIService
from ..services.image_service import ImageService
from ..utils.exceptions import AIServiceException, ValidationError
from ..config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class InferenceService:
    """Service for managing AI inference requests and results"""
    
    def __init__(self):
        self.db = get_database()
        self.redis = get_redis()
        self.model_service = ModelService()
        self.xai_service = XAIService()
        self.image_service = ImageService()
        
    async def create_inference_request(
        self,
        diagnostic_order_id: str,
        patient_id: str,
        appointment_id: str,
        branch_id: str,
        tenant_id: str,
        image_file: UploadFile,
        requesting_service: str
    ) -> str:
        """
        Create a new inference request
        """
        try:
            # Generate unique request ID
            request_id = str(uuid.uuid4())
            
            # Validate image file
            await self.image_service.validate_image_file(image_file)
            
            # Determine image type
            image_type = await self.image_service.detect_image_type(image_file)
            
            # Store image securely
            image_url = await self.image_service.store_image(
                image_file, 
                tenant_id, 
                request_id
            )
            
            # Get image metadata
            image_metadata = await self.image_service.extract_metadata(image_file)
            
            # Create inference request
            request = InferenceRequest(
                request_id=request_id,
                tenant_id=tenant_id,
                branch_id=branch_id,
                patient_id=patient_id,
                diagnostic_order_id=diagnostic_order_id,
                appointment_id=appointment_id,
                image_url=image_url,
                image_type=image_type,
                image_metadata=image_metadata,
                requesting_service=requesting_service,
                status=InferenceStatus.RECEIVED
            )
            
            # Store in database
            await self.db.inference_requests.insert_one(request.dict())
            
            # Cache status in Redis
            await self.redis.setex(
                CacheKeys.inference_status(request_id),
                3600,  # 1 hour TTL
                InferenceStatus.RECEIVED.value
            )
            
            # Add to processing queue
            await self.redis.lpush(
                CacheKeys.processing_queue(),
                request_id
            )
            
            # Log audit entry
            await self._log_audit(
                request_id=request_id,
                tenant_id=tenant_id,
                action="inference_request_created",
                request_metadata={
                    "diagnostic_order_id": diagnostic_order_id,
                    "patient_id": patient_id,
                    "image_type": image_type.value,
                    "requesting_service": requesting_service
                }
            )
            
            logger.info(f"Inference request created: {request_id}")
            return request_id
            
        except Exception as e:
            logger.error(f"Error creating inference request: {e}")
            raise AIServiceException(f"Failed to create inference request: {str(e)}")
    
    async def process_inference(self, request_id: str):
        """
        Process inference request asynchronously
        """
        start_time = time.time()
        
        try:
            # Update status to processing
            await self._update_status(request_id, InferenceStatus.PROCESSING)
            
            # Get request details
            request = await self.db.inference_requests.find_one(
                {"request_id": request_id}
            )
            
            if not request:
                raise AIServiceException(f"Request not found: {request_id}")
            
            # Load image
            image_data = await self.image_service.load_image(request['image_url'])
            
            # Preprocess image based on type
            processed_image = await self.image_service.preprocess_image(
                image_data, 
                request['image_type']
            )
            
            # Get appropriate AI model
            model = await self.model_service.get_model_for_image_type(
                request['image_type']
            )
            
            if not model:
                raise AIServiceException(f"No model available for image type: {request['image_type']}")
            
            # Perform AI inference
            predictions = await self.model_service.predict(model, processed_image)
            
            # Process predictions into findings
            findings = await self._process_predictions(
                predictions, 
                request['image_type'],
                model
            )
            
            # Generate XAI artifacts
            xai_artifacts = await self.xai_service.generate_explanations(
                processed_image,
                predictions,
                model,
                request['image_type']
            )
            
            # Generate recommendations
            recommendations = await self._generate_recommendations(findings)
            
            # Calculate processing time
            processing_time = int((time.time() - start_time) * 1000)
            
            # Create result
            result = InferenceResult(
                request_id=request_id,
                tenant_id=request['tenant_id'],
                patient_id=request['patient_id'],
                findings=findings,
                overall_confidence=self._calculate_overall_confidence(findings),
                model_info=await self.model_service.get_model_info(model),
                processing_time_ms=processing_time,
                xai_artifacts=xai_artifacts,
                recommendations=recommendations,
                expires_at=datetime.utcnow() + timedelta(days=settings.RETENTION_DAYS)
            )
            
            # Store result
            await self.db.inference_results.insert_one(result.dict())
            
            # Cache result
            await self.redis.setex(
                CacheKeys.inference_result(request_id),
                86400,  # 24 hours TTL
                result.json()
            )
            
            # Update status to completed
            await self._update_status(request_id, InferenceStatus.COMPLETED)
            
            # Log completion
            await self._log_audit(
                request_id=request_id,
                tenant_id=request['tenant_id'],
                action="inference_completed",
                result_summary={
                    "findings_count": len(findings),
                    "overall_confidence": result.overall_confidence,
                    "processing_time_ms": processing_time
                }
            )
            
            # Notify completion (webhook or message queue)
            await self._notify_completion(request_id, result)
            
            logger.info(f"Inference completed: {request_id} in {processing_time}ms")
            
        except Exception as e:
            logger.error(f"Inference processing error for {request_id}: {e}")
            
            # Update status to failed
            await self._update_status(request_id, InferenceStatus.FAILED)
            
            # Store error
            error = InferenceError(
                request_id=request_id,
                error_code="PROCESSING_FAILED",
                error_message=str(e),
                error_details={"processing_time_ms": int((time.time() - start_time) * 1000)}
            )
            
            await self.db.inference_errors.insert_one(error.dict())
            
            # Log error
            await self._log_audit(
                request_id=request_id,
                tenant_id=request.get('tenant_id', 'unknown'),
                action="inference_failed",
                error_details={"error": str(e)}
            )
    
    async def get_inference_status(self, request_id: str, tenant_id: str) -> Optional[Dict]:
        """Get inference request status"""
        try:
            # Try Redis cache first
            cached_status = await self.redis.get(CacheKeys.inference_status(request_id))
            
            if cached_status:
                return {
                    "request_id": request_id,
                    "status": cached_status,
                    "source": "cache"
                }
            
            # Fallback to database
            request = await self.db.inference_requests.find_one({
                "request_id": request_id,
                "tenant_id": tenant_id
            })
            
            if not request:
                return None
            
            return {
                "request_id": request_id,
                "status": request['status'],
                "created_at": request['created_at'],
                "updated_at": request['updated_at'],
                "source": "database"
            }
            
        except Exception as e:
            logger.error(f"Error getting inference status: {e}")
            raise AIServiceException(f"Failed to get status: {str(e)}")
    
    async def get_inference_result(self, request_id: str, tenant_id: str) -> Optional[Dict]:
        """Get inference result"""
        try:
            # Try Redis cache first
            cached_result = await self.redis.get(CacheKeys.inference_result(request_id))
            
            if cached_result:
                return eval(cached_result)  # Convert JSON string back to dict
            
            # Fallback to database
            result = await self.db.inference_results.find_one({
                "request_id": request_id,
                "tenant_id": tenant_id
            })
            
            if not result:
                return None
            
            # Remove MongoDB ObjectId for JSON serialization
            if '_id' in result:
                del result['_id']
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting inference result: {e}")
            raise AIServiceException(f"Failed to get result: {str(e)}")
    
    async def _update_status(self, request_id: str, status: InferenceStatus):
        """Update inference request status"""
        try:
            # Update database
            await self.db.inference_requests.update_one(
                {"request_id": request_id},
                {
                    "$set": {
                        "status": status.value,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Update cache
            await self.redis.setex(
                CacheKeys.inference_status(request_id),
                3600,
                status.value
            )
            
        except Exception as e:
            logger.error(f"Error updating status: {e}")
    
    async def _process_predictions(self, predictions, image_type: ImageType, model) -> List[Dict]:
        """Process raw model predictions into structured findings"""
        # This would be implemented based on specific model outputs
        # For now, return mock findings
        return [
            {
                "label": "Normal dental structures",
                "confidence": 0.85,
                "region": "Overall",
                "severity": "none"
            }
        ]
    
    def _calculate_overall_confidence(self, findings: List[Dict]) -> float:
        """Calculate overall confidence from findings"""
        if not findings:
            return 0.0
        
        confidences = [f.get('confidence', 0.0) for f in findings]
        return sum(confidences) / len(confidences)
    
    async def _generate_recommendations(self, findings: List[Dict]) -> List[str]:
        """Generate clinical recommendations based on findings"""
        recommendations = []
        
        for finding in findings:
            if finding.get('severity') == 'severe':
                recommendations.append(f"Urgent attention required for {finding.get('label')}")
            elif finding.get('severity') == 'moderate':
                recommendations.append(f"Clinical evaluation recommended for {finding.get('label')}")
        
        if not recommendations:
            recommendations.append("Regular dental maintenance recommended")
        
        return recommendations
    
    async def _notify_completion(self, request_id: str, result: InferenceResult):
        """Notify external services of completion"""
        try:
            # This would integrate with notification service
            # For now, just log
            logger.info(f"Inference completed notification: {request_id}")
            
        except Exception as e:
            logger.error(f"Error sending completion notification: {e}")
    
    async def _log_audit(self, request_id: str, tenant_id: str, action: str, **kwargs):
        """Log audit entry"""
        try:
            if not settings.AUDIT_ENABLED:
                return
            
            audit_log = AuditLog(
                request_id=request_id,
                tenant_id=tenant_id,
                action=action,
                service=settings.SERVICE_NAME,
                **kwargs
            )
            
            await self.db.ai_audit_logs.insert_one(audit_log.dict())
            
        except Exception as e:
            logger.error(f"Error logging audit: {e}")