"""
Password Management Routes - Forgot Password & Change Password
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
import secrets
import hashlib
import logging
import os

from database import db
from utils.auth import require_auth, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Password Management"])

# Config
PASSWORD_RESET_EXPIRY_MINUTES = 30
RATE_LIMIT_REQUESTS = 5
RATE_LIMIT_WINDOW_HOURS = 1

# Rate limiting (in-memory - use Redis in production)
password_reset_requests = {}  # {email: [timestamps]}


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


def check_rate_limit(email: str) -> bool:
    """Check if email is rate limited for password reset requests"""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=RATE_LIMIT_WINDOW_HOURS)
    
    if email not in password_reset_requests:
        password_reset_requests[email] = []
    
    # Clean old entries
    password_reset_requests[email] = [
        ts for ts in password_reset_requests[email]
        if ts > window_start
    ]
    
    return len(password_reset_requests[email]) < RATE_LIMIT_REQUESTS


def record_reset_request(email: str):
    """Record a password reset request for rate limiting"""
    if email not in password_reset_requests:
        password_reset_requests[email] = []
    password_reset_requests[email].append(datetime.now(timezone.utc))


# ==================== FORGOT PASSWORD ====================

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, request: Request):
    """
    Request password reset link.
    Always returns generic message for security.
    """
    email = data.email.lower()
    
    # Rate limiting
    if not check_rate_limit(email):
        # Still return generic message
        return {"message": "If the email exists, a password reset link has been sent."}
    
    record_reset_request(email)
    
    # Find user
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if user:
        # Generate token
        token = generate_reset_token()
        hashed_token = hash_reset_token(token)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_EXPIRY_MINUTES)
        
        # Store hashed token in DB
        await db.users.update_one(
            {"email": email},
            {"$set": {
                "password_reset_token": hashed_token,
                "password_reset_expires": expires_at.isoformat()
            }}
        )
        
        # In a real application, send email here
        # For now, log the reset link (REMOVE IN PRODUCTION)
        reset_link = f"/reset-password?token={token}"
        logging.info(f"Password reset requested for {email}. Reset link: {reset_link}")
        
        # Store token temporarily for development testing
        # In production, this would be sent via email only
        await db.password_reset_tokens.insert_one({
            "email": email,
            "token": token,  # Plain token for dev testing
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Always return generic message (security best practice)
    return {"message": "If the email exists, a password reset link has been sent."}


# ==================== RESET PASSWORD (with token) ====================

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """Reset password using token from email"""
    hashed_token = hash_reset_token(data.token)
    
    # Find user with this token
    user = await db.users.find_one(
        {"password_reset_token": hashed_token},
        {"_id": 0}
    )
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check expiry
    expires_str = user.get('password_reset_expires')
    if expires_str:
        expires_at = datetime.fromisoformat(expires_str.replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(status_code=400, detail="Reset token has expired")
    else:
        raise HTTPException(status_code=400, detail="Invalid reset token")
    
    # Validate new password strength
    is_valid, error_msg = validate_password_strength(data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Update password and clear token
    new_password_hash = hash_password(data.new_password)
    
    await db.users.update_one(
        {"id": user['id']},
        {"$set": {
            "password": new_password_hash,
            "password_reset_token": None,
            "password_reset_expires": None,
            "force_password_reset": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Clean up dev token storage
    await db.password_reset_tokens.delete_many({"email": user['email']})
    
    logging.info(f"Password reset completed for {user['email']}")
    
    return {"success": True, "message": "Password has been reset successfully. Please login with your new password."}


# ==================== CHANGE PASSWORD (logged in) ====================

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


@router.post("/change-password")
async def change_password(data: ChangePasswordRequest, request: Request):
    """Change password for logged-in user"""
    user = await require_auth(request)
    
    # Get full user data
    user_data = await db.users.find_one({"id": user.id}, {"_id": 0})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not verify_password(data.current_password, user_data.get('password', '')):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Check new passwords match
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")
    
    # Validate new password strength
    is_valid, error_msg = validate_password_strength(data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Ensure new password is different from current
    if verify_password(data.new_password, user_data.get('password', '')):
        raise HTTPException(status_code=400, detail="New password must be different from current password")
    
    # Update password
    new_password_hash = hash_password(data.new_password)
    
    await db.users.update_one(
        {"id": user.id},
        {"$set": {
            "password": new_password_hash,
            "force_password_reset": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logging.info(f"Password changed for {user.email}")
    
    return {"success": True, "message": "Password changed successfully"}


# ==================== DEV ONLY: Get reset token ====================

@router.get("/dev/reset-token/{email}")
async def get_reset_token_dev(email: str):
    """DEV ONLY: Get password reset token for testing. Remove in production!"""
    if os.environ.get("ENVIRONMENT", "development") == "production":
        raise HTTPException(status_code=404, detail="Not found")
    
    token_doc = await db.password_reset_tokens.find_one(
        {"email": email.lower()},
        {"_id": 0}
    )
    
    if not token_doc:
        raise HTTPException(status_code=404, detail="No reset token found")
    
    return token_doc
