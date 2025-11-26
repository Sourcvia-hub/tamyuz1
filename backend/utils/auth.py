"""
Authentication utilities and helpers
"""
from fastapi import HTTPException, Request
from passlib.context import CryptContext
from typing import Optional, List
from datetime import datetime, timezone

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash"""
    return pwd_context.verify(plain_password, hashed_password)


async def get_current_user(request: Request):
    """Get current user from session token"""
    # Import here to avoid circular dependency
    from models import User
    from utils.database import db
    
    # Try to get token from cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        return None
    
    # Check if session exists and is valid
    session = await db.user_sessions.find_one({
        "session_token": session_token,
        "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    })
    
    if not session:
        return None
    
    # Get user
    user_doc = await db.users.find_one({"id": session["user_id"]})
    if not user_doc:
        return None
    
    # Convert datetime strings back to datetime objects
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)


async def require_auth(request: Request):
    """Require authentication"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user


async def require_role(request: Request, allowed_roles: List):
    """Require specific role"""
    user = await require_auth(request)
    if user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Forbidden")
    return user


async def require_permission(request: Request, module: str, required_permission: str):
    """
    Require specific permission for a module using RBAC system
    
    Args:
        request: FastAPI request object
        module: Module name (e.g., "vendors", "tenders")
        required_permission: Required permission (e.g., "viewer", "requester")
    
    Returns:
        User object if permission granted
    
    Raises:
        HTTPException 403 if permission denied
    """
    from utils.permissions import has_permission
    
    user = await require_auth(request)
    
    # Convert role enum to string for permission check
    user_role_str = user.role.value.lower()
    
    if not has_permission(user_role_str, module, required_permission):
        raise HTTPException(
            status_code=403, 
            detail=f"Insufficient permissions. Required: {required_permission} on {module}"
        )
    
    return user


async def require_create_permission(request: Request, module: str):
    """Require permission to create items in a module"""
    from utils.permissions import can_create
    
    user = await require_auth(request)
    user_role_str = user.role.value.lower()
    
    if not can_create(user_role_str, module):
        raise HTTPException(
            status_code=403,
            detail=f"You do not have permission to create items in {module}"
        )
    
    return user


async def require_edit_permission(request: Request, module: str):
    """Require permission to edit items in a module"""
    from utils.permissions import can_edit
    
    user = await require_auth(request)
    user_role_str = user.role.value.lower()
    
    if not can_edit(user_role_str, module):
        raise HTTPException(
            status_code=403,
            detail=f"You do not have permission to edit items in {module}"
        )
    
    return user


async def require_delete_permission(request: Request, module: str):
    """Require permission to delete items in a module"""
    from utils.permissions import can_delete
    
    user = await require_auth(request)
    user_role_str = user.role.value.lower()
    
    if not can_delete(user_role_str, module):
        raise HTTPException(
            status_code=403,
            detail=f"You do not have permission to delete items in {module}"
        )
    
    return user


async def require_verify_permission(request: Request, module: str):
    """Require permission to verify items in a module"""
    from utils.permissions import can_verify
    
    user = await require_auth(request)
    user_role_str = user.role.value.lower()
    
    if not can_verify(user_role_str, module):
        raise HTTPException(
            status_code=403,
            detail=f"You do not have permission to verify items in {module}"
        )
    
    return user


async def require_approve_permission(request: Request, module: str):
    """Require permission to approve items in a module"""
    from utils.permissions import can_approve
    
    user = await require_auth(request)
    user_role_str = user.role.value.lower()
    
    if not can_approve(user_role_str, module):
        raise HTTPException(
            status_code=403,
            detail=f"You do not have permission to approve items in {module}"
        )
    
    return user
