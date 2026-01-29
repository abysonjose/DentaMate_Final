"""
Data models for AI inference requests and results
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field
from bson import ObjectId


class InferenceStatus(str, Enum):
    """Inference request status"""
    RECEIVED = "RECEIVED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class ImageType(str, Enum):
    """Supported image types"""
    XRAY = "xray"
    CBCT = "cbct"
    INTRAORAL = "intraoral"
    PANORAMIC = "panoramic"


class FindingSeverity(str, Enum):
    """Finding severity levels"""
    NONE = "none"
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"
    CRITICAL = "critical"


class Finding(BaseModel):
    """AI finding result"""
    label: str = Field(..., description="Finding label/name")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score")
    region: str = Field(..., description="Anatomical region")
    severity: FindingSeverity = Field(..., description="Severity level")
    tooth_number: Optional[str] = Field(None, description="Tooth number if applicable")
    coordinates: Optional[Dict[str, float]] = Field(None, description="Bounding box coordinates")


class XAIArtifact(BaseModel):
    """Explainable AI artifact"""
    type: str = Field(..., description="Artifact type (heatmap, bbox, etc.)")
    url: str = Field(..., description="Secure URL to artifact")
    description: str = Field(..., description="Human-readable description")
    confidence_threshold: float = Field(..., description="Confidence threshold used")


class ModelInfo(BaseModel):
    """AI model information"""
    model_id: str = Field(..., description="Model identifier")
    version: str = Field(..., description="Model version")
    accuracy: float = Field(..., description="Model accuracy")
    training_date: datetime = Field(..., description="Model training date")


class InferenceRequest(BaseModel):
    """Inference request model"""
    request_id: str = Field(..., description="Unique request identifier")
    tenant_id: str = Field(..., description="Tenant identifier")
    branch_id: str = Field(..., description="Branch identifier")
    patient_id: str = Field(..., description="Patient identifier")
    diagnostic_order_id: str = Field(..., description="Diagnostic order identifier")
    appointment_id: Optional[str] = Field(None, description="Appointment identifier")
    
    image_url: str = Field(..., description="Secure image URL")
    image_type: ImageType = Field(..., description="Type of medical image")
    image_metadata: Dict[str, Any] = Field(default_factory=dict, description="Image metadata")
    
    status: InferenceStatus = Field(default=InferenceStatus.RECEIVED, description="Request status")
    requesting_service: str = Field(..., description="Service that made the request")
    
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    
    priority: int = Field(default=5, ge=1, le=10, description="Processing priority (1=highest)")
    timeout_seconds: int = Field(default=300, description="Processing timeout")


class InferenceResult(BaseModel):
    """Inference result model"""
    request_id: str = Field(..., description="Request identifier")
    tenant_id: str = Field(..., description="Tenant identifier")
    patient_id: str = Field(..., description="Patient identifier")
    
    findings: List[Finding] = Field(default_factory=list, description="AI findings")
    overall_confidence: float = Field(..., ge=0.0, le=1.0, description="Overall confidence")
    
    model_info: ModelInfo = Field(..., description="Model information")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")
    
    xai_artifacts: List[XAIArtifact] = Field(default_factory=list, description="XAI artifacts")
    recommendations: List[str] = Field(default_factory=list, description="Clinical recommendations")
    
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    expires_at: Optional[datetime] = Field(None, description="Result expiration timestamp")


class InferenceError(BaseModel):
    """Inference error model"""
    request_id: str = Field(..., description="Request identifier")
    error_code: str = Field(..., description="Error code")
    error_message: str = Field(..., description="Error message")
    error_details: Optional[Dict[str, Any]] = Field(None, description="Error details")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")


class ModelMetadata(BaseModel):
    """AI model metadata"""
    model_id: str = Field(..., description="Model identifier")
    name: str = Field(..., description="Model name")
    version: str = Field(..., description="Model version")
    description: str = Field(..., description="Model description")
    
    model_type: str = Field(..., description="Model type (classification, detection, etc.)")
    input_shape: List[int] = Field(..., description="Expected input shape")
    output_classes: List[str] = Field(..., description="Output class labels")
    
    accuracy: float = Field(..., description="Model accuracy")
    precision: float = Field(..., description="Model precision")
    recall: float = Field(..., description="Model recall")
    f1_score: float = Field(..., description="Model F1 score")
    
    training_dataset: str = Field(..., description="Training dataset description")
    training_date: datetime = Field(..., description="Training completion date")
    
    is_active: bool = Field(default=False, description="Whether model is active")
    supported_image_types: List[ImageType] = Field(..., description="Supported image types")
    
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")


class AuditLog(BaseModel):
    """Audit log entry"""
    request_id: str = Field(..., description="Request identifier")
    tenant_id: str = Field(..., description="Tenant identifier")
    user_id: Optional[str] = Field(None, description="User identifier")
    
    action: str = Field(..., description="Action performed")
    service: str = Field(..., description="Service name")
    
    request_metadata: Dict[str, Any] = Field(default_factory=dict, description="Request metadata")
    result_summary: Optional[Dict[str, Any]] = Field(None, description="Result summary")
    
    processing_time_ms: Optional[int] = Field(None, description="Processing time")
    error_details: Optional[Dict[str, Any]] = Field(None, description="Error details if any")
    
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Log timestamp")
    ip_address: Optional[str] = Field(None, description="Client IP address")
    user_agent: Optional[str] = Field(None, description="Client user agent")


# MongoDB document models (for internal use)
class InferenceRequestDocument(InferenceRequest):
    """MongoDB document for inference requests"""
    _id: Optional[ObjectId] = Field(None, alias="_id")
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True


class InferenceResultDocument(InferenceResult):
    """MongoDB document for inference results"""
    _id: Optional[ObjectId] = Field(None, alias="_id")
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True