from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request, status
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import aiohttp
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from io import BytesIO

# Import AI helpers
from ai_helpers import (
    analyze_vendor_scoring,
    analyze_tender_proposal,
    analyze_contract_classification,
    analyze_po_items,
    match_invoice_to_milestone
)

# Import all models from the models package
from models import (
    User, UserRole,
    Vendor, VendorType, VendorStatus, RiskCategory,
    Tender, TenderStatus, EvaluationCriteria, Proposal, ProposalStatus,
    Contract, ContractStatus,
    Invoice, InvoiceStatus,
    PurchaseOrder, POItem, POStatus,
    Resource, ResourceStatus, WorkType, Relative,
    Asset, AssetStatus, AssetCondition, Building, Floor, AssetCategory,
    OSR, OSRType, OSRCategory, OSRStatus, OSRPriority,
    Notification, AuditLog
)

# Import repository factory
from repositories.repository_factory import repos

# Import JWT authentication
from utils.jwt_auth import (
    create_access_token,
    decode_access_token,
    get_current_user,
    require_admin,
    require_procurement,
    require_manager
)

# Import utilities
from utils.auth import hash_password, verify_password
from utils.helpers import generate_number, determine_outsourcing_classification, determine_noc_requirement

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ==================== HELPER FUNCTIONS ====================
def calculate_vendor_registration_score(vendor_data: dict) -> dict:
    """
    Calculate vendor registration score based on 15 Yes/No questions.
    1 point for each "Yes" answer.
    Returns: dict with score, percentage, and risk_category
    """
    total_questions = 15
    score = 0
    
    # All questions award 1 point for "Yes"
    if vendor_data.get('vat_number'): score += 1
    if vendor_data.get('unified_number'): score += 1
    if vendor_data.get('cr_number'): score += 1
    if vendor_data.get('cr_expiry_date'): score += 1
    if vendor_data.get('cr_country_city'): score += 1
    if vendor_data.get('license_number'): score += 1
    if vendor_data.get('license_expiry_date'): score += 1
    if vendor_data.get('activity_description'): score += 1
    if vendor_data.get('number_of_employees'): score += 1
    if vendor_data.get('country_list'): score += 1
    if vendor_data.get('financial_details'): score += 1
    if vendor_data.get('branches_subsidiaries'): score += 1
    if vendor_data.get('key_customers'): score += 1
    if vendor_data.get('financial_statements_2years'): score += 1
    if vendor_data.get('documents_pdf_attached'): score += 1
    
    percentage = (score / total_questions) * 100
    
    # Determine risk category based on percentage
    if percentage >= 80:
        risk_category = 'low'
    elif percentage >= 60:
        risk_category = 'medium'
    elif percentage >= 40:
        risk_category = 'high'
    else:
        risk_category = 'very_high'
    
    return {
        'score': score,
        'total': total_questions,
        'percentage': round(percentage, 2),
        'risk_category': risk_category
    }


# Pydantic models for requests
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Optional[UserRole] = UserRole.PROCUREMENT_OFFICER


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ==================== CORS CONFIGURATION ====================
# Read CORS_ORIGINS from environment (production-safe)
cors_origins_env = os.getenv("CORS_ORIGINS", "")
allowed_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

# Hardcoded fallbacks for common production domains (defensive coding)
production_domains = [
    "https://sourcevia.xyz",
    "https://www.sourcevia.xyz",
    "https://sourcevia-secure.emergent.host",
    "https://sourcevia-mgmt.emergent.host",
    "https://data-overhaul-1.preview.emergentagent.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Combine environment and hardcoded origins
for domain in production_domains:
    if domain not in allowed_origins:
        allowed_origins.append(domain)

if not allowed_origins:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== ROOT HEALTH CHECK ====================
@app.get("/")
async def root_health_check():
    return {
        "status": "ok",
        "message": "Sourcevia Procurement Management API",
        "version": "2.0.0",
        "storage": "JSON files (repository pattern)",
        "auth": "JWT (stateless)"
    }


# ==================== API HEALTH CHECK ====================
@api_router.get("/health")
async def api_health_check():
    """API health check endpoint with storage verification."""
    try:
        # Test repository access
        user_count = await repos.users.count()
        
        return {
            "status": "ok",
            "storage": "connected",
            "storage_type": "JSON files",
            "api_version": "2.0.0",
            "user_count": user_count,
            "endpoints": {
                "login": "/api/auth/login",
                "register": "/api/auth/register",
                "docs": "/docs"
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "storage": "disconnected",
            "error": str(e)
        }


# ==================== AUTHENTICATION ENDPOINTS ====================
@api_router.post("/auth/register")
async def register(register_data: RegisterRequest):
    """Register a new user."""
    # Check if user already exists
    existing = await repos.users.find_one({"email": register_data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = hash_password(register_data.password)
    
    user_data = {
        "id": user_id,
        "email": register_data.email,
        "name": register_data.name,
        "password": hashed_password,
        "role": register_data.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await repos.users.create(user_data)
    
    # Create JWT token
    token_data = {
        "id": user_id,
        "email": register_data.email,
        "name": register_data.name,
        "role": register_data.role
    }
    access_token = create_access_token(token_data)
    
    return {
        "user": {
            "id": user_id,
            "email": register_data.email,
            "name": register_data.name,
            "role": register_data.role
        },
        "access_token": access_token,
        "token_type": "bearer"
    }


@api_router.post("/auth/login")
async def login(login_data: LoginRequest):
    """Login with email and password."""
    # Find user
    user = await repos.users.find_one({"email": login_data.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(login_data.password, user.get("password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create JWT token
    token_data = {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"]
    }
    access_token = create_access_token(token_data)
    
    return {
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "created_at": user.get("created_at")
        },
        "access_token": access_token,
        "token_type": "bearer"
    }


@api_router.get("/auth/me")
async def get_me(current_user: Dict = Depends(get_current_user)):
    """Get current user information from JWT token."""
    # Fetch fresh user data from storage
    user = await repos.users.get_by_id(current_user["id"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "created_at": user.get("created_at")
    }


@api_router.post("/auth/logout")
async def logout(current_user: Dict = Depends(get_current_user)):
    """Logout endpoint (with JWT, this is mostly client-side)."""
    return {
        "message": "Logout successful. Please discard the token on client side."
    }


# Continue with remaining endpoints...
# Include the router
app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)