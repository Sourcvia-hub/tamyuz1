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
    company_name: str
    cr_number: str
    vat_number: str
    address: str
    contact_person: str
    contact_email: EmailStr
    contact_phone: str
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    risk_score: float = 0.0
    risk_category: RiskCategory = RiskCategory.LOW
    status: VendorStatus = VendorStatus.PENDING
    documents: List[str] = []
    evaluation_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Tender(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    project_name: str
    requirements: str
    budget: float
    deadline: datetime
    invited_vendors: List[str] = []  # vendor IDs
    status: TenderStatus = TenderStatus.DRAFT
    created_by: str  # user ID
    awarded_to: Optional[str] = None  # vendor ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Proposal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tender_id: str
    vendor_id: str
    technical_proposal: str
    financial_proposal: float
    technical_score: float = 0.0
    financial_score: float = 0.0
    final_score: float = 0.0
    documents: List[str] = []
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Contract(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tender_id: Optional[str] = None
    vendor_id: str
    contract_number: str
    title: str
    sow: str  # Statement of Work
    sla: str  # Service Level Agreement
    milestones: List[Dict[str, Any]] = []
    value: float
    start_date: datetime
    end_date: datetime
    is_outsourcing: bool = False
    status: ContractStatus = ContractStatus.DRAFT
    created_by: str  # user ID
    approved_by: Optional[str] = None  # user ID
    documents: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
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
@api_router.post("/vendors/register")
async def register_vendor(vendor: Vendor):
    """Public endpoint for vendor registration"""
    # Calculate risk score (simple example)
    risk_score = 0.0
    if not vendor.documents:
        risk_score += 30
    if not vendor.bank_name:
        risk_score += 20
    
    vendor.risk_score = risk_score
    if risk_score >= 50:
        vendor.risk_category = RiskCategory.HIGH
    elif risk_score >= 25:
        vendor.risk_category = RiskCategory.MEDIUM
    else:
        vendor.risk_category = RiskCategory.LOW
    
    vendor_doc = vendor.model_dump()
    vendor_doc["created_at"] = vendor_doc["created_at"].isoformat()
    vendor_doc["updated_at"] = vendor_doc["updated_at"].isoformat()
    
    await db.vendors.insert_one(vendor_doc)
    
    # Create notification for procurement officers
    procurement_users = await db.users.find({"role": UserRole.PROCUREMENT_OFFICER.value}).to_list(100)
    for user in procurement_users:
        notif = Notification(
            user_id=user["id"],
            title="New Vendor Registration",
            message=f"New vendor {vendor.company_name} has registered",
            type="info"
        )
        notif_doc = notif.model_dump()
        notif_doc["created_at"] = notif_doc["created_at"].isoformat()
        await db.notifications.insert_one(notif_doc)
    
    return vendor.model_dump()

@api_router.get("/vendors")
async def get_vendors(request: Request, status: Optional[VendorStatus] = None):
    """Get all vendors"""
    await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN])
    
    query = {}
    if status:
        query["status"] = status.value
    
    vendors = await db.vendors.find(query).to_list(1000)
    
    # Convert datetime strings
    for vendor in vendors:
        if isinstance(vendor.get('created_at'), str):
            vendor['created_at'] = datetime.fromisoformat(vendor['created_at'])
        if isinstance(vendor.get('updated_at'), str):
            vendor['updated_at'] = datetime.fromisoformat(vendor['updated_at'])
    
    return vendors

@api_router.get("/vendors/{vendor_id}")
async def get_vendor(vendor_id: str, request: Request):
    """Get vendor by ID"""
    await require_auth(request)
    
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    if isinstance(vendor.get('created_at'), str):
        vendor['created_at'] = datetime.fromisoformat(vendor['created_at'])
    if isinstance(vendor.get('updated_at'), str):
        vendor['updated_at'] = datetime.fromisoformat(vendor['updated_at'])
    
    return vendor

@api_router.put("/vendors/{vendor_id}/approve")
async def approve_vendor(vendor_id: str, request: Request):
    """Approve vendor"""
    user = await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN])
    
    result = await db.vendors.update_one(
        {"id": vendor_id},
        {
            "$set": {
                "status": VendorStatus.APPROVED.value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    return {"message": "Vendor approved"}

@api_router.put("/vendors/{vendor_id}/reject")
async def reject_vendor(vendor_id: str, request: Request):
    """Reject vendor"""
    user = await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN])
    
    result = await db.vendors.update_one(
        {"id": vendor_id},
        {
            "$set": {
                "status": VendorStatus.REJECTED.value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    return {"message": "Vendor rejected"}

# ==================== TENDER ENDPOINTS ====================
@api_router.post("/tenders")
async def create_tender(tender: Tender, request: Request):
    """Create new tender"""
    user = await require_role(request, [UserRole.PROCUREMENT_OFFICER])
    
    tender.created_by = user.id
    tender_doc = tender.model_dump()
    tender_doc["deadline"] = tender_doc["deadline"].isoformat()
    tender_doc["created_at"] = tender_doc["created_at"].isoformat()
    tender_doc["updated_at"] = tender_doc["updated_at"].isoformat()
    
    await db.tenders.insert_one(tender_doc)
    return tender.model_dump()

@api_router.get("/tenders")
async def get_tenders(request: Request, status: Optional[TenderStatus] = None):
    """Get all tenders"""
    user = await require_auth(request)
    
    query = {}
    if status:
        query["status"] = status.value
    
    # Vendors can only see tenders they're invited to
    if user.role == UserRole.VENDOR:
        # Find vendor ID for this user
        vendor = await db.vendors.find_one({"contact_email": user.email})
        if vendor:
            query["invited_vendors"] = vendor["id"]
        else:
            return []
    
    tenders = await db.tenders.find(query).to_list(1000)
    
    for tender in tenders:
        if isinstance(tender.get('deadline'), str):
            tender['deadline'] = datetime.fromisoformat(tender['deadline'])
        if isinstance(tender.get('created_at'), str):
            tender['created_at'] = datetime.fromisoformat(tender['created_at'])
        if isinstance(tender.get('updated_at'), str):
            tender['updated_at'] = datetime.fromisoformat(tender['updated_at'])
    
    return tenders

@api_router.get("/tenders/{tender_id}")
async def get_tender(tender_id: str, request: Request):
    """Get tender by ID"""
    await require_auth(request)
    
    tender = await db.tenders.find_one({"id": tender_id})
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    
    if isinstance(tender.get('deadline'), str):
        tender['deadline'] = datetime.fromisoformat(tender['deadline'])
    if isinstance(tender.get('created_at'), str):
        tender['created_at'] = datetime.fromisoformat(tender['created_at'])
    if isinstance(tender.get('updated_at'), str):
        tender['updated_at'] = datetime.fromisoformat(tender['updated_at'])
    
    return tender

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
    """Submit proposal for tender"""
    user = await require_role(request, [UserRole.VENDOR])
    
    # Get vendor for this user
    vendor = await db.vendors.find_one({"contact_email": user.email})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor profile not found")
    
    proposal.tender_id = tender_id
    proposal.vendor_id = vendor["id"]
    
    proposal_doc = proposal.model_dump()
    proposal_doc["submitted_at"] = proposal_doc["submitted_at"].isoformat()
    
    await db.proposals.insert_one(proposal_doc)
    return proposal.model_dump()

@api_router.get("/tenders/{tender_id}/proposals")
async def get_tender_proposals(tender_id: str, request: Request):
    """Get all proposals for a tender"""
    await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.PROJECT_MANAGER])
    
    proposals = await db.proposals.find({"tender_id": tender_id}).to_list(1000)
    
    for proposal in proposals:
        if isinstance(proposal.get('submitted_at'), str):
            proposal['submitted_at'] = datetime.fromisoformat(proposal['submitted_at'])
    
    return proposals

@api_router.post("/tenders/{tender_id}/evaluate")
async def evaluate_proposals(tender_id: str, request: Request):
    """Calculate weighted scores for all proposals"""
    await require_role(request, [UserRole.PROCUREMENT_OFFICER])
    
    proposals = await db.proposals.find({"tender_id": tender_id}).to_list(1000)
    
    if not proposals:
        return {"message": "No proposals to evaluate"}
    
    # Simple scoring logic
    # Technical: 0-100, Financial: lowest price gets 100, others scaled
    min_price = min(p["financial_proposal"] for p in proposals)
    
    for proposal in proposals:
        # Technical score (simplified - in reality would be manual)
        technical_score = 75.0  # Default score
        
        # Financial score (lower price = higher score)
        financial_score = (min_price / proposal["financial_proposal"]) * 100
        
        # Final weighted score (70% technical, 30% financial)
        final_score = (technical_score * 0.7) + (financial_score * 0.3)
        
        await db.proposals.update_one(
            {"id": proposal["id"]},
            {
                "$set": {
                    "technical_score": technical_score,
                    "financial_score": financial_score,
                    "final_score": final_score
                }
            }
        )
    
    return {"message": "Proposals evaluated"}

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
    """Create new contract"""
    user = await require_role(request, [UserRole.PROCUREMENT_OFFICER])
    
    contract.created_by = user.id
    contract_doc = contract.model_dump()
    contract_doc["start_date"] = contract_doc["start_date"].isoformat()
    contract_doc["end_date"] = contract_doc["end_date"].isoformat()
    contract_doc["created_at"] = contract_doc["created_at"].isoformat()
    contract_doc["updated_at"] = contract_doc["updated_at"].isoformat()
    
    await db.contracts.insert_one(contract_doc)
    return contract.model_dump()

@api_router.get("/contracts")
async def get_contracts(request: Request, status: Optional[ContractStatus] = None):
    """Get all contracts"""
    user = await require_auth(request)
    
    query = {}
    if status:
        query["status"] = status.value
    
    # Vendors can only see their own contracts
    if user.role == UserRole.VENDOR:
        vendor = await db.vendors.find_one({"contact_email": user.email})
        if vendor:
            query["vendor_id"] = vendor["id"]
        else:
            return []
    
    contracts = await db.contracts.find(query).to_list(1000)
    
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

@api_router.get("/contracts/{contract_id}")
async def get_contract(contract_id: str, request: Request):
    """Get contract by ID"""
    await require_auth(request)
    
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
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
    """Submit invoice"""
    user = await require_role(request, [UserRole.VENDOR])
    
    # Get vendor for this user
    vendor = await db.vendors.find_one({"contact_email": user.email})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor profile not found")
    
    invoice.vendor_id = vendor["id"]
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
    procurement_users = await db.users.find({"role": UserRole.PROCUREMENT_OFFICER.value}).to_list(100)
    for po_user in procurement_users:
        notif = Notification(
            user_id=po_user["id"],
            title="New Invoice Submitted",
            message=f"Invoice {invoice.invoice_number} submitted by {vendor['company_name']}",
            type="approval"
        )
        notif_doc = notif.model_dump()
        notif_doc["created_at"] = notif_doc["created_at"].isoformat()
        await db.notifications.insert_one(notif_doc)
    
    return invoice.model_dump()

@api_router.get("/invoices")
async def get_invoices(request: Request, status: Optional[InvoiceStatus] = None):
    """Get all invoices"""
    user = await require_auth(request)
    
    query = {}
    if status:
        query["status"] = status.value
    
    # Vendors can only see their own invoices
    if user.role == UserRole.VENDOR:
        vendor = await db.vendors.find_one({"contact_email": user.email})
        if vendor:
            query["vendor_id"] = vendor["id"]
        else:
            return []
    
    invoices = await db.invoices.find(query).to_list(1000)
    
    for invoice in invoices:
        if isinstance(invoice.get('submitted_at'), str):
            invoice['submitted_at'] = datetime.fromisoformat(invoice['submitted_at'])
        if invoice.get('verified_at') and isinstance(invoice['verified_at'], str):
            invoice['verified_at'] = datetime.fromisoformat(invoice['verified_at'])
        if invoice.get('approved_at') and isinstance(invoice['approved_at'], str):
            invoice['approved_at'] = datetime.fromisoformat(invoice['approved_at'])
        if invoice.get('paid_at') and isinstance(invoice['paid_at'], str):
            invoice['paid_at'] = datetime.fromisoformat(invoice['paid_at'])
    
    return invoices

@api_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, request: Request):
    """Get invoice by ID"""
    await require_auth(request)
    
    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
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
