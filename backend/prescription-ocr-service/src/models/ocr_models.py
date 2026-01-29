from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

class OCRStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class ApprovalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class MedicineExtraction(BaseModel):
    name: str = Field(..., description="Medicine name")
    dosage: Optional[str] = Field(None, description="Dosage strength (e.g., 500mg)")
    frequency: Optional[str] = Field(None, description="Frequency (e.g., Twice a day)")
    duration: Optional[str] = Field(None, description="Duration (e.g., 5 days)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score")
    raw_text: Optional[str] = Field(None, description="Original extracted text")
    normalized: bool = Field(False, description="Whether the data has been normalized")

class OCRRequest(BaseModel):
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str = Field(..., description="Tenant ID")
    branch_id: str = Field(..., description="Branch ID")
    appointment_id: Optional[str] = Field(None, description="Appointment ID")
    patient_id: Optional[str] = Field(None, description="Patient ID")
    doctor_id: str = Field(..., description="Doctor ID")
    file_path: str = Field(..., description="Path to uploaded file")
    file_name: str = Field(..., description="Original file name")
    file_size: int = Field(..., description="File size in bytes")
    mime_type: str = Field(..., description="File MIME type")
    status: OCRStatus = Field(default=OCRStatus.PENDING)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str = Field(..., description="User ID who created the request")

class OCRResult(BaseModel):
    request_id: str = Field(..., description="OCR request ID")
    tenant_id: str = Field(..., description="Tenant ID")
    branch_id: str = Field(..., description="Branch ID")
    raw_text: str = Field(..., description="Raw extracted text")
    medicines: List[MedicineExtraction] = Field(default_factory=list)
    overall_confidence: float = Field(..., ge=0.0, le=1.0)
    processing_time: float = Field(..., description="Processing time in seconds")
    ocr_engine: str = Field(..., description="OCR engine used")
    approval_status: ApprovalStatus = Field(default=ApprovalStatus.PENDING)
    doctor_notes: Optional[str] = Field(None, description="Doctor's notes/corrections")
    approved_by: Optional[str] = Field(None, description="User ID who approved")
    approved_at: Optional[datetime] = Field(None, description="Approval timestamp")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class OCRAuditLog(BaseModel):
    log_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request_id: str = Field(..., description="OCR request ID")
    tenant_id: str = Field(..., description="Tenant ID")
    branch_id: str = Field(..., description="Branch ID")
    user_id: str = Field(..., description="User ID")
    action: str = Field(..., description="Action performed")
    details: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    ip_address: Optional[str] = Field(None, description="User IP address")
    user_agent: Optional[str] = Field(None, description="User agent")

# Request/Response Models
class ProcessPrescriptionRequest(BaseModel):
    appointment_id: Optional[str] = None
    patient_id: Optional[str] = None
    notes: Optional[str] = None

class ProcessPrescriptionResponse(BaseModel):
    request_id: str
    status: OCRStatus
    message: str

class OCRStatusResponse(BaseModel):
    request_id: str
    status: OCRStatus
    progress: Optional[int] = None
    message: Optional[str] = None

class OCRResultResponse(BaseModel):
    request_id: str
    status: OCRStatus
    result: Optional[OCRResult] = None
    error: Optional[str] = None

class ApprovalRequest(BaseModel):
    medicines: List[MedicineExtraction]
    doctor_notes: Optional[str] = None

class ApprovalResponse(BaseModel):
    request_id: str
    status: ApprovalStatus
    message: str
    approved_at: datetime