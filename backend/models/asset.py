"""
Asset and Facilities Management models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid

class AssetStatus(str, Enum):
    ACTIVE = "active"
    UNDER_MAINTENANCE = "under_maintenance"
    OUT_OF_SERVICE = "out_of_service"
    REPLACED = "replaced"
    DECOMMISSIONED = "decommissioned"

class AssetCondition(str, Enum):
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"

class OSRType(str, Enum):
    ASSET_RELATED = "asset_related"
    GENERAL_REQUEST = "general_request"

class OSRCategory(str, Enum):
    MAINTENANCE = "maintenance"
    CLEANING = "cleaning"
    RELOCATION = "relocation"
    SAFETY = "safety"
    OTHER = "other"

class OSRStatus(str, Enum):
    OPEN = "open"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class OSRPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"

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

# Facilities Management Models
class Building(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Floor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    building_id: str
    name: str  # e.g., "Ground Floor", "1st Floor", "Basement"
    number: Optional[int] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AssetCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Asset(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    asset_number: Optional[str] = None  # Auto-generated
    
    # Basic Information
    name: str
    category_id: str  # Links to AssetCategory
    category_name: Optional[str] = None  # Denormalized for display
    model: Optional[str] = None
    serial_number: Optional[str] = None
    manufacturer: Optional[str] = None
    
    # Location
    building_id: str
    building_name: Optional[str] = None  # Denormalized
    floor_id: str
    floor_name: Optional[str] = None  # Denormalized
    room_area: Optional[str] = None  # Free text
    custodian: Optional[str] = None  # Free text for MVP
    
    # Procurement & Contract
    vendor_id: Optional[str] = None
    vendor_name: Optional[str] = None  # Denormalized
    purchase_date: Optional[datetime] = None
    cost: Optional[float] = None
    po_number: Optional[str] = None
    contract_id: Optional[str] = None  # AMC Contract
    contract_number: Optional[str] = None  # Denormalized
    
    # Warranty
    warranty_start_date: Optional[datetime] = None
    warranty_end_date: Optional[datetime] = None
    warranty_status: Optional[str] = None  # Auto-calculated: "in_warranty" or "out_of_warranty"
    
    # Lifecycle
    installation_date: Optional[datetime] = None
    last_maintenance_date: Optional[datetime] = None
    next_maintenance_due: Optional[datetime] = None
    status: AssetStatus = AssetStatus.ACTIVE
    condition: Optional[AssetCondition] = None
    
    # Attachments
    attachments: List[Dict[str, Any]] = []
    
    # Metadata
    notes: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

