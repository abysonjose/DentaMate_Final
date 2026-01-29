"""
Tenant isolation and context middleware
"""

import logging
from typing import Dict
from fastapi import Depends, HTTPException, status

from ..middleware.auth import verify_jwt_token
from ..utils.exceptions import TenantIsolationError

logger = logging.getLogger(__name__)


async def extract_tenant_context(token_payload: Dict = Depends(verify_jwt_token)) -> Dict:
    """
    Extract tenant context from JWT token
    Ensures proper tenant isolation
    """
    try:
        tenant_id = token_payload.get('tenant_id')
        branch_id = token_payload.get('branch_id')
        
        if not tenant_id:
            raise TenantIsolationError("Missing tenant_id in token")
        
        # Build tenant context
        context = {
            'tenant_id': tenant_id,
            'branch_id': branch_id,
            'user_id': token_payload.get('user_id'),
            'role': token_payload.get('role')
        }
        
        return context
        
    except Exception as e:
        logger.error(f"Tenant context extraction error: {e}")
        raise TenantIsolationError("Failed to extract tenant context")


def validate_tenant_access(resource_tenant_id: str, context: Dict) -> bool:
    """
    Validate that user has access to resource based on tenant
    """
    user_tenant_id = context.get('tenant_id')
    
    # Strict tenant isolation - users can only access their tenant's resources
    if resource_tenant_id != user_tenant_id:
        return False
    
    return True


def validate_branch_access(resource_branch_id: str, context: Dict) -> bool:
    """
    Validate that user has access to resource based on branch
    """
    user_branch_id = context.get('branch_id')
    user_role = context.get('role')
    
    # Central admin and SaaS admin can access all branches
    if user_role in ['central_admin', 'saas_admin']:
        return True
    
    # Other users can only access their branch resources
    if resource_branch_id and resource_branch_id != user_branch_id:
        return False
    
    return True


class TenantIsolationMiddleware:
    """Middleware to enforce tenant isolation"""
    
    @staticmethod
    def enforce_tenant_isolation(resource_tenant_id: str, context: Dict):
        """Enforce tenant isolation for a resource"""
        if not validate_tenant_access(resource_tenant_id, context):
            raise TenantIsolationError(
                f"Access denied: User from tenant {context.get('tenant_id')} "
                f"cannot access resource from tenant {resource_tenant_id}"
            )
    
    @staticmethod
    def enforce_branch_isolation(resource_branch_id: str, context: Dict):
        """Enforce branch isolation for a resource"""
        if not validate_branch_access(resource_branch_id, context):
            raise TenantIsolationError(
                f"Access denied: User from branch {context.get('branch_id')} "
                f"cannot access resource from branch {resource_branch_id}"
            )
    
    @staticmethod
    def get_tenant_filter(context: Dict) -> Dict:
        """Get MongoDB filter for tenant isolation"""
        return {'tenant_id': context.get('tenant_id')}
    
    @staticmethod
    def get_branch_filter(context: Dict) -> Dict:
        """Get MongoDB filter for branch isolation"""
        filter_dict = {'tenant_id': context.get('tenant_id')}
        
        # Add branch filter if user is not admin
        user_role = context.get('role')
        if user_role not in ['central_admin', 'saas_admin']:
            branch_id = context.get('branch_id')
            if branch_id:
                filter_dict['branch_id'] = branch_id
        
        return filter_dict