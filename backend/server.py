from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request, status
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import aiohttp
from enum import Enum


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== ENUMS ====================
class UserRole(str, Enum):
    PROCUREMENT_OFFICER = "procurement_officer"
    PROJECT_MANAGER = "project_manager"
    SYSTEM_ADMIN = "system_admin"

class VendorStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class RiskCategory(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class TenderStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"
    AWARDED = "awarded"

class ContractStatus(str, Enum):
    DRAFT = "draft"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    ACTIVE = "active"
    EXPIRED = "expired"

class InvoiceStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    APPROVED = "approved"
    PAID = "paid"
    REJECTED = "rejected"

# ==================== MODELS ====================
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

class Vendor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_number: Optional[str] = None  # Auto-generated (e.g., Vendor-25-0001)
    
    # Company Information
    name_english: str
    commercial_name: str
    entity_type: str
    vat_number: str
    unified_number: Optional[str] = None  # For Saudi entities
    cr_number: str
    cr_expiry_date: datetime
    cr_country_city: str
    license_number: Optional[str] = None
    license_expiry_date: Optional[datetime] = None
    activity_description: str
    number_of_employees: int
    
    # Address and Contact
    street: str
    building_no: str
    city: str
    district: str
    country: str
    mobile: str
    landline: Optional[str] = None
    fax: Optional[str] = None
    email: EmailStr
    
    # Representative Information
    representative_name: str
    representative_designation: str
    representative_id_type: str
    representative_id_number: str
    representative_nationality: str
    representative_mobile: str
    representative_residence_tel: Optional[str] = None
    representative_phone_area_code: Optional[str] = None
    representative_email: EmailStr
    
    # Bank Account Information
    bank_account_name: str
    bank_name: str
    bank_branch: str
    bank_country: str
    iban: str
    currency: str
    swift_code: str
    
    # Owners/Partners/Managers (stored as JSON)
    owners_managers: List[Dict[str, Any]] = []
    
    # Authorization
    authorized_persons: List[Dict[str, Any]] = []
    
    # Documents
    documents: List[str] = []
    
    # System fields
    risk_score: float = 0.0
    risk_category: RiskCategory = RiskCategory.LOW
    risk_assessment_details: Dict[str, Any] = {}  # Breakdown of risk calculation
    status: VendorStatus = VendorStatus.APPROVED  # Auto-approved
    evaluation_notes: Optional[str] = None
    created_by: Optional[str] = None  # User ID who created
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Tender(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tender_number: Optional[str] = None  # Auto-generated (e.g., TND-2025-0001)
    title: str
    description: str
    project_name: str
    requirements: str
    budget: float
    deadline: datetime
    invited_vendors: List[str] = []  # vendor IDs
    status: TenderStatus = TenderStatus.DRAFT
    created_by: Optional[str] = None  # user ID who created
    awarded_to: Optional[str] = None  # vendor ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EvaluationCriteria(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    vendor_reliability_stability: float = 0.0  # Score 1-5
    delivery_warranty_backup: float = 0.0  # Score 1-5
    technical_experience: float = 0.0  # Score 1-5
    cost_score: float = 0.0  # Score 1-5
    meets_requirements: float = 0.0  # Score 1-5 (NEW)
    
    # Calculated fields
    vendor_reliability_weighted: float = 0.0  # 20% weight
    delivery_warranty_weighted: float = 0.0  # 20% weight
    technical_experience_weighted: float = 0.0  # 10% weight
    cost_weighted: float = 0.0  # 10% weight
    meets_requirements_weighted: float = 0.0  # 40% weight (NEW)
    total_score: float = 0.0  # Sum of weighted scores (100% total)
    
class ProposalStatus(str, Enum):
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"

class Proposal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    proposal_number: Optional[str] = None  # Auto-generated (e.g., PRO-2025-0001)
    tender_id: Optional[str] = None  # Set automatically by endpoint
    vendor_id: str
    technical_proposal: str
    financial_proposal: float
    status: ProposalStatus = ProposalStatus.APPROVED  # Auto-approved
    
    # Evaluation scores
    evaluation: Optional[EvaluationCriteria] = None
    evaluated_by: Optional[str] = None  # User ID who evaluated
    evaluated_at: Optional[datetime] = None
    
    # Legacy fields (kept for compatibility)
    technical_score: float = 0.0
    financial_score: float = 0.0
    final_score: float = 0.0
    
    documents: List[str] = []
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Contract(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contract_number: Optional[str] = None  # Auto-generated (e.g., Contract-25-0001)
    tender_id: str  # Required - must select approved tender
    vendor_id: str
    title: str
    sow: str  # Statement of Work
    sla: str  # Service Level Agreement
    milestones: List[Dict[str, Any]] = []
    value: float
    start_date: datetime
    end_date: datetime
    is_outsourcing: bool = False
    status: ContractStatus = ContractStatus.DRAFT
    created_by: Optional[str] = None  # user ID who created
    approved_by: Optional[str] = None  # user ID
    documents: List[str] = []
    
    # Outsourcing Assessment Questionnaire
    contractor_name: Optional[str] = None
    goods_services_description: Optional[str] = None
    multiple_activities_same_provider: Optional[bool] = None
    other_outsourced_activities: Optional[str] = None
    
    # Section A: Outsourcing Determination
    a1_continuing_basis: Optional[bool] = None
    a1_period: Optional[str] = None
    a2_could_be_undertaken_by_bank: Optional[bool] = None
    a3_is_insourcing_contract: Optional[bool] = None
    a4_market_data_providers: Optional[bool] = None
    a4_clearing_settlement: Optional[bool] = None
    a4_correspondent_banking: Optional[bool] = None
    a4_utilities: Optional[bool] = None
    
    # Section B: Materiality Determination
    b1_material_impact_if_disrupted: Optional[bool] = None
    b2_financial_impact: Optional[bool] = None
    b3_reputational_impact: Optional[bool] = None
    b4_outside_ksa: Optional[bool] = None
    b5_difficult_alternative: Optional[bool] = None
    b6_data_transfer: Optional[bool] = None
    b7_affiliation_relationship: Optional[bool] = None
    b8_regulated_activity: Optional[bool] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: Optional[str] = None  # Auto-generated (e.g., Invoice-25-0001)
    contract_id: str
    vendor_id: str
    amount: float
    description: str
    milestone_reference: Optional[str] = None
    status: InvoiceStatus = InvoiceStatus.PENDING
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    verified_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    verified_by: Optional[str] = None  # user ID
    approved_by: Optional[str] = None  # user ID
    documents: List[str] = []

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    type: str  # "approval", "alert", "info"
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entity_type: str  # "vendor", "tender", "contract", etc.
    entity_id: str
    action: str  # "created", "updated", "deleted"
    user_id: str
    user_name: str
    changes: Dict[str, Any] = {}  # What changed
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== AUTH HELPERS ====================
def hash_password(password: str) -> str:
    """Simple password hashing (in production, use bcrypt or passlib)"""
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return hash_password(plain_password) == hashed_password

async def get_current_user(request: Request) -> Optional[User]:
    """Get current user from session token"""
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

async def require_auth(request: Request) -> User:
    """Require authentication"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user

async def require_role(request: Request, allowed_roles: List[UserRole]) -> User:
    """Require specific role"""
    user = await require_auth(request)
    if user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Forbidden")
    return user

# ==================== NUMBER GENERATION HELPERS ====================
async def generate_number(entity_type: str) -> str:
    """
    Generate sequential number for entities in format: {Type}-{YY}-{NNNN}
    Examples: Vendor-25-0001, Tender-25-0002, Contract-25-0001
    """
    current_year = datetime.now(timezone.utc).year
    year_suffix = str(current_year)[-2:]  # Last 2 digits of year
    
    # Get or create counter for this entity type and year
    counter_id = f"{entity_type}_{current_year}"
    
    # Use findOneAndUpdate with upsert to atomically increment
    result = await db.counters.find_one_and_update(
        {"_id": counter_id},
        {"$inc": {"sequence": 1}},
        upsert=True,
        return_document=True
    )
    
    sequence = result.get("sequence", 1)
    
    # Format: Type-YY-NNNN (e.g., Vendor-25-0001)
    return f"{entity_type}-{year_suffix}-{sequence:04d}"

# ==================== AUTH ENDPOINTS ====================
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole

@api_router.post("/auth/register")
async def register(register_data: RegisterRequest):
    """Register a new user (admin only endpoint for creating users)"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": register_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create new user
    user = User(
        email=register_data.email,
        name=register_data.name,
        password=hash_password(register_data.password),
        role=register_data.role
    )
    
    user_doc = user.model_dump()
    user_doc["created_at"] = user_doc["created_at"].isoformat()
    await db.users.insert_one(user_doc)
    
    # Remove password from response
    user_dict = user.model_dump()
    user_dict.pop('password', None)
    
    return {"message": "User created successfully", "user": user_dict}

@api_router.post("/auth/login")
async def login(login_data: LoginRequest, response: Response):
    """Login with email and password"""
    # Find user
    user_doc = await db.users.find_one({"email": login_data.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(login_data.password, user_doc.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Convert datetime strings
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user = User(**user_doc)
    
    # Create session
    session_token = str(uuid.uuid4()) + str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session = UserSession(
        user_id=user.id,
        session_token=session_token,
        expires_at=expires_at
    )
    
    session_doc = session.model_dump()
    session_doc["expires_at"] = session_doc["expires_at"].isoformat()
    session_doc["created_at"] = session_doc["created_at"].isoformat()
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    # Remove password from response
    user_dict = user.model_dump()
    user_dict.pop('password', None)
    
    return {"user": user_dict}

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current user"""
    user = await require_auth(request)
    return user.model_dump()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, request: Request):
    """Get user by ID"""
    await require_auth(request)
    
    user_doc = await db.users.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Remove MongoDB _id and password
    if '_id' in user_doc:
        del user_doc['_id']
    if 'password' in user_doc:
        del user_doc['password']
    
    # Convert datetime
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return user_doc

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role: UserRole, request: Request):
    """Update user role (admin only)"""
    admin = await require_role(request, [UserRole.SYSTEM_ADMIN])
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": role.value}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Role updated"}

# ==================== VENDOR ENDPOINTS ====================
@api_router.post("/vendors")
async def create_vendor(vendor: Vendor, request: Request):
    """Create a new vendor (Procurement Officer only) - Auto-approved"""
    user = await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN])
    
    # Calculate detailed risk assessment
    risk_details = {}
    risk_score = 0.0
    
    # Documents check (30 points)
    if not vendor.documents or len(vendor.documents) == 0:
        risk_score += 30
        risk_details["missing_documents"] = {"score": 30, "reason": "No documents uploaded"}
    
    # Bank information check (20 points)
    if not vendor.bank_name or not vendor.iban:
        risk_score += 20
        risk_details["incomplete_banking"] = {"score": 20, "reason": "Missing bank information"}
    
    # CR expiry check (15 points if expiring soon)
    if vendor.cr_expiry_date:
        days_to_expiry = (vendor.cr_expiry_date - datetime.now(timezone.utc)).days
        if days_to_expiry < 90:
            risk_score += 15
            risk_details["cr_expiring_soon"] = {"score": 15, "reason": f"CR expires in {days_to_expiry} days"}
    
    # License check (10 points)
    if not vendor.license_number:
        risk_score += 10
        risk_details["missing_license"] = {"score": 10, "reason": "No license number provided"}
    
    # Number of employees check (10 points if < 5)
    if vendor.number_of_employees < 5:
        risk_score += 10
        risk_details["small_team"] = {"score": 10, "reason": f"Only {vendor.number_of_employees} employees"}
    
    vendor.risk_score = risk_score
    vendor.risk_assessment_details = risk_details
    
    if risk_score >= 50:
        vendor.risk_category = RiskCategory.HIGH
    elif risk_score >= 25:
        vendor.risk_category = RiskCategory.MEDIUM
    else:
        vendor.risk_category = RiskCategory.LOW
    
    # Auto-approve vendor
    vendor.status = VendorStatus.APPROVED
    vendor.created_by = user.id
    
    # Generate vendor number
    vendor.vendor_number = await generate_number("Vendor")
    
    vendor_doc = vendor.model_dump()
    vendor_doc["created_at"] = vendor_doc["created_at"].isoformat()
    vendor_doc["updated_at"] = vendor_doc["updated_at"].isoformat()
    if vendor_doc.get("cr_expiry_date"):
        vendor_doc["cr_expiry_date"] = vendor_doc["cr_expiry_date"].isoformat()
    if vendor_doc.get("license_expiry_date"):
        vendor_doc["license_expiry_date"] = vendor_doc["license_expiry_date"].isoformat()
    
    await db.vendors.insert_one(vendor_doc)
    
    # Create audit log
    audit_log = AuditLog(
        entity_type="vendor",
        entity_id=vendor.id,
        action="created",
        user_id=user.id,
        user_name=user.name,
        changes={"vendor_name": vendor.name_english, "risk_score": risk_score}
    )
    audit_doc = audit_log.model_dump()
    audit_doc["timestamp"] = audit_doc["timestamp"].isoformat()
    await db.audit_logs.insert_one(audit_doc)
    
    return vendor.model_dump()

@api_router.get("/vendors")
async def get_vendors(request: Request, status: Optional[VendorStatus] = None, search: Optional[str] = None):
    """Get all vendors with optional search by vendor_number or name"""
    await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN])
    
    query = {}
    if status:
        query["status"] = status.value
    
    # Add search functionality
    if search:
        query["$or"] = [
            {"vendor_number": {"$regex": search, "$options": "i"}},
            {"name_english": {"$regex": search, "$options": "i"}},
            {"commercial_name": {"$regex": search, "$options": "i"}}
        ]
    
    vendors = await db.vendors.find(query).to_list(1000)
    
    # Convert datetime strings and handle ObjectId
    result = []
    for vendor in vendors:
        # Remove MongoDB _id
        if '_id' in vendor:
            del vendor['_id']
        
        # Convert datetime strings
        if isinstance(vendor.get('created_at'), str):
            vendor['created_at'] = datetime.fromisoformat(vendor['created_at'])
        if isinstance(vendor.get('updated_at'), str):
            vendor['updated_at'] = datetime.fromisoformat(vendor['updated_at'])
        if isinstance(vendor.get('cr_expiry_date'), str):
            vendor['cr_expiry_date'] = datetime.fromisoformat(vendor['cr_expiry_date'])
        if vendor.get('license_expiry_date') and isinstance(vendor.get('license_expiry_date'), str):
            vendor['license_expiry_date'] = datetime.fromisoformat(vendor['license_expiry_date'])
        
        result.append(vendor)
    
    return result

@api_router.get("/vendors/{vendor_id}")
async def get_vendor(vendor_id: str, request: Request):
    """Get vendor by ID"""
    await require_auth(request)
    
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Remove MongoDB _id
    if '_id' in vendor:
        del vendor['_id']
    
    # Convert datetime strings
    if isinstance(vendor.get('created_at'), str):
        vendor['created_at'] = datetime.fromisoformat(vendor['created_at'])
    if isinstance(vendor.get('updated_at'), str):
        vendor['updated_at'] = datetime.fromisoformat(vendor['updated_at'])
    if isinstance(vendor.get('cr_expiry_date'), str):
        vendor['cr_expiry_date'] = datetime.fromisoformat(vendor['cr_expiry_date'])
    if vendor.get('license_expiry_date') and isinstance(vendor.get('license_expiry_date'), str):
        vendor['license_expiry_date'] = datetime.fromisoformat(vendor['license_expiry_date'])
    
    return vendor

@api_router.put("/vendors/{vendor_id}")
async def update_vendor(vendor_id: str, vendor_update: Vendor, request: Request):
    """Update vendor information"""
    user = await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN])
    
    # Get existing vendor
    existing_vendor = await db.vendors.find_one({"id": vendor_id})
    if not existing_vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Recalculate risk assessment
    risk_details = {}
    risk_score = 0.0
    
    if not vendor_update.documents or len(vendor_update.documents) == 0:
        risk_score += 30
        risk_details["missing_documents"] = {"score": 30, "reason": "No documents uploaded"}
    
    if not vendor_update.bank_name or not vendor_update.iban:
        risk_score += 20
        risk_details["incomplete_banking"] = {"score": 20, "reason": "Missing bank information"}
    
    if vendor_update.cr_expiry_date:
        days_to_expiry = (vendor_update.cr_expiry_date - datetime.now(timezone.utc)).days
        if days_to_expiry < 90:
            risk_score += 15
            risk_details["cr_expiring_soon"] = {"score": 15, "reason": f"CR expires in {days_to_expiry} days"}
    
    if not vendor_update.license_number:
        risk_score += 10
        risk_details["missing_license"] = {"score": 10, "reason": "No license number provided"}
    
    if vendor_update.number_of_employees < 5:
        risk_score += 10
        risk_details["small_team"] = {"score": 10, "reason": f"Only {vendor_update.number_of_employees} employees"}
    
    vendor_update.risk_score = risk_score
    vendor_update.risk_assessment_details = risk_details
    
    if risk_score >= 50:
        vendor_update.risk_category = RiskCategory.HIGH
    elif risk_score >= 25:
        vendor_update.risk_category = RiskCategory.MEDIUM
    else:
        vendor_update.risk_category = RiskCategory.LOW
    
    vendor_update.updated_at = datetime.now(timezone.utc)
    vendor_update.id = vendor_id  # Preserve ID
    vendor_update.created_by = existing_vendor.get("created_by")  # Preserve creator
    vendor_update.created_at = datetime.fromisoformat(existing_vendor["created_at"]) if isinstance(existing_vendor.get("created_at"), str) else existing_vendor.get("created_at")
    
    # Track changes
    changes = {}
    for field in ["name_english", "vat_number", "cr_number", "mobile", "email"]:
        old_value = existing_vendor.get(field)
        new_value = getattr(vendor_update, field)
        if old_value != new_value:
            changes[field] = {"old": old_value, "new": new_value}
    
    vendor_doc = vendor_update.model_dump()
    vendor_doc["created_at"] = vendor_doc["created_at"].isoformat()
    vendor_doc["updated_at"] = vendor_doc["updated_at"].isoformat()
    if vendor_doc.get("cr_expiry_date"):
        vendor_doc["cr_expiry_date"] = vendor_doc["cr_expiry_date"].isoformat()
    if vendor_doc.get("license_expiry_date"):
        vendor_doc["license_expiry_date"] = vendor_doc["license_expiry_date"].isoformat()
    
    await db.vendors.update_one({"id": vendor_id}, {"$set": vendor_doc})
    
    # Create audit log
    audit_log = AuditLog(
        entity_type="vendor",
        entity_id=vendor_id,
        action="updated",
        user_id=user.id,
        user_name=user.name,
        changes=changes
    )
    audit_doc = audit_log.model_dump()
    audit_doc["timestamp"] = audit_doc["timestamp"].isoformat()
    await db.audit_logs.insert_one(audit_doc)
    
    return vendor_update.model_dump()

@api_router.get("/vendors/{vendor_id}/audit-log")
async def get_vendor_audit_log(vendor_id: str, request: Request):
    """Get audit log for a vendor"""
    await require_auth(request)
    
    logs = await db.audit_logs.find({"entity_type": "vendor", "entity_id": vendor_id}).sort("timestamp", -1).to_list(100)
    
    # Remove _id and convert timestamps
    result = []
    for log in logs:
        if '_id' in log:
            del log['_id']
        if isinstance(log.get('timestamp'), str):
            log['timestamp'] = datetime.fromisoformat(log['timestamp'])
        result.append(log)
    
    return result

# ==================== TENDER ENDPOINTS ====================
@api_router.post("/tenders")
async def create_tender(tender: Tender, request: Request):
    """Create new tender - Auto-approved with generated number"""
    user = await require_role(request, [UserRole.PROCUREMENT_OFFICER])
    
    tender.created_by = user.id
    
    # Auto-approve and generate tender number
    tender.status = TenderStatus.PUBLISHED
    tender.tender_number = await generate_number("Tender")
    
    tender_doc = tender.model_dump()
    tender_doc["deadline"] = tender_doc["deadline"].isoformat()
    tender_doc["created_at"] = tender_doc["created_at"].isoformat()
    tender_doc["updated_at"] = tender_doc["updated_at"].isoformat()
    
    await db.tenders.insert_one(tender_doc)
    
    # Return without MongoDB _id
    result = tender.model_dump()
    return result

@api_router.get("/tenders")
async def get_tenders(request: Request, status: Optional[TenderStatus] = None, search: Optional[str] = None):
    """Get all tenders with optional search by tender_number or title"""
    user = await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.PROJECT_MANAGER, UserRole.SYSTEM_ADMIN])
    
    query = {}
    if status:
        query["status"] = status.value
    
    # Add search functionality
    if search:
        query["$or"] = [
            {"tender_number": {"$regex": search, "$options": "i"}},
            {"title": {"$regex": search, "$options": "i"}},
            {"project_name": {"$regex": search, "$options": "i"}}
        ]
    
    tenders = await db.tenders.find(query).to_list(1000)
    
    result = []
    for tender in tenders:
        # Remove MongoDB _id
        if '_id' in tender:
            del tender['_id']
        
        if isinstance(tender.get('deadline'), str):
            tender['deadline'] = datetime.fromisoformat(tender['deadline'])
        if isinstance(tender.get('created_at'), str):
            tender['created_at'] = datetime.fromisoformat(tender['created_at'])
        if isinstance(tender.get('updated_at'), str):
            tender['updated_at'] = datetime.fromisoformat(tender['updated_at'])
        
        result.append(tender)
    
    return result

@api_router.get("/tenders/{tender_id}")
async def get_tender(tender_id: str, request: Request):
    """Get tender by ID"""
    await require_auth(request)
    
    tender = await db.tenders.find_one({"id": tender_id})
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    
    # Remove MongoDB _id
    if '_id' in tender:
        del tender['_id']
    
    if isinstance(tender.get('deadline'), str):
        tender['deadline'] = datetime.fromisoformat(tender['deadline'])
    if isinstance(tender.get('created_at'), str):
        tender['created_at'] = datetime.fromisoformat(tender['created_at'])
    if isinstance(tender.get('updated_at'), str):
        tender['updated_at'] = datetime.fromisoformat(tender['updated_at'])
    
    return tender

@api_router.get("/tenders/approved/list")
async def get_approved_tenders(request: Request):
    """Get list of approved tenders for contract creation"""
    await require_auth(request)
    
    tenders = await db.tenders.find({"status": TenderStatus.PUBLISHED.value}).to_list(1000)
    
    result = []
    for tender in tenders:
        # Remove MongoDB _id
        if '_id' in tender:
            del tender['_id']
        
        # Only return essential fields for dropdown
        result.append({
            "id": tender.get("id"),
            "tender_number": tender.get("tender_number"),
            "title": tender.get("title"),
            "project_name": tender.get("project_name"),
            "requirements": tender.get("requirements"),
            "budget": tender.get("budget")
        })
    
    return result

@api_router.put("/tenders/{tender_id}")
async def update_tender(tender_id: str, tender: Tender, request: Request):
    """Update tender"""
    user = await require_role(request, [UserRole.PROCUREMENT_OFFICER])
    
    # Check if tender exists
    existing_tender = await db.tenders.find_one({"id": tender_id})
    if not existing_tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    
    # Prepare update data
    update_data = {
        "title": tender.title,
        "description": tender.description,
        "project_name": tender.project_name,
        "requirements": tender.requirements,
        "budget": tender.budget,
        "deadline": tender.deadline.isoformat(),
        "invited_vendors": tender.invited_vendors,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update tender
    result = await db.tenders.update_one(
        {"id": tender_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tender not found")
    
    return {"message": "Tender updated successfully"}

@api_router.put("/tenders/{tender_id}/publish")
async def publish_tender(tender_id: str, request: Request):
    """Publish tender"""
    await require_role(request, [UserRole.PROCUREMENT_OFFICER])
    
    result = await db.tenders.update_one(
        {"id": tender_id},
        {
            "$set": {
                "status": TenderStatus.PUBLISHED.value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tender not found")
    
    return {"message": "Tender published"}

@api_router.post("/tenders/{tender_id}/proposals")
async def submit_proposal(tender_id: str, proposal: Proposal, request: Request):
    """Submit proposal for tender (Procurement Officer can submit on behalf of vendor)"""
    await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN])
    
    proposal.tender_id = tender_id
    
    # Generate proposal number
    proposal.proposal_number = await generate_number("Proposal")
    
    # vendor_id should be provided in the proposal object
    proposal_doc = proposal.model_dump()
    proposal_doc["submitted_at"] = proposal_doc["submitted_at"].isoformat()
    
    await db.proposals.insert_one(proposal_doc)
    
    # Return without MongoDB _id
    result = proposal.model_dump()
    return result

@api_router.get("/tenders/{tender_id}/proposals")
async def get_tender_proposals(tender_id: str, request: Request):
    """Get all proposals for a tender"""
    await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.PROJECT_MANAGER])
    
    proposals = await db.proposals.find({"tender_id": tender_id}).to_list(1000)
    
    result = []
    for proposal in proposals:
        # Remove MongoDB _id
        if '_id' in proposal:
            del proposal['_id']
        
        if isinstance(proposal.get('submitted_at'), str):
            proposal['submitted_at'] = datetime.fromisoformat(proposal['submitted_at'])
        
        result.append(proposal)
    
    return result

class ProposalEvaluationRequest(BaseModel):
    proposal_id: str
    vendor_reliability_stability: float = Field(ge=1, le=5)
    delivery_warranty_backup: float = Field(ge=1, le=5)
    technical_experience: float = Field(ge=1, le=5)
    cost_score: float = Field(ge=1, le=5)
    meets_requirements: float = Field(ge=1, le=5)

@api_router.post("/tenders/{tender_id}/proposals/{proposal_id}/evaluate")
async def evaluate_proposal(tender_id: str, proposal_id: str, evaluation: ProposalEvaluationRequest, request: Request):
    """Evaluate a single proposal with detailed criteria"""
    user = await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.PROJECT_MANAGER])
    
    # Find proposal
    proposal = await db.proposals.find_one({"id": proposal_id, "tender_id": tender_id})
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    # Calculate weighted scores (weights: 20%, 20%, 10%, 10%, 40% = 100% total)
    vendor_reliability_weighted = evaluation.vendor_reliability_stability * 0.20
    delivery_warranty_weighted = evaluation.delivery_warranty_backup * 0.20
    technical_experience_weighted = evaluation.technical_experience * 0.10
    cost_weighted = evaluation.cost_score * 0.10
    meets_requirements_weighted = evaluation.meets_requirements * 0.40
    
    total_score = (
        vendor_reliability_weighted + 
        delivery_warranty_weighted + 
        technical_experience_weighted + 
        cost_weighted +
        meets_requirements_weighted
    )
    
    # Create evaluation object
    evaluation_data = {
        "vendor_reliability_stability": evaluation.vendor_reliability_stability,
        "delivery_warranty_backup": evaluation.delivery_warranty_backup,
        "technical_experience": evaluation.technical_experience,
        "cost_score": evaluation.cost_score,
        "meets_requirements": evaluation.meets_requirements,
        "vendor_reliability_weighted": vendor_reliability_weighted,
        "delivery_warranty_weighted": delivery_warranty_weighted,
        "technical_experience_weighted": technical_experience_weighted,
        "cost_weighted": cost_weighted,
        "meets_requirements_weighted": meets_requirements_weighted,
        "total_score": total_score
    }
    
    # Update proposal with evaluation
    await db.proposals.update_one(
        {"id": proposal_id},
        {
            "$set": {
                "evaluation": evaluation_data,
                "evaluated_by": user.id,
                "evaluated_at": datetime.now(timezone.utc).isoformat(),
                "final_score": total_score
            }
        }
    )
    
    return {
        "message": "Proposal evaluated successfully",
        "evaluation": evaluation_data,
        "total_score": total_score
    }

@api_router.post("/tenders/{tender_id}/evaluate")
async def evaluate_all_proposals(tender_id: str, request: Request):
    """Get evaluation summary for all proposals in a tender"""
    await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.PROJECT_MANAGER])
    
    proposals = await db.proposals.find({"tender_id": tender_id}).to_list(1000)
    
    if not proposals:
        return {"message": "No proposals to evaluate", "proposals": []}
    
    # Calculate cost scores automatically based on lowest price
    min_price = min(p["financial_proposal"] for p in proposals if p.get("financial_proposal"))
    
    evaluated_proposals = []
    for proposal in proposals:
        # Auto-calculate cost score (lowest price gets 5, others scaled)
        if min_price > 0:
            cost_score = (min_price / proposal["financial_proposal"]) * 5
        else:
            cost_score = 3.0  # Default if no prices
        
        # Get vendor name
        vendor = await db.vendors.find_one({"id": proposal["vendor_id"]})
        vendor_name = vendor.get("name_english", vendor.get("company_name", "Unknown")) if vendor else "Unknown"
        
        evaluated_proposals.append({
            "proposal_id": proposal["id"],
            "vendor_id": proposal["vendor_id"],
            "vendor_name": vendor_name,
            "financial_proposal": proposal["financial_proposal"],
            "suggested_cost_score": round(cost_score, 2),
            "evaluation": proposal.get("evaluation"),
            "final_score": proposal.get("final_score", 0.0),
            "evaluated": proposal.get("evaluation") is not None
        })
    
    # Sort by final score descending
    evaluated_proposals.sort(key=lambda x: x["final_score"], reverse=True)
    
    return {
        "tender_id": tender_id,
        "total_proposals": len(proposals),
        "evaluated_count": sum(1 for p in proposals if p.get("evaluation")),
        "proposals": evaluated_proposals
    }

@api_router.post("/tenders/{tender_id}/award")
async def award_tender(tender_id: str, vendor_id: str, request: Request):
    """Award tender to vendor"""
    user = await require_role(request, [UserRole.PROJECT_MANAGER])
    
    # Update tender
    result = await db.tenders.update_one(
        {"id": tender_id},
        {
            "$set": {
                "status": TenderStatus.AWARDED.value,
                "awarded_to": vendor_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tender not found")
    
    return {"message": "Tender awarded", "vendor_id": vendor_id}

# ==================== CONTRACT ENDPOINTS ====================
@api_router.post("/contracts")
async def create_contract(contract: Contract, request: Request):
    """Create new contract - Auto-approved with generated number"""
    user = await require_role(request, [UserRole.PROCUREMENT_OFFICER])
    
    # Verify tender exists
    tender = await db.tenders.find_one({"id": contract.tender_id})
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    
    # Verify vendor exists
    vendor = await db.vendors.find_one({"id": contract.vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    contract.created_by = user.id
    
    # Auto-approve and generate contract number
    contract.status = ContractStatus.APPROVED
    contract.contract_number = await generate_number("Contract")
    
    contract_doc = contract.model_dump()
    contract_doc["start_date"] = contract_doc["start_date"].isoformat()
    contract_doc["end_date"] = contract_doc["end_date"].isoformat()
    contract_doc["created_at"] = contract_doc["created_at"].isoformat()
    contract_doc["updated_at"] = contract_doc["updated_at"].isoformat()
    
    await db.contracts.insert_one(contract_doc)
    
    # Return without MongoDB _id
    result = contract.model_dump()
    return result

@api_router.get("/contracts")
async def get_contracts(request: Request, status: Optional[ContractStatus] = None, search: Optional[str] = None):
    """Get all contracts with optional search by contract_number or title"""
    await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.PROJECT_MANAGER, UserRole.SYSTEM_ADMIN])
    
    query = {}
    if status:
        query["status"] = status.value
    
    # Add search functionality
    if search:
        query["$or"] = [
            {"contract_number": {"$regex": search, "$options": "i"}},
            {"title": {"$regex": search, "$options": "i"}}
        ]
    
    contracts = await db.contracts.find(query).to_list(1000)
    
    result = []
    for contract in contracts:
        # Remove MongoDB _id
        if '_id' in contract:
            del contract['_id']
        
        if isinstance(contract.get('start_date'), str):
            contract['start_date'] = datetime.fromisoformat(contract['start_date'])
        if isinstance(contract.get('end_date'), str):
            contract['end_date'] = datetime.fromisoformat(contract['end_date'])
        if isinstance(contract.get('created_at'), str):
            contract['created_at'] = datetime.fromisoformat(contract['created_at'])
        if isinstance(contract.get('updated_at'), str):
            contract['updated_at'] = datetime.fromisoformat(contract['updated_at'])
        
        result.append(contract)
    
    return result

@api_router.get("/contracts/{contract_id}")
async def get_contract(contract_id: str, request: Request):
    """Get contract by ID"""
    await require_auth(request)
    
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Remove MongoDB _id
    if '_id' in contract:
        del contract['_id']
    
    if isinstance(contract.get('start_date'), str):
        contract['start_date'] = datetime.fromisoformat(contract['start_date'])
    if isinstance(contract.get('end_date'), str):
        contract['end_date'] = datetime.fromisoformat(contract['end_date'])
    if isinstance(contract.get('created_at'), str):
        contract['created_at'] = datetime.fromisoformat(contract['created_at'])
    if isinstance(contract.get('updated_at'), str):
        contract['updated_at'] = datetime.fromisoformat(contract['updated_at'])
    
    return contract

@api_router.put("/contracts/{contract_id}/approve")
async def approve_contract(contract_id: str, request: Request):
    """Approve contract"""
    user = await require_role(request, [UserRole.PROJECT_MANAGER])
    
    result = await db.contracts.update_one(
        {"id": contract_id},
        {
            "$set": {
                "status": ContractStatus.APPROVED.value,
                "approved_by": user.id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    return {"message": "Contract approved"}

@api_router.get("/contracts/expiring")
async def get_expiring_contracts(request: Request, days: int = 30):
    """Get contracts expiring soon"""
    await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.PROJECT_MANAGER])
    
    expiry_date = datetime.now(timezone.utc) + timedelta(days=days)
    
    contracts = await db.contracts.find({
        "end_date": {
            "$gte": datetime.now(timezone.utc).isoformat(),
            "$lte": expiry_date.isoformat()
        },
        "status": ContractStatus.ACTIVE.value
    }).to_list(1000)
    
    for contract in contracts:
        if isinstance(contract.get('start_date'), str):
            contract['start_date'] = datetime.fromisoformat(contract['start_date'])
        if isinstance(contract.get('end_date'), str):
            contract['end_date'] = datetime.fromisoformat(contract['end_date'])
        if isinstance(contract.get('created_at'), str):
            contract['created_at'] = datetime.fromisoformat(contract['created_at'])
        if isinstance(contract.get('updated_at'), str):
            contract['updated_at'] = datetime.fromisoformat(contract['updated_at'])
    
    return contracts

# ==================== INVOICE ENDPOINTS ====================
@api_router.post("/invoices")
async def submit_invoice(invoice: Invoice, request: Request):
    """Submit invoice - Auto-approved with generated number"""
    await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN])
    
    # Verify contract exists
    contract = await db.contracts.find_one({"id": invoice.contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Auto-approve and generate invoice number
    invoice.status = InvoiceStatus.APPROVED
    invoice.invoice_number = await generate_number("Invoice")
    
    # vendor_id should be provided in the invoice object
    invoice_doc = invoice.model_dump()
    invoice_doc["submitted_at"] = invoice_doc["submitted_at"].isoformat()
    if invoice_doc.get("verified_at"):
        invoice_doc["verified_at"] = invoice_doc["verified_at"].isoformat()
    if invoice_doc.get("approved_at"):
        invoice_doc["approved_at"] = invoice_doc["approved_at"].isoformat()
    if invoice_doc.get("paid_at"):
        invoice_doc["paid_at"] = invoice_doc["paid_at"].isoformat()
    
    await db.invoices.insert_one(invoice_doc)
    
    # Notify procurement officers
    vendor = await db.vendors.find_one({"id": invoice.vendor_id})
    vendor_name = vendor.get("name_english", "Unknown") if vendor else "Unknown"
    
    procurement_users = await db.users.find({"role": UserRole.PROCUREMENT_OFFICER.value}).to_list(100)
    for po_user in procurement_users:
        notif = Notification(
            user_id=po_user["id"],
            title="New Invoice Submitted",
            message=f"Invoice {invoice.invoice_number} submitted for vendor {vendor_name}",
            type="approval"
        )
        notif_doc = notif.model_dump()
        notif_doc["created_at"] = notif_doc["created_at"].isoformat()
        await db.notifications.insert_one(notif_doc)
    
    return invoice.model_dump()

@api_router.get("/invoices")
async def get_invoices(request: Request, status: Optional[InvoiceStatus] = None, search: Optional[str] = None):
    """Get all invoices with optional search by invoice_number"""
    await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.PROJECT_MANAGER, UserRole.SYSTEM_ADMIN])
    
    query = {}
    if status:
        query["status"] = status.value
    
    # Add search functionality
    if search:
        query["$or"] = [
            {"invoice_number": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    invoices = await db.invoices.find(query).to_list(1000)
    
    result = []
    for invoice in invoices:
        # Remove MongoDB _id
        if '_id' in invoice:
            del invoice['_id']
        
        if isinstance(invoice.get('submitted_at'), str):
            invoice['submitted_at'] = datetime.fromisoformat(invoice['submitted_at'])
        if invoice.get('verified_at') and isinstance(invoice['verified_at'], str):
            invoice['verified_at'] = datetime.fromisoformat(invoice['verified_at'])
        if invoice.get('approved_at') and isinstance(invoice['approved_at'], str):
            invoice['approved_at'] = datetime.fromisoformat(invoice['approved_at'])
        if invoice.get('paid_at') and isinstance(invoice['paid_at'], str):
            invoice['paid_at'] = datetime.fromisoformat(invoice['paid_at'])
        
        result.append(invoice)
    
    return result

@api_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, request: Request):
    """Get invoice by ID"""
    await require_auth(request)
    
    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Remove MongoDB _id
    if '_id' in invoice:
        del invoice['_id']
    
    if isinstance(invoice.get('submitted_at'), str):
        invoice['submitted_at'] = datetime.fromisoformat(invoice['submitted_at'])
    if invoice.get('verified_at') and isinstance(invoice['verified_at'], str):
        invoice['verified_at'] = datetime.fromisoformat(invoice['verified_at'])
    if invoice.get('approved_at') and isinstance(invoice['approved_at'], str):
        invoice['approved_at'] = datetime.fromisoformat(invoice['approved_at'])
    if invoice.get('paid_at') and isinstance(invoice['paid_at'], str):
        invoice['paid_at'] = datetime.fromisoformat(invoice['paid_at'])
    
    return invoice

@api_router.put("/invoices/{invoice_id}/verify")
async def verify_invoice(invoice_id: str, request: Request):
    """Verify invoice (Procurement Officer)"""
    user = await require_role(request, [UserRole.PROCUREMENT_OFFICER])
    
    result = await db.invoices.update_one(
        {"id": invoice_id},
        {
            "$set": {
                "status": InvoiceStatus.VERIFIED.value,
                "verified_by": user.id,
                "verified_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"message": "Invoice verified"}

@api_router.put("/invoices/{invoice_id}/approve")
async def approve_invoice(invoice_id: str, request: Request):
    """Approve invoice (Project Manager)"""
    user = await require_role(request, [UserRole.PROJECT_MANAGER])
    
    result = await db.invoices.update_one(
        {"id": invoice_id},
        {
            "$set": {
                "status": InvoiceStatus.APPROVED.value,
                "approved_by": user.id,
                "approved_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"message": "Invoice approved"}

# ==================== DASHBOARD ENDPOINTS ====================
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(request: Request):
    """Get dashboard statistics"""
    await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.PROJECT_MANAGER, UserRole.SYSTEM_ADMIN])
    
    total_vendors = await db.vendors.count_documents({})
    approved_vendors = await db.vendors.count_documents({"status": VendorStatus.APPROVED.value})
    pending_vendors = await db.vendors.count_documents({"status": VendorStatus.PENDING.value})
    
    total_tenders = await db.tenders.count_documents({})
    active_tenders = await db.tenders.count_documents({"status": TenderStatus.PUBLISHED.value})
    
    total_contracts = await db.contracts.count_documents({})
    active_contracts = await db.contracts.count_documents({"status": ContractStatus.ACTIVE.value})
    
    total_invoices = await db.invoices.count_documents({})
    pending_invoices = await db.invoices.count_documents({"status": InvoiceStatus.PENDING.value})
    approved_invoices = await db.invoices.count_documents({"status": InvoiceStatus.APPROVED.value})
    
    return {
        "vendors": {
            "total": total_vendors,
            "approved": approved_vendors,
            "pending": pending_vendors
        },
        "tenders": {
            "total": total_tenders,
            "active": active_tenders
        },
        "contracts": {
            "total": total_contracts,
            "active": active_contracts
        },
        "invoices": {
            "total": total_invoices,
            "pending": pending_invoices,
            "approved": approved_invoices
        }
    }

@api_router.get("/dashboard/alerts")
async def get_dashboard_alerts(request: Request):
    """Get dashboard alerts"""
    await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.PROJECT_MANAGER, UserRole.SYSTEM_ADMIN])
    
    alerts = []
    
    # Pending vendor approvals
    pending_vendors_count = await db.vendors.count_documents({"status": VendorStatus.PENDING.value})
    if pending_vendors_count > 0:
        alerts.append({
            "type": "pending_approval",
            "message": f"{pending_vendors_count} vendor(s) pending approval",
            "count": pending_vendors_count
        })
    
    # Expiring contracts (next 30 days)
    expiry_date = datetime.now(timezone.utc) + timedelta(days=30)
    expiring_contracts = await db.contracts.count_documents({
        "end_date": {
            "$gte": datetime.now(timezone.utc).isoformat(),
            "$lte": expiry_date.isoformat()
        },
        "status": ContractStatus.ACTIVE.value
    })
    if expiring_contracts > 0:
        alerts.append({
            "type": "expiring_contract",
            "message": f"{expiring_contracts} contract(s) expiring in 30 days",
            "count": expiring_contracts
        })
    
    # Pending invoices
    pending_invoices_count = await db.invoices.count_documents({"status": InvoiceStatus.PENDING.value})
    if pending_invoices_count > 0:
        alerts.append({
            "type": "pending_invoice",
            "message": f"{pending_invoices_count} invoice(s) pending verification",
            "count": pending_invoices_count
        })
    
    return alerts

@api_router.get("/notifications")
async def get_notifications(request: Request):
    """Get user notifications"""
    user = await require_auth(request)
    
    notifications = await db.notifications.find({"user_id": user.id}).sort("created_at", -1).limit(50).to_list(50)
    
    for notif in notifications:
        if isinstance(notif.get('created_at'), str):
            notif['created_at'] = datetime.fromisoformat(notif['created_at'])
    
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, request: Request):
    """Mark notification as read"""
    user = await require_auth(request)
    
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": user.id},
        {"$set": {"read": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}

# ==================== BASIC ENDPOINTS ====================
@api_router.get("/")
async def root():
    return {"message": "Sourcevia Procurement Management System API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
