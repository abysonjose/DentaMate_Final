"""
Logging configuration and utilities
"""

import logging
import logging.handlers
import os
from datetime import datetime
from typing import Optional

from ..config.settings import get_settings

settings = get_settings()


def setup_logger(name: str, level: Optional[str] = None) -> logging.Logger:
    """
    Set up logger with file and console handlers
    """
    logger = logging.getLogger(name)
    
    # Set log level
    log_level = level or settings.LOG_LEVEL
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    
    # Avoid duplicate handlers
    if logger.handlers:
        return logger
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
    )
    
    simple_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s'
    )
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(simple_formatter)
    logger.addHandler(console_handler)
    
    # File handler
    try:
        # Ensure log directory exists
        log_dir = os.path.dirname(settings.LOG_FILE)
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)
        
        # Rotating file handler
        file_handler = logging.handlers.RotatingFileHandler(
            settings.LOG_FILE,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(detailed_formatter)
        logger.addHandler(file_handler)
        
    except Exception as e:
        logger.error(f"Failed to set up file logging: {e}")
    
    return logger


def log_inference_request(logger: logging.Logger, request_data: dict):
    """Log inference request details"""
    logger.info(
        f"Inference request - ID: {request_data.get('request_id')}, "
        f"Tenant: {request_data.get('tenant_id')}, "
        f"Patient: {request_data.get('patient_id')}, "
        f"Type: {request_data.get('image_type')}"
    )


def log_inference_result(logger: logging.Logger, request_id: str, result_data: dict):
    """Log inference result summary"""
    logger.info(
        f"Inference completed - ID: {request_id}, "
        f"Findings: {len(result_data.get('findings', []))}, "
        f"Confidence: {result_data.get('overall_confidence', 0):.3f}, "
        f"Processing time: {result_data.get('processing_time_ms', 0)}ms"
    )


def log_model_operation(logger: logging.Logger, operation: str, model_id: str, success: bool):
    """Log model management operations"""
    status = "SUCCESS" if success else "FAILED"
    logger.info(f"Model {operation} - {model_id}: {status}")


def log_security_event(logger: logging.Logger, event_type: str, details: dict):
    """Log security-related events"""
    logger.warning(
        f"Security event - Type: {event_type}, "
        f"Details: {details}"
    )


def log_performance_metrics(logger: logging.Logger, metrics: dict):
    """Log performance metrics"""
    logger.info(
        f"Performance metrics - "
        f"Processing time: {metrics.get('processing_time_ms', 0)}ms, "
        f"Memory usage: {metrics.get('memory_mb', 0)}MB, "
        f"GPU usage: {metrics.get('gpu_usage_percent', 0)}%"
    )


class StructuredLogger:
    """Structured logger for better log analysis"""
    
    def __init__(self, name: str):
        self.logger = setup_logger(name)
    
    def log_event(self, event_type: str, **kwargs):
        """Log structured event"""
        timestamp = datetime.utcnow().isoformat()
        
        log_data = {
            'timestamp': timestamp,
            'event_type': event_type,
            'service': settings.SERVICE_NAME,
            **kwargs
        }
        
        # Convert to string for logging
        log_message = ' | '.join([f"{k}={v}" for k, v in log_data.items()])
        
        if event_type.startswith('ERROR'):
            self.logger.error(log_message)
        elif event_type.startswith('WARNING'):
            self.logger.warning(log_message)
        else:
            self.logger.info(log_message)
    
    def log_inference_start(self, request_id: str, tenant_id: str, image_type: str):
        """Log inference start"""
        self.log_event(
            'INFERENCE_START',
            request_id=request_id,
            tenant_id=tenant_id,
            image_type=image_type
        )
    
    def log_inference_complete(self, request_id: str, processing_time_ms: int, findings_count: int):
        """Log inference completion"""
        self.log_event(
            'INFERENCE_COMPLETE',
            request_id=request_id,
            processing_time_ms=processing_time_ms,
            findings_count=findings_count
        )
    
    def log_inference_error(self, request_id: str, error_message: str):
        """Log inference error"""
        self.log_event(
            'ERROR_INFERENCE_FAILED',
            request_id=request_id,
            error_message=error_message
        )
    
    def log_model_load(self, model_id: str, success: bool, load_time_ms: int = 0):
        """Log model loading"""
        event_type = 'MODEL_LOAD_SUCCESS' if success else 'ERROR_MODEL_LOAD_FAILED'
        self.log_event(
            event_type,
            model_id=model_id,
            load_time_ms=load_time_ms
        )
    
    def log_auth_event(self, event_type: str, user_id: str, tenant_id: str, success: bool):
        """Log authentication events"""
        event_name = f"AUTH_{event_type}_{'SUCCESS' if success else 'FAILED'}"
        self.log_event(
            event_name,
            user_id=user_id,
            tenant_id=tenant_id
        )
    
    def log_performance(self, operation: str, duration_ms: int, **metrics):
        """Log performance metrics"""
        self.log_event(
            'PERFORMANCE_METRIC',
            operation=operation,
            duration_ms=duration_ms,
            **metrics
        )