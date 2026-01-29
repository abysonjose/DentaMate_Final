from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from src.config.settings import settings
from src.utils.logger import get_logger

logger = get_logger(__name__)
security = HTTPBearer()

class JWTPayload:
    def __init__(self, payload: Dict[str, Any]):
        self.user_id: str = payload.get("user_id")
        self.tenant_id: str = payload.get("tenant_id")
        self.branch_id: str = payload.get("branch_id")
        self.role: str = payload.get("role")
        self.permissions: list = payload.get("permissions", [])
        self.service: Optional[str] = payload.get("service")
        self.exp: int = payload.get("exp")
        self.iat: int = payload.get("iat")

async def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> JWTPayload:
    """Verify JWT token and extract payload"""
    try:
        token = credentials.credentials
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        # Check token expiration
        if datetime.utcnow().timestamp() > payload.get("exp", 0):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        
        jwt_payload = JWTPayload(payload)
        
        # Validate required fields
        if not jwt_payload.user_id or not jwt_payload.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        logger.info(f"Token verified for user: {jwt_payload.user_id}, tenant: {jwt_payload.tenant_id}")
        return jwt_payload
        
    except JWTError as e:
        logger.error(f"JWT verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

def check_role_permission(required_roles: list = None, required_permissions: list = None):
    """Decorator to check user roles and permissions"""
    def decorator(jwt_payload: JWTPayload = Depends(verify_jwt_token)):
        # Check roles
        if required_roles and jwt_payload.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient role. Required: {required_roles}, Got: {jwt_payload.role}"
            )
        
        # Check permissions
        if required_permissions:
            user_permissions = set(jwt_payload.permissions)
            required_perms = set(required_permissions)
            if not required_perms.issubset(user_permissions):
                missing_perms = required_perms - user_permissions
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing permissions: {list(missing_perms)}"
                )
        
        return jwt_payload
    
    return decorator

# Role-specific dependencies
def require_doctor_role(jwt_payload: JWTPayload = Depends(verify_jwt_token)) -> JWTPayload:
    """Require doctor role"""
    if jwt_payload.role not in ["doctor", "head_doctor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctor role required"
        )
    return jwt_payload

def require_pharmacist_role(jwt_payload: JWTPayload = Depends(verify_jwt_token)) -> JWTPayload:
    """Require pharmacist role"""
    if jwt_payload.role not in ["pharmacist", "head_pharmacist"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pharmacist role required"
        )
    return jwt_payload

def require_nurse_role(jwt_payload: JWTPayload = Depends(verify_jwt_token)) -> JWTPayload:
    """Require nurse role"""
    if jwt_payload.role not in ["nurse", "head_nurse"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nurse role required"
        )
    return jwt_payload