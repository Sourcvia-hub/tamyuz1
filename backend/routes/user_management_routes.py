"""
User Management Routes - HoP-only access control
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import secrets
import hashlib
import os
import logging

from database import db
from models.user import User, UserRole, UserStatus, AccessChangeLog
from utils.auth import require_auth, hash_password, verify_password

router = APIRouter(prefix="/users", tags=["User Management"])

# ==================== CONFIG ====================
# Domain restriction feature flag
AUTH_DOMAIN_RESTRICTION_ENABLED = os.environ.get("AUTH_DOMAIN_RESTRICTION_ENABLED", "false").lower() == "true"
AUTH_ALLOWED_EMAIL_DOMAINS = os.environ.get("AUTH_ALLOWED_EMAIL_DOMAINS", "tamyuz.com.sa,sourcevia.com").split(",")
AUTH_ALLOWLIST_EMAILS = os.environ.get("AUTH_ALLOWLIST_EMAILS", "").split(",") if os.environ.get("AUTH_ALLOWLIST_EMAILS") else []

# Password reset token expiry (minutes)
PASSWORD_RESET_EXPIRY_MINUTES = 30

# Rate limiting (stored in memory - in production use Redis)
password_reset_requests = {}  # {email: [timestamps]}
RATE_LIMIT_REQUESTS = 5
RATE_LIMIT_WINDOW_HOURS = 1


def is_hop(user) -> bool:
    """Check if user is Head of Procurement"""
    role = user.role.value if hasattr(user.role, 'value') else str(user.role)
    return role.lower() in ['hop', 'procurement_manager', 'admin', 'system_admin']


def validate_email_domain(email: str) -> bool:
    """Check if email domain is allowed (only when restriction is enabled)"""
    if not AUTH_DOMAIN_RESTRICTION_ENABLED:
        return True
    
    # Check allowlist first
    if email.lower() in [e.lower().strip() for e in AUTH_ALLOWLIST_EMAILS if e.strip()]:
        return True
    
    # Check domain
    domain = email.split('@')[-1].lower()
    allowed_domains = [d.strip().lower() for d in AUTH_ALLOWED_EMAIL_DOMAINS if d.strip()]
    return domain in allowed_domains


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password meets minimum requirements"""
    if len(password) < 10:
        return False, "Password must be at least 10 characters long"
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"
    return True, ""


def generate_reset_token() -> str:
    """Generate a secure password reset token"""
    return secrets.token_urlsafe(32)


def hash_reset_token(token: str) -> str:
    """Hash the reset token for storage"""
    return hashlib.sha256(token.encode()).hexdigest()


async def log_access_change(
    actor_user_id: str,
    actor_email: str,
    target_user_id: str,
    target_email: str,
    change_type: str,
    old_value: str = None,
    new_value: str = None,
    reason: str = None,
    ip_address: str = None
):
    """Log an access change to the audit trail"""
    log_entry = AccessChangeLog(
        actor_user_id=actor_user_id,
        actor_email=actor_email,
        target_user_id=target_user_id,
        target_email=target_email,
        change_type=change_type,
        old_value=old_value,
        new_value=new_value,
        reason=reason,
        ip_address=ip_address
    )
    await db.access_change_logs.insert_one(log_entry.model_dump())
    logging.info(f"Access change logged: {change_type} on {target_email} by {actor_email}")


# ==================== USER LISTING (HoP Only) ====================

@router.get("")
async def list_users(
    request: Request,
    search: Optional[str] = None,
    role_filter: Optional[str] = None,
    status_filter: Optional[str] = None
):
    """List all users - HoP only"""
    user = await require_auth(request)
    
    if not is_hop(user):
        raise HTTPException(status_code=403, detail="Only Head of Procurement can access user management")
    
    query = {}
    
    # Search by name or email
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    # Filter by role
    if role_filter:
        query["role"] = role_filter
    
    # Filter by status
    if status_filter:
        query["status"] = status_filter
    
    users = await db.users.find(query, {"_id": 0, "password": 0, "password_reset_token": 0}).sort("created_at", -1).to_list(500)
    
    return {
        "users": users,
        "count": len(users),
        "domain_restriction_enabled": AUTH_DOMAIN_RESTRICTION_ENABLED,
        "allowed_domains": AUTH_ALLOWED_EMAIL_DOMAINS if AUTH_DOMAIN_RESTRICTION_ENABLED else []
    }


@router.get("/{user_id}")
async def get_user(user_id: str, request: Request):
    """Get user details - HoP only"""
    actor = await require_auth(request)
    
    if not is_hop(actor):
        raise HTTPException(status_code=403, detail="Only Head of Procurement can access user management")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0, "password_reset_token": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


# ==================== ROLE MANAGEMENT (HoP Only) ====================

class RoleUpdateRequest(BaseModel):
    role: str
    reason: Optional[str] = None


@router.patch("/{user_id}/role")
async def update_user_role(user_id: str, data: RoleUpdateRequest, request: Request):
    """Update user role - HoP only"""
    actor = await require_auth(request)
    
    if not is_hop(actor):
        raise HTTPException(status_code=403, detail="Only Head of Procurement can change user roles")
    
    # Get target user
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate role
    valid_roles = ['business_user', 'user', 'procurement_officer', 'approver', 'hop', 'procurement_manager']
    if data.role.lower() not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")
    
    old_role = target_user.get('role', 'unknown')
    new_role = data.role.lower()
    
    # Update role
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "role": new_role,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log the change
    await log_access_change(
        actor_user_id=actor.id,
        actor_email=actor.email,
        target_user_id=user_id,
        target_email=target_user.get('email'),
        change_type="role_change",
        old_value=old_role,
        new_value=new_role,
        reason=data.reason,
        ip_address=request.client.host if request.client else None
    )
    
    return {"success": True, "message": f"Role updated from {old_role} to {new_role}"}


# ==================== STATUS MANAGEMENT (HoP Only) ====================

class StatusUpdateRequest(BaseModel):
    status: str  # "active", "disabled"
    reason: Optional[str] = None


@router.patch("/{user_id}/status")
async def update_user_status(user_id: str, data: StatusUpdateRequest, request: Request):
    """Enable/Disable user account - HoP only"""
    actor = await require_auth(request)
    
    if not is_hop(actor):
        raise HTTPException(status_code=403, detail="Only Head of Procurement can change user status")
    
    # Prevent self-disable
    if user_id == actor.id:
        raise HTTPException(status_code=400, detail="Cannot disable your own account")
    
    # Get target user
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate status
    valid_statuses = ['active', 'disabled']
    if data.status.lower() not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    old_status = target_user.get('status', 'active')
    new_status = data.status.lower()
    
    # Update status
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log the change
    await log_access_change(
        actor_user_id=actor.id,
        actor_email=actor.email,
        target_user_id=user_id,
        target_email=target_user.get('email'),
        change_type="status_change",
        old_value=old_status,
        new_value=new_status,
        reason=data.reason,
        ip_address=request.client.host if request.client else None
    )
    
    return {"success": True, "message": f"User status changed from {old_status} to {new_status}"}


# ==================== FORCE PASSWORD RESET (HoP Only) ====================

@router.post("/{user_id}/force-password-reset")
async def force_password_reset(user_id: str, request: Request):
    """Force user to reset password on next login - HoP only"""
    actor = await require_auth(request)
    
    if not is_hop(actor):
        raise HTTPException(status_code=403, detail="Only Head of Procurement can force password reset")
    
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "force_password_reset": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await log_access_change(
        actor_user_id=actor.id,
        actor_email=actor.email,
        target_user_id=user_id,
        target_email=target_user.get('email'),
        change_type="force_password_reset",
        old_value="false",
        new_value="true",
        ip_address=request.client.host if request.client else None
    )
    
    return {"success": True, "message": "User will be required to reset password on next login"}


# ==================== AUDIT TRAIL (HoP Only) ====================

@router.get("/audit/logs")
async def get_audit_logs(
    request: Request,
    user_id: Optional[str] = None,
    limit: int = 100
):
    """Get audit trail for access changes - HoP only"""
    actor = await require_auth(request)
    
    if not is_hop(actor):
        raise HTTPException(status_code=403, detail="Only Head of Procurement can view audit logs")
    
    query = {}
    if user_id:
        query["$or"] = [
            {"actor_user_id": user_id},
            {"target_user_id": user_id}
        ]
    
    logs = await db.access_change_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    
    return {"logs": logs, "count": len(logs)}


# ==================== CONFIG INFO ====================

@router.get("/config/domain-restriction")
async def get_domain_restriction_config(request: Request):
    """Get domain restriction configuration - HoP only"""
    actor = await require_auth(request)
    
    if not is_hop(actor):
        raise HTTPException(status_code=403, detail="Only Head of Procurement can view configuration")
    
    return {
        "enabled": AUTH_DOMAIN_RESTRICTION_ENABLED,
        "allowed_domains": AUTH_ALLOWED_EMAIL_DOMAINS,
        "allowlist_count": len([e for e in AUTH_ALLOWLIST_EMAILS if e.strip()])
    }
