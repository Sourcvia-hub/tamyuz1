from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request, status
from fastapi.responses import JSONResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import aiohttp
from enum import Enum
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from io import BytesIO
from ai_helpers import (
    analyze_vendor_scoring,
    analyze_tender_proposal,
    analyze_contract_classification,
    analyze_po_items,
    match_invoice_to_milestone
)


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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
    REQUESTER = "requester"
    PD_OFFICER = "pd_officer"
    PD_MANAGER = "pd_manager"
    ADMIN = "admin"
    # Legacy roles (keeping for backwards compatibility)
    PROCUREMENT_OFFICER = "procurement_officer"
    PROJECT_MANAGER = "project_manager"
    SYSTEM_ADMIN = "system_admin"

class VendorType(str, Enum):
    LOCAL = "local"
    INTERNATIONAL = "international"

class VendorStatus(str, Enum):
    PENDING = "pending"
    PENDING_DUE_DILIGENCE = "pending_due_diligence"
    APPROVED = "approved"
    REJECTED = "rejected"
    BLACKLISTED = "blacklisted"

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
    PENDING_DUE_DILIGENCE = "pending_due_diligence"
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
    vendor_type: VendorType = VendorType.LOCAL  # International or Local
    
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
    
    # Due Diligence Questionnaire (required for high risk vendors or outsourcing/cloud contracts)
    dd_required: bool = False  # Set to true when due diligence is needed
    dd_completed: bool = False
    dd_completed_by: Optional[str] = None
    dd_completed_at: Optional[datetime] = None
    dd_approved_by: Optional[str] = None
    dd_approved_at: Optional[datetime] = None
    
    # Ownership Structure / General
    dd_ownership_change_last_year: Optional[bool] = None
    dd_location_moved_or_closed: Optional[bool] = None
    dd_new_branches_opened: Optional[bool] = None
    dd_financial_obligations_default: Optional[bool] = None
    dd_shareholding_in_bank: Optional[bool] = None
    
    # Business Continuity (27 questions)
    dd_bc_rely_on_third_parties: Optional[bool] = None
    dd_bc_intend_to_outsource: Optional[bool] = None
    dd_bc_business_stopped_over_week: Optional[bool] = None
    dd_bc_alternative_locations: Optional[bool] = None
    dd_bc_site_readiness_test_frequency: Optional[str] = None
    dd_bc_certified_standard: Optional[bool] = None
    dd_bc_staff_assigned: Optional[bool] = None
    dd_bc_risks_assessed: Optional[bool] = None
    dd_bc_threats_identified: Optional[bool] = None
    dd_bc_essential_activities_identified: Optional[bool] = None
    dd_bc_strategy_exists: Optional[bool] = None
    dd_bc_emergency_responders_engaged: Optional[bool] = None
    dd_bc_arrangements_updated: Optional[bool] = None
    dd_bc_documented_strategy: Optional[bool] = None
    dd_bc_can_provide_exercise_info: Optional[bool] = None
    dd_bc_exercise_results_used: Optional[bool] = None
    dd_bc_management_trained: Optional[bool] = None
    dd_bc_staff_aware: Optional[bool] = None
    dd_bc_it_continuity_plan: Optional[bool] = None
    dd_bc_critical_data_backed_up: Optional[bool] = None
    dd_bc_vital_documents_offsite: Optional[bool] = None
    dd_bc_critical_suppliers_identified: Optional[bool] = None
    dd_bc_suppliers_consulted: Optional[bool] = None
    dd_bc_communication_method: Optional[bool] = None
    dd_bc_public_relations_capability: Optional[bool] = None
    
    # Anti-Fraud
    dd_fraud_whistle_blowing_mechanism: Optional[bool] = None
    dd_fraud_prevention_procedures: Optional[bool] = None
    dd_fraud_internal_last_year: Optional[bool] = None
    dd_fraud_burglary_theft_last_year: Optional[bool] = None
    
    # Operational Risks
    dd_op_criminal_cases_last_3years: Optional[bool] = None
    dd_op_financial_issues_last_3years: Optional[bool] = None
    dd_op_documented_procedures: Optional[bool] = None
    dd_op_internal_audit: Optional[bool] = None
    dd_op_specific_license_required: Optional[bool] = None
    dd_op_services_outside_ksa: Optional[bool] = None
    dd_op_conflict_of_interest_policy: Optional[bool] = None
    dd_op_complaint_handling_procedures: Optional[bool] = None
    dd_op_customer_complaints_last_year: Optional[bool] = None
    dd_op_insurance_contracts: Optional[bool] = None
    
    # Cyber Security
    dd_cyber_cloud_services: Optional[bool] = None
    dd_cyber_data_outside_ksa: Optional[bool] = None
    dd_cyber_remote_access_outside_ksa: Optional[bool] = None
    dd_cyber_digital_channels: Optional[bool] = None
    dd_cyber_card_payments: Optional[bool] = None
    dd_cyber_third_party_access: Optional[bool] = None
    
    # Safety and Security
    dd_safety_procedures_exist: Optional[bool] = None
    dd_safety_security_24_7: Optional[bool] = None
    dd_safety_security_equipment: Optional[bool] = None
    dd_safety_equipment: Optional[bool] = None
    
    # Human Resources
    dd_hr_localization_policy: Optional[bool] = None
    dd_hr_hiring_standards: Optional[bool] = None
    dd_hr_background_investigation: Optional[bool] = None
    dd_hr_academic_verification: Optional[bool] = None
    
    # Judicial / Legal
    dd_legal_formal_representation: Optional[bool] = None
    
    # Regulatory Authorities
    dd_reg_regulated_by_authority: Optional[bool] = None
    dd_reg_audited_by_independent: Optional[bool] = None
    
    # Conflict of Interest
    dd_coi_relationship_with_bank: Optional[bool] = None
    
    # Data Management
    dd_data_customer_data_policy: Optional[bool] = None
    
    # Financial Consumer Protection
    dd_fcp_read_and_understood: Optional[bool] = None
    dd_fcp_will_comply: Optional[bool] = None
    
    # Additional Details
    dd_additional_details: Optional[str] = None
    
    # Final Checklist
    dd_checklist_supporting_documents: Optional[bool] = None
    dd_checklist_related_party_checked: Optional[bool] = None
    dd_checklist_sanction_screening: Optional[bool] = None

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
    is_noc: bool = False  # NOC (No Objection Certificate) required
    status: ContractStatus = ContractStatus.DRAFT
    terminated: bool = False
    terminated_by: Optional[str] = None
    terminated_at: Optional[datetime] = None
    termination_reason: Optional[str] = None
    created_by: Optional[str] = None  # user ID who created
    approved_by: Optional[str] = None  # user ID
    documents: List[str] = []
    
    # Outsourcing Assessment Questionnaire
    # Section A: Outsourcing Determination
    a1_continuing_basis: Optional[bool] = None
    a1_period: Optional[str] = None
    a2_could_be_undertaken_by_bank: Optional[bool] = None
    a3_is_insourcing_contract: Optional[bool] = None
    a4_market_data_providers: Optional[bool] = None
    a4_clearing_settlement: Optional[bool] = None
    a4_correspondent_banking: Optional[bool] = None
    a4_utilities: Optional[bool] = None
    a5_cloud_hosted: Optional[bool] = None
    
    # Calculated classification based on Section A
    outsourcing_classification: Optional[str] = None  # "not_outsourcing", "outsourcing", "insourcing", "exempted", "cloud_computing"
    
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
    invoice_number: Optional[str] = None  # User-provided or auto-generated (e.g., Invoice-25-0001)
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

class POStatus(str, Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    CONVERTED_TO_CONTRACT = "converted_to_contract"
    CANCELLED = "cancelled"

class POItem(BaseModel):
    name: str
    description: str
    quantity: float
    price: float
    total: float

class PurchaseOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    po_number: Optional[str] = None  # Auto-generated (e.g., PO-25-0001)
    tender_id: Optional[str] = None  # Optional tender selection
    vendor_id: str
    items: List[POItem] = []
    total_amount: float = 0.0
    delivery_time: Optional[str] = None
    
    # Risk Assessment Questions
    risk_level: str  # From vendor risk
    has_data_access: bool = False
    has_onsite_presence: bool = False
    has_implementation: bool = False
    duration_more_than_year: bool = False
    amount_over_million: bool = False  # Auto-calculated
    
    requires_contract: bool = False  # True if any risk question is yes
    converted_to_contract: bool = False
    contract_id: Optional[str] = None
    
    status: POStatus = POStatus.DRAFT
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WorkType(str, Enum):
    ON_PREMISES = "on_premises"
    OFFSHORE = "offshore"

class ResourceStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    TERMINATED = "terminated"

class Relative(BaseModel):
    name: str
    position: str
    department: str
    relation: str

class Resource(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    resource_number: Optional[str] = None  # Auto-generated
    
    # Contract & Vendor Info
    contract_id: str
    vendor_id: str
    contract_name: Optional[str] = None
    scope: Optional[str] = None
    sla: Optional[str] = None
    contract_duration: Optional[str] = None
    vendor_name: Optional[str] = None
    
    # Resource Details
    name: str
    photo: Optional[str] = None  # URL or path
    nationality: str
    id_number: str
    education_qualification: str
    years_of_experience: float
    work_type: WorkType
    
    # Duration
    start_date: datetime
    end_date: datetime
    
    # Requested Access
    access_development: bool = False
    access_production: bool = False
    access_uat: bool = False
    
    # Scope of Work
    scope_of_work: str
    
    # Relatives Declaration
    has_relatives: bool = False
    relatives: List[Relative] = []
    
    status: ResourceStatus = ResourceStatus.ACTIVE
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    """Hash password using bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash"""
    return pwd_context.verify(plain_password, hashed_password)

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

def determine_outsourcing_classification(contract_data: dict) -> str:
    """
    Determine outsourcing classification based on Section A questionnaire responses.
    
    Priority order:
    1. If A5 = YES → "cloud_computing"
    2. If any A4 checkbox = YES → "exempted"
    3. If A3 = YES → "insourcing"
    4. If A1 = YES AND A2 = YES → "outsourcing"
    5. If all Section A = NO → "not_outsourcing"
    """
    # Priority 1: Cloud Computing (overrides everything)
    if contract_data.get('a5_cloud_hosted') is True:
        return "cloud_computing"
    
    # Priority 2: Exempted (any A4 checkbox is True)
    if (contract_data.get('a4_market_data_providers') is True or
        contract_data.get('a4_clearing_settlement') is True or
        contract_data.get('a4_correspondent_banking') is True or
        contract_data.get('a4_utilities') is True):
        return "exempted"
    
    # Priority 3: Insourcing (overrides A1 and A2)
    if contract_data.get('a3_is_insourcing_contract') is True:
        return "insourcing"
    
    # Priority 4: Outsourcing (A1 AND A2 both YES)
    if (contract_data.get('a1_continuing_basis') is True and
        contract_data.get('a2_could_be_undertaken_by_bank') is True):
        return "outsourcing"
    
    # Default: Not outsourcing
    return "not_outsourcing"

def determine_noc_requirement(contract_data: dict, vendor_type: str) -> bool:
    """
    Determine if NOC (No Objection Certificate) is required for a contract.
    
    NOC required when:
    1. Outsourcing contract with ANY yes on Section B assessment, OR
    2. Cloud computing contract, OR  
    3. Outsourcing contract with international vendor only
    """
    classification = contract_data.get('outsourcing_classification', '')
    
    # Check if cloud computing - always requires NOC
    if classification == 'cloud_computing':
        return True
    
    # For outsourcing contracts
    if classification == 'outsourcing':
        # Check if vendor is international
        if vendor_type == 'international':
            return True
        
        # Check if ANY Section B question is YES
        section_b_fields = [
            'b1_material_impact_if_disrupted',
            'b2_financial_impact',
            'b3_reputational_impact',
            'b4_outside_ksa',
            'b5_difficult_alternative',
            'b6_data_transfer',
            'b7_affiliation_relationship',
            'b8_regulated_activity'
        ]
        
        for field in section_b_fields:
            if contract_data.get(field) is True:
                return True
    
    return False

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

def calculate_due_diligence_score(vendor_data: dict) -> dict:
    """
    Calculate due diligence score based on 60+ Yes/No questions.
    1 point for each "Yes" answer (some questions are reverse-scored).
    Returns: dict with score, percentage, and risk_category
    """
    score = 0
    total_questions = 64
    
    # POSITIVE SCORING (Yes = +1 point) - Good practices
    positive_fields = [
        'dd_location_moved_closed',  # Has alternative locations
        'dd_vendor_opened_branches',  # Growth indicator
        'dd_bc_alternative_locations',
        'dd_bc_test_continuity_regularly',
        'dd_bc_certified_standard',
        'dd_bc_dedicated_staff',
        'dd_bc_risk_assessment_done',
        'dd_bc_essential_activities_identified',
        'dd_bc_strategy_exists',
        'dd_bc_emergency_responders',
        'dd_bc_update_arrangements',
        'dd_bc_exercising_strategy',
        'dd_bc_evidence_of_tests',
        'dd_bc_test_results_improve',
        'dd_bc_management_trained',
        'dd_bc_staff_aware',
        'dd_bc_it_continuity_plan',
        'dd_bc_data_backed_up_offsite',
        'dd_bc_vital_documents_backed_up',
        'dd_bc_critical_suppliers_identified',
        'dd_bc_coordinated_with_suppliers',
        'dd_bc_communication_method',
        'dd_bc_pr_crisis_management',
        'dd_fraud_whistleblowing_mechanism',
        'dd_fraud_prevention_procedures',
        'dd_op_documented_procedures',
        'dd_op_internal_audit',
        'dd_op_coi_policies',
        'dd_op_complaint_handling',
        'dd_op_insurance_contracts',
        'dd_cyber_security_procedures',
        'dd_safety_security_24_7',
        'dd_safety_cctv_equipment',
        'dd_safety_fire_exits_equipment',
        'dd_hr_localization_policy',
        'dd_hr_hiring_policy',
        'dd_hr_background_investigation',
        'dd_hr_academic_verification',
        'dd_op_financial_statements_audited',
        'dd_data_management_policy',
        'dd_sama_consumer_protection_understanding',
        'dd_sama_consumer_protection_compliance',
    ]
    
    # NEGATIVE SCORING (Yes = -1 point) - Red flags
    negative_fields = [
        'dd_ownership_change_last_year',  # Instability
        'dd_bc_exposed_to_events',  # Past disruptions
        'dd_conflicts_of_interest',
        'dd_bc_rely_on_third_parties',  # Dependency risk
        'dd_bc_plan_to_subcontract',
        'dd_fraud_internal_last_year',
        'dd_fraud_burglary_theft_last_year',
        'dd_op_criminal_cases_last_3years',
        'dd_op_customer_complaints_last_year',
        'dd_cloud_services',  # Potential risk
        'dd_cyber_data_outside_ksa',
        'dd_cyber_remote_access_outside_ksa',
        'dd_cyber_digital_channel_services',
        'dd_cyber_card_payment_services',
        'dd_cyber_third_party_access',
        'dd_op_legal_public_representation',
        'dd_op_activities_regulated',
        'dd_related_party_to_bank',
    ]
    
    # NEUTRAL (Yes/No both acceptable) - Informational only
    neutral_fields = [
        'dd_op_specific_license_required',
        'dd_op_services_outside_ksa',
    ]
    
    # Calculate positive points
    for field in positive_fields:
        if vendor_data.get(field) is True:
            score += 1
    
    # Calculate negative points (reverse scoring)
    for field in negative_fields:
        if vendor_data.get(field) is False:  # No red flag = good
            score += 1
    
    percentage = (score / total_questions) * 100
    
    # Determine risk category based on percentage
    if percentage >= 75:
        risk_category = 'low'
    elif percentage >= 50:
        risk_category = 'medium'
    elif percentage >= 30:
        risk_category = 'high'
    else:
        risk_category = 'very_high'
    
    return {
        'score': score,
        'total': total_questions,
        'percentage': round(percentage, 2),
        'risk_category': risk_category
    }

def calculate_dd_risk_adjustment(vendor_data: dict) -> float:
    """
    Calculate risk score adjustment based on Due Diligence responses.
    Uses new Yes/No scoring system.
    Returns risk score from 0-100.
    """
    dd_result = calculate_due_diligence_score(vendor_data)
    
    # Convert percentage to risk score (inverse)
    # Higher percentage = lower risk score
    risk_score = 100 - dd_result['percentage']
    
    return risk_score

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
        secure=True,
        samesite="lax",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    # Remove password from response
    user_dict = user.model_dump()
    user_dict.pop('password', None)
    
    return {"user": user_dict}

@api_router.post("/auth/auto-login")
async def auto_login(response: Response):
    """
    Auto-login endpoint that creates a session for the default user without credentials.
    This allows users to access the application without manual login.
    """
    # Use default procurement officer account
    default_email = "procurement@test.com"
    
    # Find default user
    user_doc = await db.users.find_one({"email": default_email})
    if not user_doc:
        raise HTTPException(status_code=500, detail="Default user not found")
    
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
        secure=True,
        samesite="lax",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    # Remove password from response
    user_dict = user.model_dump()
    user_dict.pop('password', None)
    
    return {"user": user_dict, "message": "Auto-login successful"}

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

# ==================== DASHBOARD ENDPOINT ====================

@api_router.get("/dashboard")
async def get_dashboard_stats(request: Request):
    """Get dashboard statistics for all modules"""
    await require_auth(request)
    
    # Vendor Statistics
    all_vendors = await db.vendors.count_documents({})
    active_vendors = await db.vendors.count_documents({"status": VendorStatus.APPROVED.value})
    high_risk_vendors = await db.vendors.count_documents({"risk_category": "high"})
    waiting_due_diligence = await db.vendors.count_documents({"status": VendorStatus.PENDING_DUE_DILIGENCE.value})
    inactive_vendors = await db.vendors.count_documents({"status": VendorStatus.REJECTED.value})
    blacklisted_vendors = await db.vendors.count_documents({"status": VendorStatus.BLACKLISTED.value})
    
    # Tender Statistics
    all_tenders = await db.tenders.count_documents({})
    active_tenders = await db.tenders.count_documents({"status": TenderStatus.PUBLISHED.value})
    
    # Waiting for proposals - published tenders with no proposals or few proposals
    published_tenders = await db.tenders.find({"status": TenderStatus.PUBLISHED.value}).to_list(1000)
    waiting_proposals_count = 0
    waiting_evaluation_count = 0
    
    for tender in published_tenders:
        proposals = await db.proposals.find({"tender_id": tender["id"]}).to_list(1000)
        if len(proposals) == 0:
            waiting_proposals_count += 1
        else:
            # Check if any proposals are not evaluated
            unevaluated = [p for p in proposals if not p.get('evaluation')]
            if len(unevaluated) > 0:
                waiting_evaluation_count += 1
    
    approved_tenders = await db.tenders.count_documents({"status": TenderStatus.AWARDED.value})
    
    # Contract Statistics
    all_contracts = await db.contracts.count_documents({})
    # Active contracts = approved + draft (not expired or pending)
    active_contracts = await db.contracts.count_documents({
        "status": {"$in": [ContractStatus.APPROVED.value, ContractStatus.DRAFT.value]}
    })
    
    # Outsourcing, Cloud, and NOC contracts
    outsourcing_contracts = await db.contracts.count_documents({"outsourcing_classification": "outsourcing"})
    cloud_contracts = await db.contracts.count_documents({"outsourcing_classification": "cloud_computing"})
    noc_contracts = await db.contracts.count_documents({"is_noc": True})
    expired_contracts = await db.contracts.count_documents({"status": ContractStatus.EXPIRED.value})
    
    # Invoice Statistics
    all_invoices = await db.invoices.count_documents({})
    
    # Due invoices - pending or verified status
    due_invoices = await db.invoices.count_documents({
        "status": {"$in": [InvoiceStatus.PENDING.value, InvoiceStatus.VERIFIED.value, InvoiceStatus.APPROVED.value]}
    })
    
    # Purchase Order Statistics
    all_pos = await db.purchase_orders.count_documents({})
    issued_pos = await db.purchase_orders.count_documents({"status": "issued"})
    converted_pos = await db.purchase_orders.count_documents({"status": "converted_to_contract"})
    
    # Calculate total PO value
    pos = await db.purchase_orders.find({}).to_list(1000)
    total_po_value = sum(po.get('total_amount', 0) for po in pos)
    
    return {
        "vendors": {
            "all": all_vendors,
            "active": active_vendors,
            "high_risk": high_risk_vendors,
            "waiting_due_diligence": waiting_due_diligence,
            "inactive": inactive_vendors,
            "blacklisted": blacklisted_vendors
        },
        "tenders": {
            "all": all_tenders,
            "active": active_tenders,
            "waiting_proposals": waiting_proposals_count,
            "waiting_evaluation": waiting_evaluation_count,
            "approved": approved_tenders
        },
        "contracts": {
            "all": all_contracts,
            "active": active_contracts,
            "outsourcing": outsourcing_contracts,
            "cloud": cloud_contracts,
            "noc": noc_contracts,
            "expired": expired_contracts
        },
        "invoices": {
            "all": all_invoices,
            "due": due_invoices
        },
        "resources": {
            "all": await db.resources.count_documents({}),
            "active": await db.resources.count_documents({"status": ResourceStatus.ACTIVE.value}),
            "offshore": await db.resources.count_documents({"work_type": WorkType.OFFSHORE.value}),
            "on_premises": await db.resources.count_documents({"work_type": WorkType.ON_PREMISES.value})
        },
        "purchase_orders": {
            "all": all_pos,
            "issued": issued_pos,
            "converted": converted_pos,
            "total_value": total_po_value
        }
    }

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
    
    # Check if Due Diligence checklist items are provided (from vendor creation)
    checklist_items_present = any([
        vendor.dd_checklist_supporting_documents is not None,
        vendor.dd_checklist_related_party_checked is not None,
        vendor.dd_checklist_sanction_screening is not None,
    ])
    
    # Check if actual DD fields are provided (indicating completed DD during creation)
    dd_fields_present = any([
        vendor.dd_ownership_change_last_year is not None,
        vendor.dd_location_moved_or_closed is not None,
        vendor.dd_bc_rely_on_third_parties is not None,
        vendor.dd_bc_strategy_exists is not None,
        vendor.dd_fraud_internal_last_year is not None,
        vendor.dd_op_criminal_cases_last_3years is not None,
        vendor.dd_hr_background_investigation is not None,
        vendor.dd_safety_procedures_exist is not None
    ])
    
    if dd_fields_present:
        # DD fields provided during creation - mark as completed and approved
        vendor.status = VendorStatus.APPROVED
        vendor.dd_completed = True
        vendor.dd_completed_by = user.id
        vendor.dd_completed_at = datetime.now(timezone.utc)
        vendor.dd_approved_by = user.id
        vendor.dd_approved_at = datetime.now(timezone.utc)
        
        # Recalculate risk score based on DD responses
        vendor_dict = vendor.model_dump()
        dd_adjustment = calculate_dd_risk_adjustment(vendor_dict)
        new_risk_score = max(0, vendor.risk_score + dd_adjustment)
        vendor.risk_score = new_risk_score
        
        # Update risk category based on new score
        if new_risk_score >= 50:
            vendor.risk_category = RiskCategory.HIGH
        elif new_risk_score >= 25:
            vendor.risk_category = RiskCategory.MEDIUM
        else:
            vendor.risk_category = RiskCategory.LOW
    elif checklist_items_present:
        # Only checklist items present - vendor requires DD completion later
        vendor.status = VendorStatus.PENDING_DUE_DILIGENCE
        vendor.dd_completed = False  # Not completed yet, just flagged for DD
    else:
        # No checklist items or DD fields - vendor is approved directly
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

# ==================== DUE DILIGENCE ENDPOINTS ====================

@api_router.put("/vendors/{vendor_id}/due-diligence")
async def update_vendor_due_diligence(vendor_id: str, dd_data: dict, request: Request):
    """Update vendor due diligence questionnaire - Auto-approves and recalculates risk"""
    user = await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN])
    
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Add all dd_ fields from dd_data
    for key, value in dd_data.items():
        if key.startswith('dd_'):
            vendor[key] = value
    
    # Recalculate risk score based on DD responses
    base_risk = vendor.get('risk_score', 0.0)
    dd_adjustment = calculate_dd_risk_adjustment(vendor)
    new_risk_score = max(0, base_risk + dd_adjustment)
    
    # Determine new risk category
    if new_risk_score >= 50:
        new_risk_category = RiskCategory.HIGH.value
    elif new_risk_score >= 25:
        new_risk_category = RiskCategory.MEDIUM.value
    else:
        new_risk_category = RiskCategory.LOW.value
    
    # Update all dd_ prefixed fields and auto-approve
    update_fields = {
        "dd_completed": True,
        "dd_completed_by": user.id,
        "dd_completed_at": datetime.now(timezone.utc).isoformat(),
        "dd_approved_by": user.id,
        "dd_approved_at": datetime.now(timezone.utc).isoformat(),
        "status": VendorStatus.APPROVED.value,
        "risk_score": new_risk_score,
        "risk_category": new_risk_category,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add all dd_ fields from dd_data
    for key, value in dd_data.items():
        if key.startswith('dd_'):
            update_fields[key] = value
    
    await db.vendors.update_one(
        {"id": vendor_id},
        {"$set": update_fields}
    )
    
    # Auto-approve all pending contracts for this vendor
    await db.contracts.update_many(
        {
            "vendor_id": vendor_id,
            "status": ContractStatus.PENDING_DUE_DILIGENCE.value
        },
        {"$set": {
            "status": ContractStatus.APPROVED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Due diligence completed and auto-approved. Vendor and contracts status updated.",
        "new_risk_score": new_risk_score,
        "new_risk_category": new_risk_category
    }

@api_router.post("/vendors/{vendor_id}/due-diligence/approve")
async def approve_vendor_due_diligence(vendor_id: str, request: Request):
    """Approve vendor due diligence and change status back to approved"""
    user = await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN])
    
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    if not vendor.get('dd_completed'):
        raise HTTPException(status_code=400, detail="Due diligence not completed yet")
    
    # Update vendor status to approved and set approval info
    await db.vendors.update_one(
        {"id": vendor_id},
        {"$set": {
            "status": VendorStatus.APPROVED.value,
            "dd_approved_by": user.id,
            "dd_approved_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update all contracts for this vendor from pending_due_diligence to approved
    await db.contracts.update_many(
        {
            "vendor_id": vendor_id,
            "status": ContractStatus.PENDING_DUE_DILIGENCE.value
        },
        {"$set": {
            "status": ContractStatus.APPROVED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Due diligence approved successfully. Vendor and contracts status updated."}

@api_router.post("/vendors/{vendor_id}/blacklist")
async def blacklist_vendor(vendor_id: str, request: Request):
    """Blacklist a vendor - PD Officer or Admin only"""
    user = await require_role(request, [UserRole.PD_OFFICER, UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN])
    
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Update vendor status to blacklisted
    await db.vendors.update_one(
        {"id": vendor_id},
        {"$set": {
            "status": VendorStatus.BLACKLISTED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Terminate all active contracts for this vendor
    await db.contracts.update_many(
        {
            "vendor_id": vendor_id,
            "status": {"$in": [ContractStatus.ACTIVE.value, ContractStatus.APPROVED.value]}
        },
        {"$set": {
            "terminated": True,
            "terminated_by": user.id,
            "terminated_at": datetime.now(timezone.utc).isoformat(),
            "termination_reason": "Vendor blacklisted",
            "status": ContractStatus.EXPIRED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Vendor blacklisted and all active contracts terminated"}

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
    
    # Generate contract number
    contract.contract_number = await generate_number("Contract")
    
    # Calculate outsourcing classification based on questionnaire
    contract_doc = contract.model_dump()
    contract.outsourcing_classification = determine_outsourcing_classification(contract_doc)
    contract_doc["outsourcing_classification"] = contract.outsourcing_classification
    
    # Determine NOC requirement
    vendor_type = vendor.get('vendor_type', 'local')
    contract.is_noc = determine_noc_requirement(contract_doc, vendor_type)
    contract_doc["is_noc"] = contract.is_noc
    
    # Check if Due Diligence is required
    vendor_risk = vendor.get('risk_category', 'low')
    vendor_status = vendor.get('status', 'approved')
    classification = contract.outsourcing_classification
    vendor_dd_completed = vendor.get('dd_completed', False)
    
    requires_due_diligence = (
        vendor_risk == 'high' or 
        classification == 'outsourcing' or 
        classification == 'cloud_computing'
    )
    
    # Check if vendor DD is pending or not completed
    vendor_dd_pending = (
        vendor_status == VendorStatus.PENDING_DUE_DILIGENCE.value or 
        (requires_due_diligence and not vendor_dd_completed)
    )
    
    if vendor_dd_pending:
        # Set contract to pending_due_diligence status
        contract.status = ContractStatus.PENDING_DUE_DILIGENCE
        contract_doc["status"] = ContractStatus.PENDING_DUE_DILIGENCE.value
        
        # Update vendor to require and pending due diligence (if not already set)
        if vendor_status != VendorStatus.PENDING_DUE_DILIGENCE.value:
            await db.vendors.update_one(
                {"id": contract.vendor_id},
                {"$set": {
                    "status": VendorStatus.PENDING_DUE_DILIGENCE.value,
                    "dd_required": True
                }}
            )
    else:
        # Auto-approve if no due diligence required or already completed
        contract.status = ContractStatus.APPROVED
        contract_doc["status"] = ContractStatus.APPROVED.value
    
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
    now = datetime.now(timezone.utc)
    
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
        
        # Auto-mark expired contracts
        if (contract.get('end_date') and 
            contract['end_date'] < now and 
            contract.get('status') not in [ContractStatus.EXPIRED.value] and
            not contract.get('terminated')):
            await db.contracts.update_one(
                {"id": contract['id']},
                {"$set": {
                    "status": ContractStatus.EXPIRED.value,
                    "updated_at": now.isoformat()
                }}
            )
            contract['status'] = ContractStatus.EXPIRED.value
        
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

@api_router.post("/contracts/{contract_id}/terminate")
async def terminate_contract(contract_id: str, request: Request, reason: str = "Manual termination"):
    """Terminate a contract - PD Officer or Admin only"""
    user = await require_role(request, [UserRole.PD_OFFICER, UserRole.ADMIN, UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN])
    
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Update contract to terminated and expired
    result = await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {
            "terminated": True,
            "terminated_by": user.id,
            "terminated_at": datetime.now(timezone.utc).isoformat(),
            "termination_reason": reason,
            "status": ContractStatus.EXPIRED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Contract terminated successfully"}

@api_router.put("/contracts/{contract_id}")
async def update_contract(contract_id: str, contract_data: dict, request: Request):
    """Update contract details"""
    user = await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN, UserRole.PD_OFFICER, UserRole.ADMIN])
    
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Only allow updating certain fields
    allowed_fields = ['title', 'sow', 'sla', 'milestones', 'value', 'start_date', 'end_date']
    update_data = {k: v for k, v in contract_data.items() if k in allowed_fields}
    
    # Convert dates to ISO format if they're provided
    if 'start_date' in update_data and update_data['start_date']:
        if not isinstance(update_data['start_date'], str):
            update_data['start_date'] = update_data['start_date'].isoformat()
    if 'end_date' in update_data and update_data['end_date']:
        if not isinstance(update_data['end_date'], str):
            update_data['end_date'] = update_data['end_date'].isoformat()
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": update_data}
    )
    
    return {"message": "Contract updated successfully"}

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
    """Submit invoice with duplicate validation"""
    await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN])
    
    # Verify contract exists
    contract = await db.contracts.find_one({"id": invoice.contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Check for duplicate invoice (same invoice_number and vendor_id)
    if invoice.invoice_number:
        existing_invoice = await db.invoices.find_one({
            "invoice_number": invoice.invoice_number,
            "vendor_id": invoice.vendor_id
        })
        if existing_invoice:
            raise HTTPException(
                status_code=400, 
                detail=f"Duplicate invoice detected! Invoice number '{invoice.invoice_number}' already exists for this vendor."
            )
    else:
        # Auto-generate invoice number if not provided
        invoice.invoice_number = await generate_number("Invoice")
    
    # Auto-approve
    invoice.status = InvoiceStatus.APPROVED
    
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

@api_router.put("/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, invoice_data: dict, request: Request):
    """Update invoice details"""
    user = await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN])
    
    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Only allow updating certain fields
    allowed_fields = ['amount', 'description', 'milestone_reference', 'documents']
    update_data = {k: v for k, v in invoice_data.items() if k in allowed_fields}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.invoices.update_one(
        {"id": invoice_id},
        {"$set": update_data}
    )
    
    return {"message": "Invoice updated successfully"}

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

# ==================== PURCHASE ORDER ENDPOINTS ====================
@api_router.post("/purchase-orders")
async def create_purchase_order(po: PurchaseOrder, request: Request):
    """Create new purchase order with risk assessment"""
    user = await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN, UserRole.PD_OFFICER, UserRole.ADMIN, UserRole.REQUESTER])
    
    # Generate PO number
    year = datetime.now(timezone.utc).strftime('%y')
    count = await db.purchase_orders.count_documents({}) + 1
    po.po_number = f"PO-{year}-{count:04d}"
    
    # Calculate total amount
    po.total_amount = sum(item.total for item in po.items)
    
    # Check if amount > 1,000,000 SAR
    po.amount_over_million = po.total_amount > 1000000
    
    # Determine if contract is required (any yes answer or amount > 1M)
    po.requires_contract = (
        po.has_data_access or 
        po.has_onsite_presence or 
        po.has_implementation or 
        po.duration_more_than_year or 
        po.amount_over_million
    )
    
    # If no contract required, automatically issue the PO
    if not po.requires_contract:
        po.status = POStatus.ISSUED
    
    po.created_by = user.id
    po_dict = po.model_dump()
    
    await db.purchase_orders.insert_one(po_dict)
    
    return {
        "message": "Purchase order created successfully",
        "po_number": po.po_number,
        "requires_contract": po.requires_contract,
        "status": po.status
    }

@api_router.get("/purchase-orders")
async def get_purchase_orders(request: Request):
    """Get all purchase orders"""
    await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN, UserRole.PD_OFFICER, UserRole.ADMIN])
    
    pos = await db.purchase_orders.find({}, {"_id": 0}).to_list(1000)
    return pos

@api_router.get("/purchase-orders/{po_id}")
async def get_purchase_order(po_id: str, request: Request):
    """Get purchase order by ID"""
    await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN, UserRole.PD_OFFICER, UserRole.ADMIN])
    
    po = await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    return po

@api_router.post("/purchase-orders/{po_id}/convert-to-contract")
async def convert_po_to_contract(po_id: str, contract_data: dict, request: Request):
    """Convert PO to contract"""
    user = await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN, UserRole.PD_OFFICER, UserRole.ADMIN])
    
    po = await db.purchase_orders.find_one({"id": po_id})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    # Create contract from PO data
    contract = Contract(
        tender_id=po.get('tender_id'),
        vendor_id=po['vendor_id'],
        title=contract_data.get('title', f"Contract for PO {po['po_number']}"),
        sow=contract_data.get('sow', 'Contract created from Purchase Order'),
        sla=contract_data.get('sla', 'Standard SLA'),
        value=po['total_amount'],
        start_date=contract_data.get('start_date'),
        end_date=contract_data.get('end_date'),
        created_by=user.id,
        status=ContractStatus.DRAFT
    )
    
    # Generate contract number
    year = datetime.now(timezone.utc).strftime('%y')
    count = await db.contracts.count_documents({}) + 1
    contract.contract_number = f"CNT-{year}-{count:04d}"
    
    contract_dict = contract.model_dump()
    await db.contracts.insert_one(contract_dict)
    
    # Update PO status
    await db.purchase_orders.update_one(
        {"id": po_id},
        {"$set": {
            "status": POStatus.CONVERTED_TO_CONTRACT.value,
            "converted_to_contract": True,
            "contract_id": contract.id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Purchase order converted to contract successfully",
        "contract_id": contract.id,
        "contract_number": contract.contract_number
    }

# ==================== RESOURCE ENDPOINTS ====================
@api_router.post("/resources")
async def create_resource(resource: Resource, request: Request):
    """Create new resource based on approved contract and vendor"""
    user = await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN, UserRole.PD_OFFICER, UserRole.ADMIN, UserRole.REQUESTER])
    
    # Verify contract exists and is approved
    contract = await db.contracts.find_one({"id": resource.contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if contract.get('status') not in ['active', 'approved']:
        raise HTTPException(status_code=400, detail="Contract must be active or approved")
    
    # Verify vendor exists and is approved
    vendor = await db.vendors.find_one({"id": resource.vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    if vendor.get('status') != 'approved':
        raise HTTPException(status_code=400, detail="Vendor must be approved")
    
    # Check if resource duration is within contract duration
    contract_end = contract.get('end_date')
    if isinstance(contract_end, str):
        contract_end = datetime.fromisoformat(contract_end)
    
    # Ensure both datetimes are timezone-aware for comparison
    resource_end = resource.end_date
    if resource_end.tzinfo is None:
        resource_end = resource_end.replace(tzinfo=timezone.utc)
    if contract_end.tzinfo is None:
        contract_end = contract_end.replace(tzinfo=timezone.utc)
    
    if resource_end > contract_end:
        raise HTTPException(status_code=400, detail="Resource end date cannot exceed contract end date")
    
    # Generate resource number
    year = datetime.now(timezone.utc).strftime('%y')
    count = await db.resources.count_documents({}) + 1
    resource.resource_number = f"RES-{year}-{count:04d}"
    
    # Populate contract and vendor info
    resource.contract_name = contract.get('title')
    resource.scope = contract.get('sow')
    resource.sla = contract.get('sla')
    resource.contract_duration = f"{contract.get('start_date')} to {contract.get('end_date')}"
    resource.vendor_name = vendor.get('name_english') or vendor.get('commercial_name')
    
    resource.created_by = user.id
    resource_dict = resource.model_dump()
    
    await db.resources.insert_one(resource_dict)
    
    return {
        "message": "Resource registered successfully",
        "resource_number": resource.resource_number
    }

@api_router.get("/resources")
async def get_resources(request: Request, status: Optional[str] = None):
    """Get all resources"""
    await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN, UserRole.PD_OFFICER, UserRole.ADMIN])
    
    query = {}
    if status:
        query["status"] = status
    
    resources = await db.resources.find(query, {"_id": 0}).to_list(1000)
    
    # Check for expired resources and update status
    now = datetime.now(timezone.utc)
    for resource in resources:
        # Convert dates for comparison if needed
        end_date = resource.get('end_date')
        if isinstance(end_date, str):
            end_date = datetime.fromisoformat(end_date)
        
        # Ensure timezone-aware for comparison
        if end_date and end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)
        
        # Auto-terminate if end_date passed
        if end_date and end_date < now and resource.get('status') == 'active':
            await db.resources.update_one(
                {"id": resource['id']},
                {"$set": {"status": ResourceStatus.INACTIVE.value}}
            )
            resource['status'] = ResourceStatus.INACTIVE.value
        
        # Convert datetime objects back to strings for JSON serialization
        if isinstance(resource.get('start_date'), datetime):
            resource['start_date'] = resource['start_date'].isoformat()
        if isinstance(resource.get('end_date'), datetime):
            resource['end_date'] = resource['end_date'].isoformat()
        if isinstance(resource.get('created_at'), datetime):
            resource['created_at'] = resource['created_at'].isoformat()
        if isinstance(resource.get('updated_at'), datetime):
            resource['updated_at'] = resource['updated_at'].isoformat()
    
    return resources

@api_router.get("/resources/{resource_id}")
async def get_resource(resource_id: str, request: Request):
    """Get resource by ID"""
    await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN, UserRole.PD_OFFICER, UserRole.ADMIN])
    
    resource = await db.resources.find_one({"id": resource_id}, {"_id": 0})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    return resource

@api_router.put("/resources/{resource_id}")
async def update_resource(resource_id: str, resource_data: dict, request: Request):
    """Update resource details"""
    user = await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN, UserRole.PD_OFFICER, UserRole.ADMIN])
    
    resource = await db.resources.find_one({"id": resource_id})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    # Only allow updating certain fields
    allowed_fields = ['name', 'nationality', 'id_number', 'education_qualification', 
                     'years_of_experience', 'scope_of_work', 'has_relatives', 'relatives',
                     'access_development', 'access_production', 'access_uat', 'start_date', 'end_date']
    update_data = {k: v for k, v in resource_data.items() if k in allowed_fields}
    
    # Convert date strings to ISO format if provided
    if 'start_date' in update_data and update_data['start_date']:
        if not isinstance(update_data['start_date'], str):
            update_data['start_date'] = update_data['start_date'].isoformat()
    if 'end_date' in update_data and update_data['end_date']:
        if not isinstance(update_data['end_date'], str):
            update_data['end_date'] = update_data['end_date'].isoformat()
    
    # Check if end_date is in the past and auto-update status
    if 'end_date' in update_data:
        end_date = update_data['end_date']
        if isinstance(end_date, str):
            end_date = datetime.fromisoformat(end_date)
        if end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)
        
        now = datetime.now(timezone.utc)
        if end_date < now and resource.get('status') == ResourceStatus.ACTIVE.value:
            update_data['status'] = ResourceStatus.INACTIVE.value
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.resources.update_one(
        {"id": resource_id},
        {"$set": update_data}
    )
    
    return {"message": "Resource updated successfully"}

@api_router.post("/resources/{resource_id}/terminate")
async def terminate_resource(resource_id: str, request: Request, reason: str = "Manual termination"):
    """Terminate a resource"""
    user = await require_role(request, [UserRole.PROCUREMENT_OFFICER, UserRole.SYSTEM_ADMIN, UserRole.PD_OFFICER, UserRole.ADMIN])
    
    resource = await db.resources.find_one({"id": resource_id})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    await db.resources.update_one(
        {"id": resource_id},
        {"$set": {
            "status": ResourceStatus.TERMINATED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Resource terminated successfully"}

# ==================== DASHBOARD ENDPOINTS ====================
@api_router.get("/dashboard/stats")
async def get_dashboard_summary_stats(request: Request):
    """Get dashboard summary statistics"""
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

# ==================== AI ENDPOINTS ====================
@api_router.post("/ai/analyze-vendor")
async def ai_analyze_vendor(vendor_data: dict):
    """AI analyzes vendor data and suggests risk scores"""
    try:
        result = await analyze_vendor_scoring(vendor_data)
        return result
    except Exception as e:
        return {
            "error": str(e),
            "risk_category": "medium",
            "risk_score": 50,
            "reasoning": "AI analysis unavailable"
        }

@api_router.post("/ai/analyze-tender-proposal")
async def ai_analyze_tender(tender_data: dict, proposal_data: dict):
    """AI analyzes tender proposal and suggests scores"""
    try:
        result = await analyze_tender_proposal(tender_data, proposal_data)
        return result
    except Exception as e:
        return {
            "error": str(e),
            "overall_score": 70,
            "recommendation": "Manual Review Required"
        }

@api_router.post("/ai/classify-contract")
async def ai_classify_contract(data: dict):
    """AI classifies contract type (outsourcing, cloud, NOC)"""
    try:
        description = data.get('description', '')
        title = data.get('title', '')
        result = await analyze_contract_classification(description, title)
        return result
    except Exception as e:
        return {
            "error": str(e),
            "outsourcing_classification": "none",
            "is_noc_required": False,
            "reasoning": "AI analysis unavailable"
        }

@api_router.post("/ai/analyze-po-item")
async def ai_analyze_po_item(data: dict):
    """AI analyzes PO item and suggests checkboxes"""
    try:
        description = data.get('description', '')
        result = await analyze_po_items(description)
        return result
    except Exception as e:
        return {
            "error": str(e),
            "requires_contract": False,
            "reasoning": "AI analysis unavailable"
        }

@api_router.post("/ai/match-invoice-milestone")
async def ai_match_invoice_milestone(data: dict):
    """AI matches invoice to contract milestones"""
    try:
        description = data.get('description', '')
        milestones = data.get('milestones', [])
        result = await match_invoice_to_milestone(description, milestones)
        return result
    except Exception as e:
        return {
            "error": str(e),
            "matched_milestone_name": None,
            "reasoning": "AI analysis unavailable"
        }

# ==================== BASIC ENDPOINTS ====================
# ==================== EXPORT ENDPOINTS ====================

@api_router.get("/export/vendors")
async def export_vendors(request: Request):
    """Export all vendors to Excel with complete due diligence data"""
    await require_auth(request)
    
    vendors = await db.vendors.find({}, {"_id": 0}).to_list(1000)
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Vendors"
    
    # Header styling
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    
    # Define comprehensive headers with all actual fields
    headers = [
        "ID", "Name (English)", "Commercial Name", "Entity Type", 
        "VAT Number", "Unified Number", "CR Number", "CR Expiry Date", "CR Country/City",
        "License Number", "License Expiry Date",
        "Activity Description", "Number of Employees",
        "Country", "City", "District", "Street", "Building No", 
        "Representative Name", "Representative Email", "Representative Mobile", 
        "Representative Designation", "Representative Nationality", "Representative ID Type", "Representative ID Number",
        "Email", "Mobile", "Landline", "Fax",
        "Bank Name", "IBAN", "Bank Branch", "Bank Country", "Bank Account Name", "SWIFT Code", "Currency",
        "Status", "Risk Category", "Risk Score",
        "Created At", "Updated At"
    ]
    
    # Write headers
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")
    
    # Write data
    for row_idx, vendor in enumerate(vendors, 2):
        ws.cell(row=row_idx, column=1, value=vendor.get("id", ""))
        ws.cell(row=row_idx, column=2, value=vendor.get("name_english", ""))
        ws.cell(row=row_idx, column=3, value=vendor.get("commercial_name", ""))
        ws.cell(row=row_idx, column=4, value=vendor.get("entity_type", ""))
        ws.cell(row=row_idx, column=5, value=vendor.get("vat_number", ""))
        ws.cell(row=row_idx, column=6, value=vendor.get("unified_number", ""))
        ws.cell(row=row_idx, column=7, value=vendor.get("cr_number", ""))
        ws.cell(row=row_idx, column=8, value=str(vendor.get("cr_expiry_date", "")))
        ws.cell(row=row_idx, column=9, value=vendor.get("cr_country_city", ""))
        ws.cell(row=row_idx, column=10, value=vendor.get("license_number", ""))
        ws.cell(row=row_idx, column=11, value=str(vendor.get("license_expiry_date", "")))
        ws.cell(row=row_idx, column=12, value=vendor.get("activity_description", ""))
        ws.cell(row=row_idx, column=13, value=vendor.get("number_of_employees", ""))
        ws.cell(row=row_idx, column=14, value=vendor.get("country", ""))
        ws.cell(row=row_idx, column=15, value=vendor.get("city", ""))
        ws.cell(row=row_idx, column=16, value=vendor.get("district", ""))
        ws.cell(row=row_idx, column=17, value=vendor.get("street", ""))
        ws.cell(row=row_idx, column=18, value=vendor.get("building_no", ""))
        ws.cell(row=row_idx, column=19, value=vendor.get("representative_name", ""))
        ws.cell(row=row_idx, column=20, value=vendor.get("representative_email", ""))
        ws.cell(row=row_idx, column=21, value=vendor.get("representative_mobile", ""))
        ws.cell(row=row_idx, column=22, value=vendor.get("representative_designation", ""))
        ws.cell(row=row_idx, column=23, value=vendor.get("representative_nationality", ""))
        ws.cell(row=row_idx, column=24, value=vendor.get("representative_id_type", ""))
        ws.cell(row=row_idx, column=25, value=vendor.get("representative_id_number", ""))
        ws.cell(row=row_idx, column=26, value=vendor.get("email", ""))
        ws.cell(row=row_idx, column=27, value=vendor.get("mobile", ""))
        ws.cell(row=row_idx, column=28, value=vendor.get("landline", ""))
        ws.cell(row=row_idx, column=29, value=vendor.get("fax", ""))
        ws.cell(row=row_idx, column=30, value=vendor.get("bank_name", ""))
        ws.cell(row=row_idx, column=31, value=vendor.get("iban", ""))
        ws.cell(row=row_idx, column=32, value=vendor.get("bank_branch", ""))
        ws.cell(row=row_idx, column=33, value=vendor.get("bank_country", ""))
        ws.cell(row=row_idx, column=34, value=vendor.get("bank_account_name", ""))
        ws.cell(row=row_idx, column=35, value=vendor.get("swift_code", ""))
        ws.cell(row=row_idx, column=36, value=vendor.get("currency", ""))
        ws.cell(row=row_idx, column=37, value=vendor.get("status", ""))
        ws.cell(row=row_idx, column=38, value=vendor.get("risk_category", ""))
        ws.cell(row=row_idx, column=39, value=vendor.get("risk_score", ""))
        ws.cell(row=row_idx, column=40, value=str(vendor.get("created_at", "")))
        ws.cell(row=row_idx, column=41, value=str(vendor.get("updated_at", "")))
    
    # Auto-size columns
    for col in ws.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            if cell.value:
                max_length = max(max_length, len(str(cell.value)))
        ws.column_dimensions[column].width = min(max_length + 2, 50)
    
    # Save to BytesIO
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=vendors_export.xlsx"}
    )

@api_router.get("/export/contracts")
async def export_contracts(request: Request):
    """Export all contracts with milestones to Excel"""
    await require_auth(request)
    
    contracts = await db.contracts.find({}, {"_id": 0}).to_list(1000)
    
    wb = Workbook()
    
    # Sheet 1: Contracts
    ws_contracts = wb.active
    ws_contracts.title = "Contracts"
    
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    
    contract_headers = ["ID", "Contract Number", "Title", "Tender ID", "Vendor ID", 
                        "Status", "Value", "Start Date", "End Date", "Duration (months)",
                        "Statement of Work", "SLA", 
                        "Classification", "NOC Required", "Data Access", "Subcontracting",
                        "Is Outsourcing", "Created By", "Approved By",
                        "Created At", "Updated At"]
    
    for col, header in enumerate(contract_headers, 1):
        cell = ws_contracts.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")
    
    for row_idx, contract in enumerate(contracts, 2):
        ws_contracts.cell(row=row_idx, column=1, value=contract.get("id", ""))
        ws_contracts.cell(row=row_idx, column=2, value=contract.get("contract_number", ""))
        ws_contracts.cell(row=row_idx, column=3, value=contract.get("title", ""))
        ws_contracts.cell(row=row_idx, column=4, value=contract.get("tender_id", ""))
        ws_contracts.cell(row=row_idx, column=5, value=contract.get("vendor_id", ""))
        ws_contracts.cell(row=row_idx, column=6, value=contract.get("status", ""))
        ws_contracts.cell(row=row_idx, column=7, value=contract.get("value", 0))
        ws_contracts.cell(row=row_idx, column=8, value=str(contract.get("start_date", "")))
        ws_contracts.cell(row=row_idx, column=9, value=str(contract.get("end_date", "")))
        ws_contracts.cell(row=row_idx, column=10, value=contract.get("duration_months", ""))
        ws_contracts.cell(row=row_idx, column=11, value=contract.get("sow", ""))
        ws_contracts.cell(row=row_idx, column=12, value=contract.get("sla", ""))
        ws_contracts.cell(row=row_idx, column=13, value=contract.get("outsourcing_classification", ""))
        ws_contracts.cell(row=row_idx, column=14, value=str(contract.get("is_noc", False)))
        ws_contracts.cell(row=row_idx, column=15, value=str(contract.get("involves_data_access", False)))
        ws_contracts.cell(row=row_idx, column=16, value=str(contract.get("involves_subcontracting", False)))
        ws_contracts.cell(row=row_idx, column=17, value=str(contract.get("is_outsourcing", False)))
        ws_contracts.cell(row=row_idx, column=18, value=contract.get("created_by", ""))
        ws_contracts.cell(row=row_idx, column=19, value=contract.get("approved_by", ""))
        ws_contracts.cell(row=row_idx, column=20, value=str(contract.get("created_at", "")))
        ws_contracts.cell(row=row_idx, column=21, value=str(contract.get("updated_at", "")))
    
    # Auto-size
    for col in ws_contracts.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            if cell.value:
                max_length = max(max_length, len(str(cell.value)))
        ws_contracts.column_dimensions[column].width = min(max_length + 2, 50)
    
    # Sheet 2: Milestones
    ws_milestones = wb.create_sheet("Milestones")
    milestone_headers = ["Contract ID", "Contract Number", "Milestone Name", "Description",
                         "Due Date", "Payment Percentage", "Amount", "Status", "Completed Date"]
    
    for col, header in enumerate(milestone_headers, 1):
        cell = ws_milestones.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")
    
    milestone_row = 2
    for contract in contracts:
        milestones = contract.get("milestones", [])
        for milestone in milestones:
            ws_milestones.cell(row=milestone_row, column=1, value=contract.get("id", ""))
            ws_milestones.cell(row=milestone_row, column=2, value=contract.get("contract_number", ""))
            ws_milestones.cell(row=milestone_row, column=3, value=milestone.get("name", ""))
            ws_milestones.cell(row=milestone_row, column=4, value=milestone.get("description", ""))
            ws_milestones.cell(row=milestone_row, column=5, value=str(milestone.get("due_date", "")))
            ws_milestones.cell(row=milestone_row, column=6, value=milestone.get("payment_percentage", 0))
            ws_milestones.cell(row=milestone_row, column=7, value=milestone.get("amount", 0))
            ws_milestones.cell(row=milestone_row, column=8, value=milestone.get("status", ""))
            ws_milestones.cell(row=milestone_row, column=9, value=str(milestone.get("completed_date", "")))
            milestone_row += 1
    
    # Auto-size
    for col in ws_milestones.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            if cell.value:
                max_length = max(max_length, len(str(cell.value)))
        ws_milestones.column_dimensions[column].width = min(max_length + 2, 50)
    
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=contracts_export.xlsx"}
    )

@api_router.get("/export/tenders")
async def export_tenders(request: Request):
    """Export all tenders with proposals and evaluations to Excel"""
    await require_auth(request)
    
    tenders = await db.tenders.find({}, {"_id": 0}).to_list(1000)
    # Fetch all proposals separately
    all_proposals = await db.proposals.find({}, {"_id": 0}).to_list(5000)
    
    wb = Workbook()
    
    # Sheet 1: Tenders
    ws_tenders = wb.active
    ws_tenders.title = "Tenders"
    
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    
    tender_headers = ["ID", "Tender Number", "Title", "Description", "Status", "Budget", 
                      "Deadline", "Requirements", "Published Date", "Closing Date", 
                      "Created At", "Updated At"]
    
    for col, header in enumerate(tender_headers, 1):
        cell = ws_tenders.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")
    
    for row_idx, tender in enumerate(tenders, 2):
        ws_tenders.cell(row=row_idx, column=1, value=tender.get("id", ""))
        ws_tenders.cell(row=row_idx, column=2, value=tender.get("tender_number", ""))
        ws_tenders.cell(row=row_idx, column=3, value=tender.get("title", ""))
        ws_tenders.cell(row=row_idx, column=4, value=tender.get("description", ""))
        ws_tenders.cell(row=row_idx, column=5, value=tender.get("status", ""))
        ws_tenders.cell(row=row_idx, column=6, value=tender.get("budget", 0))
        ws_tenders.cell(row=row_idx, column=7, value=str(tender.get("deadline", "")))
        ws_tenders.cell(row=row_idx, column=8, value=tender.get("requirements", ""))
        ws_tenders.cell(row=row_idx, column=9, value=str(tender.get("published_date", "")))
        ws_tenders.cell(row=row_idx, column=10, value=str(tender.get("closing_date", "")))
        ws_tenders.cell(row=row_idx, column=11, value=str(tender.get("created_at", "")))
        ws_tenders.cell(row=row_idx, column=12, value=str(tender.get("updated_at", "")))
    
    # Auto-size columns
    for col in ws_tenders.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            if cell.value:
                max_length = max(max_length, len(str(cell.value)))
        ws_tenders.column_dimensions[column].width = min(max_length + 2, 50)
    
    # Sheet 2: Proposals
    ws_proposals = wb.create_sheet("Proposals")
    proposal_headers = ["Proposal ID", "Tender ID", "Tender Number", "Vendor ID", "Vendor Name",
                        "Proposed Price", "Technical Approach", "Delivery Time", "Status",
                        "Submitted At", "Updated At"]
    
    for col, header in enumerate(proposal_headers, 1):
        cell = ws_proposals.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")
    
    proposal_row = 2
    for proposal in all_proposals:
        # Find tender number
        tender_id = proposal.get("tender_id", "")
        tender = next((t for t in tenders if t.get("id") == tender_id), {})
        
        ws_proposals.cell(row=proposal_row, column=1, value=proposal.get("id", ""))
        ws_proposals.cell(row=proposal_row, column=2, value=tender_id)
        ws_proposals.cell(row=proposal_row, column=3, value=tender.get("title", ""))
        ws_proposals.cell(row=proposal_row, column=4, value=proposal.get("vendor_id", ""))
        ws_proposals.cell(row=proposal_row, column=5, value=proposal.get("vendor_name", ""))
        ws_proposals.cell(row=proposal_row, column=6, value=proposal.get("proposed_price", 0))
        ws_proposals.cell(row=proposal_row, column=7, value=proposal.get("technical_approach", ""))
        ws_proposals.cell(row=proposal_row, column=8, value=proposal.get("delivery_time", ""))
        ws_proposals.cell(row=proposal_row, column=9, value=proposal.get("status", ""))
        ws_proposals.cell(row=proposal_row, column=10, value=str(proposal.get("created_at", "")))
        ws_proposals.cell(row=proposal_row, column=11, value=str(proposal.get("updated_at", "")))
        proposal_row += 1
    
    # Auto-size
    for col in ws_proposals.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            if cell.value:
                max_length = max(max_length, len(str(cell.value)))
        ws_proposals.column_dimensions[column].width = min(max_length + 2, 50)
    
    # Sheet 3: Evaluations
    ws_evaluations = wb.create_sheet("Evaluations")
    eval_headers = ["Evaluation ID", "Tender ID", "Proposal ID", "Vendor Name",
                    "Reliability Score", "Delivery Score", "Technical Score", 
                    "Cost Score", "Meets Requirements", "Total Score",
                    "Evaluated By", "Evaluated At"]
    
    for col, header in enumerate(eval_headers, 1):
        cell = ws_evaluations.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")
    
    eval_row = 2
    for proposal in all_proposals:
        evaluation = proposal.get("evaluation", {})
        if evaluation:
            tender_id = proposal.get("tender_id", "")
            tender = next((t for t in tenders if t.get("id") == tender_id), {})
            
            ws_evaluations.cell(row=eval_row, column=1, value=evaluation.get("id", ""))
            ws_evaluations.cell(row=eval_row, column=2, value=tender_id)
            ws_evaluations.cell(row=eval_row, column=3, value=proposal.get("id", ""))
            ws_evaluations.cell(row=eval_row, column=4, value=proposal.get("vendor_name", ""))
            ws_evaluations.cell(row=eval_row, column=5, value=evaluation.get("vendor_reliability_stability", ""))
            ws_evaluations.cell(row=eval_row, column=6, value=evaluation.get("delivery_warranty_backup", ""))
            ws_evaluations.cell(row=eval_row, column=7, value=evaluation.get("technical_experience", ""))
            ws_evaluations.cell(row=eval_row, column=8, value=evaluation.get("cost_score", ""))
            ws_evaluations.cell(row=eval_row, column=9, value=evaluation.get("meets_requirements", ""))
            ws_evaluations.cell(row=eval_row, column=10, value=evaluation.get("total_score", ""))
            ws_evaluations.cell(row=eval_row, column=11, value=evaluation.get("evaluated_by", ""))
            ws_evaluations.cell(row=eval_row, column=12, value=str(evaluation.get("evaluated_at", "")))
            eval_row += 1
    
    # Auto-size
    for col in ws_evaluations.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            if cell.value:
                max_length = max(max_length, len(str(cell.value)))
        ws_evaluations.column_dimensions[column].width = min(max_length + 2, 50)
    
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=tenders_export.xlsx"}
    )

@api_router.get("/export/invoices")
async def export_invoices(request: Request):
    """Export all invoices with complete details to Excel"""
    await require_auth(request)
    
    invoices = await db.invoices.find({}, {"_id": 0}).to_list(1000)
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Invoices"
    
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    
    headers = ["ID", "Invoice Number", "Vendor ID", "Contract ID", "PO ID", "Amount", 
               "Status", "Description", "Issue Date", "Due Date", "Payment Date",
               "Tax Amount", "Discount", "Net Amount",
               "Milestone", "Payment Method", "Notes",
               "Approved By", "Created At", "Updated At"]
    
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")
    
    for row_idx, invoice in enumerate(invoices, 2):
        ws.cell(row=row_idx, column=1, value=invoice.get("id", ""))
        ws.cell(row=row_idx, column=2, value=invoice.get("invoice_number", ""))
        ws.cell(row=row_idx, column=3, value=invoice.get("vendor_id", ""))
        ws.cell(row=row_idx, column=4, value=invoice.get("contract_id", ""))
        ws.cell(row=row_idx, column=5, value=invoice.get("po_id", ""))
        ws.cell(row=row_idx, column=6, value=invoice.get("amount", 0))
        ws.cell(row=row_idx, column=7, value=invoice.get("status", ""))
        ws.cell(row=row_idx, column=8, value=invoice.get("description", ""))
        ws.cell(row=row_idx, column=9, value=str(invoice.get("issue_date", "")))
        ws.cell(row=row_idx, column=10, value=str(invoice.get("due_date", "")))
        ws.cell(row=row_idx, column=11, value=str(invoice.get("payment_date", "")))
        ws.cell(row=row_idx, column=12, value=invoice.get("tax_amount", 0))
        ws.cell(row=row_idx, column=13, value=invoice.get("discount", 0))
        ws.cell(row=row_idx, column=14, value=invoice.get("net_amount", 0))
        ws.cell(row=row_idx, column=15, value=invoice.get("milestone", ""))
        ws.cell(row=row_idx, column=16, value=invoice.get("payment_method", ""))
        ws.cell(row=row_idx, column=17, value=invoice.get("notes", ""))
        ws.cell(row=row_idx, column=18, value=invoice.get("approved_by", ""))
        ws.cell(row=row_idx, column=19, value=str(invoice.get("created_at", "")))
        ws.cell(row=row_idx, column=20, value=str(invoice.get("updated_at", "")))
    
    for col in ws.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            if cell.value:
                max_length = max(max_length, len(str(cell.value)))
        ws.column_dimensions[column].width = min(max_length + 2, 50)
    
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=invoices_export.xlsx"}
    )

@api_router.get("/export/purchase-orders")
async def export_purchase_orders(request: Request):
    """Export all purchase orders with line items to Excel"""
    await require_auth(request)
    
    pos = await db.purchase_orders.find({}, {"_id": 0}).to_list(1000)
    
    wb = Workbook()
    
    # Sheet 1: Purchase Orders
    ws_pos = wb.active
    ws_pos.title = "Purchase Orders"
    
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    
    po_headers = ["ID", "PO Number", "Vendor ID", "Tender ID", "Status", 
                  "Total Value", "Delivery Location", "Delivery Date",
                  "Payment Terms", "Notes", "Created By", "Approved By",
                  "Created At", "Updated At"]
    
    for col, header in enumerate(po_headers, 1):
        cell = ws_pos.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")
    
    for row_idx, po in enumerate(pos, 2):
        ws_pos.cell(row=row_idx, column=1, value=po.get("id", ""))
        ws_pos.cell(row=row_idx, column=2, value=po.get("po_number", ""))
        ws_pos.cell(row=row_idx, column=3, value=po.get("vendor_id", ""))
        ws_pos.cell(row=row_idx, column=4, value=po.get("tender_id", ""))
        ws_pos.cell(row=row_idx, column=5, value=po.get("status", ""))
        ws_pos.cell(row=row_idx, column=6, value=po.get("total_value", 0))
        ws_pos.cell(row=row_idx, column=7, value=po.get("delivery_location", ""))
        ws_pos.cell(row=row_idx, column=8, value=str(po.get("delivery_date", "")))
        ws_pos.cell(row=row_idx, column=9, value=po.get("payment_terms", ""))
        ws_pos.cell(row=row_idx, column=10, value=po.get("notes", ""))
        ws_pos.cell(row=row_idx, column=11, value=po.get("created_by", ""))
        ws_pos.cell(row=row_idx, column=12, value=po.get("approved_by", ""))
        ws_pos.cell(row=row_idx, column=13, value=str(po.get("created_at", "")))
        ws_pos.cell(row=row_idx, column=14, value=str(po.get("updated_at", "")))
    
    # Auto-size
    for col in ws_pos.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            if cell.value:
                max_length = max(max_length, len(str(cell.value)))
        ws_pos.column_dimensions[column].width = min(max_length + 2, 50)
    
    # Sheet 2: PO Items
    ws_items = wb.create_sheet("PO Items")
    item_headers = ["PO ID", "PO Number", "Item Name", "Description", 
                    "Quantity", "Unit Price", "Total", "Unit", "Category"]
    
    for col, header in enumerate(item_headers, 1):
        cell = ws_items.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")
    
    item_row = 2
    for po in pos:
        items = po.get("items", [])
        for item in items:
            ws_items.cell(row=item_row, column=1, value=po.get("id", ""))
            ws_items.cell(row=item_row, column=2, value=po.get("po_number", ""))
            ws_items.cell(row=item_row, column=3, value=item.get("name", ""))
            ws_items.cell(row=item_row, column=4, value=item.get("description", ""))
            ws_items.cell(row=item_row, column=5, value=item.get("quantity", 0))
            ws_items.cell(row=item_row, column=6, value=item.get("price", 0))
            ws_items.cell(row=item_row, column=7, value=item.get("total", 0))
            ws_items.cell(row=item_row, column=8, value=item.get("unit", ""))
            ws_items.cell(row=item_row, column=9, value=item.get("category", ""))
            item_row += 1
    
    # Auto-size
    for col in ws_items.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            if cell.value:
                max_length = max(max_length, len(str(cell.value)))
        ws_items.column_dimensions[column].width = min(max_length + 2, 50)
    
    for col in ws.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            if cell.value:
                max_length = max(max_length, len(str(cell.value)))
        ws.column_dimensions[column].width = min(max_length + 2, 50)
    
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=purchase_orders_export.xlsx"}
    )

@api_router.get("/export/resources")
async def export_resources(request: Request):
    """Export all resources with complete details to Excel"""
    await require_auth(request)
    
    resources = await db.resources.find({}, {"_id": 0}).to_list(1000)
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Resources"
    
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    
    headers = ["ID", "Name", "Resource Type", "Vendor ID", "Contract ID", 
               "Location", "Location Type", "Status", "Position/Role", 
               "Department", "Start Date", "End Date", "Cost", 
               "Qualifications", "Experience", "Certifications",
               "Contact Email", "Contact Phone", "Notes",
               "Created At", "Updated At"]
    
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")
    
    for row_idx, resource in enumerate(resources, 2):
        ws.cell(row=row_idx, column=1, value=resource.get("id", ""))
        ws.cell(row=row_idx, column=2, value=resource.get("name", ""))
        ws.cell(row=row_idx, column=3, value=resource.get("resource_type", ""))
        ws.cell(row=row_idx, column=4, value=resource.get("vendor_id", ""))
        ws.cell(row=row_idx, column=5, value=resource.get("contract_id", ""))
        ws.cell(row=row_idx, column=6, value=resource.get("location", ""))
        ws.cell(row=row_idx, column=7, value=resource.get("location_type", ""))
        ws.cell(row=row_idx, column=8, value=resource.get("status", ""))
        ws.cell(row=row_idx, column=9, value=resource.get("position", ""))
        ws.cell(row=row_idx, column=10, value=resource.get("department", ""))
        ws.cell(row=row_idx, column=11, value=str(resource.get("start_date", "")))
        ws.cell(row=row_idx, column=12, value=str(resource.get("end_date", "")))
        ws.cell(row=row_idx, column=13, value=resource.get("cost", 0))
        ws.cell(row=row_idx, column=14, value=resource.get("qualifications", ""))
        ws.cell(row=row_idx, column=15, value=resource.get("experience", ""))
        ws.cell(row=row_idx, column=16, value=resource.get("certifications", ""))
        ws.cell(row=row_idx, column=17, value=resource.get("email", ""))
        ws.cell(row=row_idx, column=18, value=resource.get("phone", ""))
        ws.cell(row=row_idx, column=19, value=resource.get("notes", ""))
        ws.cell(row=row_idx, column=20, value=str(resource.get("created_at", "")))
        ws.cell(row=row_idx, column=21, value=str(resource.get("updated_at", "")))
    
    for col in ws.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            if cell.value:
                max_length = max(max_length, len(str(cell.value)))
        ws.column_dimensions[column].width = min(max_length + 2, 50)
    
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=resources_export.xlsx"}
    )

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

