"""
User models
"""
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional
from datetime import datetime, timezone
from enum import Enum
import uuid


class UserRole(str, Enum):
    REQUESTER = "requester"
    PD_OFFICER = "pd_officer"
    PD_MANAGER = "pd_manager"
    ADMIN = "admin"
    # Legacy roles (keeping for backwards compatibility)
    PROCUREMENT_OFFICER = "procurement_officer"
    PROJECT_MANAGER = "project_manager"
    SYSTEM_ADMIN = "system_admin"


class User(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    password: Optional[str] = None  # Hashed password
    role: UserRole = UserRole.PROCUREMENT_OFFICER
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Optional[UserRole] = UserRole.PROCUREMENT_OFFICER
