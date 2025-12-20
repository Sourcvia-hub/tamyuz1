"""
User models with enhanced access control
"""
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


class UserRole(str, Enum):
    BUSINESS_USER = "business_user"  # Default role for all new registrations
    USER = "user"  # Legacy - maps to business_user
    PROCUREMENT_OFFICER = "procurement_officer"
    APPROVER = "approver"  # Can approve requests
    HOP = "hop"  # Head of Procurement - can manage all users
    ADMIN = "admin"  # System admin
    # Legacy roles (keeping for backwards compatibility)
    DIRECT_MANAGER = "direct_manager"
    SENIOR_MANAGER = "senior_manager"
    PROCUREMENT_MANAGER = "procurement_manager"  # Maps to HOP
    REQUESTER = "requester"
    PD_OFFICER = "pd_officer"
    PD_MANAGER = "pd_manager"
    PROJECT_MANAGER = "project_manager"
    SYSTEM_ADMIN = "system_admin"


class UserStatus(str, Enum):
    ACTIVE = "active"
    DISABLED = "disabled"
    PENDING = "pending"


class User(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    password: Optional[str] = None  # Hashed password
    role: UserRole = UserRole.BUSINESS_USER  # Default role for new users
    status: UserStatus = UserStatus.ACTIVE
    
    # Password reset
    password_reset_token: Optional[str] = None
    password_reset_expires: Optional[datetime] = None
    force_password_reset: bool = False
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None


class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AccessChangeLog(BaseModel):
    """Audit trail for user access changes"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    actor_user_id: str
    actor_email: str
    target_user_id: str
    target_email: str
    change_type: str  # "role_change", "status_change", "force_password_reset"
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    reason: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ip_address: Optional[str] = None


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str
