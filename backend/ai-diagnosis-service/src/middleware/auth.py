"""
Authentication and authorization middleware
"""

import logging
from typing import Dict, Optional
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from datetime import datetime

from ..config.settings import get_settings
from ..utils.exceptions import AuthenticationError, AuthorizationError

logger = logging.getLogger(__name__)
settings = get_settings()
security = HTTPBearer()


async def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    """
    Verify JWT token and extract payload
    """
    try:
        token = credentials.credentials
        
        # Decode JWT token
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        # Check token expiration
        exp = payload.get('exp')
        if exp and datetime.utcnow().timestamp() > exp:
            raise AuthenticationError("Token expired")
        
        # Validate required fields
        required_fields = ['tenant_id', 'user_id', 'role']
        for field in required_fields:
            if field not in payload:
                raise AuthenticationError(f"Missing required field: {field}")
        
        return payload
        
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token expired")
    except jwt.InvalidTokenError as e:
        raise AuthenticationError(f"Invalid token: {str(e)}")
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise AuthenticationError("Token verification failed")


async def get_current_service(token_payload: Dict = Depends(verify_jwt_token)) -> Dict:
    """
    Extract current service information from token
    """
    try:
        # For service-to-service communication, extract service info
        service_name = token_payload.get('service_name')
        if not service_name:
            # If not service token, check if it's from an authorized service
            role = token_payload.get('role')
            if role not in ['doctor', 'lab_staff', 'central_admin', 'saas_admin']:
                raise AuthorizationError("Insufficient permissions for AI diagnosis service")
            
            service_name = f"user_service_{role}"
        
        return {
            'service_name': service_name,
            'user_id': token_payload.get('user_id'),
            'role': token_payload.get('role'),
            'tenant_id': token_payload.get('tenant_id'),
            'branch_id': token_payload.get('branch_id')
        }
        
    except Exception as e:
        logger.error(f"Service extraction error: {e}")
        raise AuthorizationError("Failed to extract service information")


def require_role(allowed_roles: list):
    """
    Decorator to require specific roles
    """
    def decorator(token_payload: Dict = Depends(verify_jwt_token)):
        user_role = token_payload.get('role')
        if user_role not in allowed_roles:
            raise AuthorizationError(f"Role '{user_role}' not authorized. Required: {allowed_roles}")
        return token_payload
    
    return decorator


def require_service(allowed_services: list):
    """
    Decorator to require specific services
    """
    def decorator(service_info: Dict = Depends(get_current_service)):
        service_name = service_info.get('service_name')
        if service_name not in allowed_services:
            raise AuthorizationError(f"Service '{service_name}' not authorized. Required: {allowed_services}")
        return service_info
    
    return decorator


class RolePermissions:
    """Role-based permissions for AI diagnosis service"""
    
    # Roles that can request AI analysis
    ANALYSIS_REQUESTERS = [
        'doctor',
        'lab_staff',
        'central_admin'
    ]
    
    # Roles that can view AI results
    RESULT_VIEWERS = [
        'doctor',
        'lab_staff',
        'central_admin',
        'branch_admin'
    ]
    
    # Roles that can manage models
    MODEL_MANAGERS = [
        'saas_admin',
        'central_admin'
    ]
    
    # Services that can make inference requests
    AUTHORIZED_SERVICES = [
        'lab-diagnostics-service',
        'prescription-ocr-service',
        'user_service_doctor',
        'user_service_lab_staff'
    ]


def check_analysis_permission(token_payload: Dict) -> bool:
    """Check if user can request AI analysis"""
    role = token_payload.get('role')
    return role in RolePermissions.ANALYSIS_REQUESTERS


def check_result_permission(token_payload: Dict) -> bool:
    """Check if user can view AI results"""
    role = token_payload.get('role')
    return role in RolePermissions.RESULT_VIEWERS


def check_model_permission(token_payload: Dict) -> bool:
    """Check if user can manage AI models"""
    role = token_payload.get('role')
    return role in RolePermissions.MODEL_MANAGERS


def check_service_permission(service_info: Dict) -> bool:
    """Check if service is authorized"""
    service_name = service_info.get('service_name')
    return service_name in RolePermissions.AUTHORIZED_SERVICES