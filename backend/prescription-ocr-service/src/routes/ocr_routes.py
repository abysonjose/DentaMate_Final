from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from typing import Optional
import asyncio
from src.models.ocr_models import (
    ProcessPrescriptionRequest, ProcessPrescriptionResponse,
    OCRStatusResponse, OCRResultResponse, ApprovalRequest, ApprovalResponse,
    OCRStatus, ApprovalStatus
)
from src.middleware.auth import JWTPayload, verify_jwt_token, require_doctor_role, require_pharmacist_role
from src.middleware.tenant import TenantContext, get_tenant_context
from src.services.ocr_service import OCRService
from src.services.file_service import FileService
from src.services.audit_service import AuditService
from src.services.prescription_service import PrescriptionService
from src.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()

# Service instances
ocr_service = OCRService()
file_service = FileService()
audit_service = AuditService()
prescription_service = PrescriptionService()

@router.post("/process", response_model=ProcessPrescriptionResponse)
async def process_prescription(
    request: Request,
    file: UploadFile = File(...),
    appointment_id: Optional[str] = Form(None),
    patient_id: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    jwt_payload: JWTPayload = Depends(require_doctor_role),
    tenant_context: TenantContext = Depends(get_tenant_context)
):
    """Process prescription image/PDF for OCR extraction"""
    try:
        # Save uploaded file
        file_path, file_hash, file_size = await file_service.save_uploaded_file(
            file, tenant_context.tenant_id, f"temp_{jwt_payload.user_id}"
        )
        
        # Create OCR request
        ocr_request = await prescription_service.create_ocr_request(
            tenant_id=tenant_context.tenant_id,
            branch_id=tenant_context.branch_id,
            appointment_id=appointment_id,
            patient_id=patient_id,
            doctor_id=jwt_payload.user_id,
            file_path=file_path,
            file_name=file.filename,
            file_size=file_size,
            mime_type=file_service.get_mime_type(file.filename),
            created_by=jwt_payload.user_id
        )
        
        # Log audit
        await audit_service.log_ocr_request(
            request_id=ocr_request.request_id,
            tenant_id=tenant_context.tenant_id,
            branch_id=tenant_context.branch_id,
            user_id=jwt_payload.user_id,
            file_info={
                "file_name": file.filename,
                "file_size": file_size,
                "mime_type": file_service.get_mime_type(file.filename)
            },
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent")
        )
        
        # Start OCR processing asynchronously
        asyncio.create_task(
            _process_ocr_async(
                ocr_request.request_id,
                file_path,
                tenant_context.tenant_id,
                tenant_context.branch_id,
                jwt_payload.user_id
            )
        )
        
        return ProcessPrescriptionResponse(
            request_id=ocr_request.request_id,
            status=OCRStatus.PROCESSING,
            message="OCR processing started successfully"
        )
        
    except Exception as e:
        logger.error(f"Failed to process prescription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Processing failed: {str(e)}"
        )

@router.get("/status/{request_id}", response_model=OCRStatusResponse)
async def get_ocr_status(
    request_id: str,
    jwt_payload: JWTPayload = Depends(verify_jwt_token),
    tenant_context: TenantContext = Depends(get_tenant_context)
):
    """Get OCR processing status"""
    try:
        ocr_request = await prescription_service.get_ocr_request(
            request_id, tenant_context.tenant_id
        )
        
        if not ocr_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="OCR request not found"
            )
        
        # Calculate progress based on status
        progress_map = {
            OCRStatus.PENDING: 0,
            OCRStatus.PROCESSING: 50,
            OCRStatus.COMPLETED: 100,
            OCRStatus.FAILED: 0,
            OCRStatus.APPROVED: 100,
            OCRStatus.REJECTED: 100
        }
        
        return OCRStatusResponse(
            request_id=request_id,
            status=ocr_request.status,
            progress=progress_map.get(ocr_request.status, 0),
            message=f"Status: {ocr_request.status.value}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get OCR status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get status"
        )

@router.get("/result/{request_id}", response_model=OCRResultResponse)
async def get_ocr_result(
    request_id: str,
    jwt_payload: JWTPayload = Depends(verify_jwt_token),
    tenant_context: TenantContext = Depends(get_tenant_context)
):
    """Get OCR processing result"""
    try:
        ocr_request = await prescription_service.get_ocr_request(
            request_id, tenant_context.tenant_id
        )
        
        if not ocr_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="OCR request not found"
            )
        
        # Check if processing is complete
        if ocr_request.status == OCRStatus.PROCESSING:
            return OCRResultResponse(
                request_id=request_id,
                status=ocr_request.status,
                result=None,
                error=None
            )
        
        if ocr_request.status == OCRStatus.FAILED:
            return OCRResultResponse(
                request_id=request_id,
                status=ocr_request.status,
                result=None,
                error="OCR processing failed"
            )
        
        # Get OCR result
        ocr_result = await prescription_service.get_ocr_result(
            request_id, tenant_context.tenant_id
        )
        
        return OCRResultResponse(
            request_id=request_id,
            status=ocr_request.status,
            result=ocr_result,
            error=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get OCR result: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get result"
        )

@router.post("/{request_id}/approve", response_model=ApprovalResponse)
async def approve_prescription(
    request_id: str,
    approval_request: ApprovalRequest,
    request: Request,
    jwt_payload: JWTPayload = Depends(require_doctor_role),
    tenant_context: TenantContext = Depends(get_tenant_context)
):
    """Doctor approval of OCR result"""
    try:
        # Get OCR request and result
        ocr_request = await prescription_service.get_ocr_request(
            request_id, tenant_context.tenant_id
        )
        
        if not ocr_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="OCR request not found"
            )
        
        if ocr_request.status != OCRStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OCR processing not completed"
            )
        
        # Update OCR result with doctor's corrections
        approved_result = await prescription_service.approve_prescription(
            request_id=request_id,
            tenant_id=tenant_context.tenant_id,
            medicines=approval_request.medicines,
            doctor_notes=approval_request.doctor_notes,
            approved_by=jwt_payload.user_id
        )
        
        # Log audit
        await audit_service.log_doctor_approval(
            request_id=request_id,
            tenant_id=tenant_context.tenant_id,
            branch_id=tenant_context.branch_id,
            user_id=jwt_payload.user_id,
            approval_details={
                "medicines_count": len(approval_request.medicines),
                "doctor_notes": approval_request.doctor_notes,
                "original_confidence": approved_result.overall_confidence
            },
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent")
        )
        
        # Notify pharmacy service (async)
        asyncio.create_task(
            _notify_pharmacy_service(request_id, approved_result)
        )
        
        return ApprovalResponse(
            request_id=request_id,
            status=ApprovalStatus.APPROVED,
            message="Prescription approved successfully",
            approved_at=approved_result.approved_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to approve prescription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Approval failed"
        )

@router.post("/{request_id}/reject", response_model=ApprovalResponse)
async def reject_prescription(
    request_id: str,
    rejection_reason: str = Form(...),
    request: Request,
    jwt_payload: JWTPayload = Depends(require_doctor_role),
    tenant_context: TenantContext = Depends(get_tenant_context)
):
    """Doctor rejection of OCR result"""
    try:
        # Get OCR request
        ocr_request = await prescription_service.get_ocr_request(
            request_id, tenant_context.tenant_id
        )
        
        if not ocr_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="OCR request not found"
            )
        
        # Reject prescription
        rejected_result = await prescription_service.reject_prescription(
            request_id=request_id,
            tenant_id=tenant_context.tenant_id,
            rejection_reason=rejection_reason,
            rejected_by=jwt_payload.user_id
        )
        
        # Log audit
        await audit_service.log_doctor_rejection(
            request_id=request_id,
            tenant_id=tenant_context.tenant_id,
            branch_id=tenant_context.branch_id,
            user_id=jwt_payload.user_id,
            rejection_details={
                "reason": rejection_reason
            },
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent")
        )
        
        return ApprovalResponse(
            request_id=request_id,
            status=ApprovalStatus.REJECTED,
            message="Prescription rejected",
            approved_at=rejected_result.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to reject prescription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Rejection failed"
        )

# Async helper functions
async def _process_ocr_async(
    request_id: str,
    file_path: str,
    tenant_id: str,
    branch_id: str,
    user_id: str
):
    """Process OCR asynchronously"""
    try:
        # Update status to processing
        await prescription_service.update_ocr_status(
            request_id, tenant_id, OCRStatus.PROCESSING
        )
        
        # Log processing start
        await audit_service.log_ocr_processing_start(
            request_id, tenant_id, branch_id, user_id
        )
        
        # Process OCR
        ocr_result = await ocr_service.process_prescription(
            file_path, request_id, tenant_id, branch_id
        )
        
        # Save OCR result
        await prescription_service.save_ocr_result(ocr_result)
        
        # Update status to completed
        await prescription_service.update_ocr_status(
            request_id, tenant_id, OCRStatus.COMPLETED
        )
        
        # Log processing completion
        await audit_service.log_ocr_processing_complete(
            request_id, tenant_id, branch_id, user_id,
            {
                "medicines_found": len(ocr_result.medicines),
                "overall_confidence": ocr_result.overall_confidence,
                "processing_time": ocr_result.processing_time,
                "ocr_engine": ocr_result.ocr_engine
            }
        )
        
        logger.info(f"OCR processing completed for request {request_id}")
        
    except Exception as e:
        logger.error(f"OCR processing failed for request {request_id}: {e}")
        
        # Update status to failed
        await prescription_service.update_ocr_status(
            request_id, tenant_id, OCRStatus.FAILED
        )
        
        # Log processing failure
        await audit_service.log_ocr_processing_failed(
            request_id, tenant_id, branch_id, user_id,
            {"error": str(e)}
        )

async def _notify_pharmacy_service(request_id: str, ocr_result):
    """Notify pharmacy service of approved prescription"""
    try:
        # This would integrate with the pharmacy service
        # For now, just log the notification
        logger.info(f"Notifying pharmacy service of approved prescription {request_id}")
        
        # TODO: Implement actual pharmacy service notification
        # await pharmacy_client.notify_prescription_approved(request_id, ocr_result)
        
    except Exception as e:
        logger.error(f"Failed to notify pharmacy service: {e}")