from fastapi import Depends, HTTPException, status
from typing import Dict, Any
from src.middleware.auth import JWTPayload, verify_jwt_token
from src.utils.logger import get_logger

logger = get_logger(__name__)

class TenantContext:
    def __init__(self, jwt_payload: JWTPayload):
        self.tenant_id = jwt_payload.tenant_id
        self.branch_id = jwt_payload.branch_id
        self.user_id = jwt_payload.user_id
        self.role = jwt_payload.role
        self.permissions = jwt_payload.permissions

async def get_tenant_context(jwt_payload: JWTPayload = Depends(verify_jwt_token)) -> TenantContext:
    """Extract tenant context from JWT payload"""
    try:
        context = TenantContext(jwt_payload)
        
        # Validate tenant context
        if not context.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant ID is required"
            )
        
        logger.debug(f"Tenant context: {context.tenant_id}, Branch: {context.branch_id}")
        return context
        
    except Exception as e:
        logger.error(f"Failed to extract tenant context: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tenant context"
        )

def get_tenant_filter(tenant_context: TenantContext) -> Dict[str, Any]:
    """Get MongoDB filter for tenant isolation"""
    filter_dict = {"tenant_id": tenant_context.tenant_id}
    
    # Add branch filter if branch_id is available
    if tenant_context.branch_id:
        filter_dict["branch_id"] = tenant_context.branch_id
    
    return filter_dict

def validate_tenant_access(resource_tenant_id: str, tenant_context: TenantContext) -> bool:
    """Validate if user has access to resource based on tenant"""
    if resource_tenant_id != tenant_context.tenant_id:
        logger.warning(
            f"Tenant access violation: User {tenant_context.user_id} "
            f"from tenant {tenant_context.tenant_id} "
            f"tried to access resource from tenant {resource_tenant_id}"
        )
        return False
    return True

def validate_branch_access(resource_branch_id: str, tenant_context: TenantContext) -> bool:
    """Validate if user has access to resource based on branch"""
    # If user has no branch restriction, allow access
    if not tenant_context.branch_id:
        return True
    
    # If resource has no branch restriction, allow access
    if not resource_branch_id:
        return True
    
    # Check if branch matches
    if resource_branch_id != tenant_context.branch_id:
        logger.warning(
            f"Branch access violation: User {tenant_context.user_id} "
            f"from branch {tenant_context.branch_id} "
            f"tried to access resource from branch {resource_branch_id}"
        )
        return False
    return True