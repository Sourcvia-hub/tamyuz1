"""
Contract models - with AI-Powered Governance Intelligence
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid

class ContractStatus(str, Enum):
    DRAFT = "draft"
    UNDER_REVIEW = "under_review"
    PENDING_DUE_DILIGENCE = "pending_due_diligence"
    PENDING_SAMA_NOC = "pending_sama_noc"
    PENDING_HOP_APPROVAL = "pending_hop_approval"  # Head of Procurement
    APPROVED = "approved"
    ACTIVE = "active"
    EXPIRED = "expired"
    REJECTED = "rejected"


class SAMANOCStatus(str, Enum):
    """SAMA NOC approval status"""
    NOT_REQUIRED = "not_required"
    PENDING = "pending"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"


class ContractDDStatus(str, Enum):
    """Contract Due Diligence status"""
    NOT_REQUIRED = "not_required"
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    APPROVED = "approved"


class Contract(BaseModel):
    """
    Contract model with AI-Powered Governance Intelligence
    Supports the full contract journey with role-based governance
    """
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contract_number: Optional[str] = None  # Auto-generated (e.g., Contract-25-0001)
    tender_id: str  # Required - must select approved Business Request (PR)
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
    
    # ==================== CONTRACT CREATION METHOD ====================
    creation_method: Optional[str] = None  # "upload" or "manual"
    uploaded_contract_document_id: Optional[str] = None
    
    # ==================== AI EXTRACTION (from uploaded contract) ====================
    ai_sow_summary: Optional[str] = None
    ai_sla_summary: Optional[str] = None
    ai_extracted_value: Optional[float] = None
    ai_extracted_currency: Optional[str] = "SAR"
    ai_extracted_duration_months: Optional[int] = None
    ai_supplier_name: Optional[str] = None
    ai_supplier_country: Optional[str] = None
    ai_exhibits_identified: List[str] = []
    ai_extraction_confidence: Optional[float] = None
    ai_extraction_notes: Optional[str] = None
    ai_extracted_at: Optional[datetime] = None
    
    # ==================== CONTRACT CLASSIFICATION ====================
    # Calculated classification based on context and AI analysis
    outsourcing_classification: Optional[str] = None  # "not_outsourcing", "outsourcing", "material_outsourcing", "cloud_computing", "insourcing", "exempted"
    classification_reason: Optional[str] = None
    classification_by: Optional[str] = None  # "ai" or user_id
    classification_at: Optional[datetime] = None
    
    # ==================== Outsourcing Assessment Questionnaire ====================
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
    
    # Section B: Materiality Determination
    b1_material_impact_if_disrupted: Optional[bool] = None
    b2_financial_impact: Optional[bool] = None
    b3_reputational_impact: Optional[bool] = None
    b4_outside_ksa: Optional[bool] = None
    b5_difficult_alternative: Optional[bool] = None
    b6_data_transfer: Optional[bool] = None
    b7_affiliation_relationship: Optional[bool] = None
    b8_regulated_activity: Optional[bool] = None
    
    # ==================== CONTRACT RISK ASSESSMENT ====================
    risk_score: float = 0.0
    risk_level: Optional[str] = None  # "low", "medium", "high"
    risk_drivers: List[str] = []
    risk_assessed_by: Optional[str] = None
    risk_assessed_at: Optional[datetime] = None
    requires_risk_acceptance: bool = False
    risk_accepted_by: Optional[str] = None
    risk_accepted_at: Optional[datetime] = None
    risk_acceptance_notes: Optional[str] = None
    
    # ==================== CONTRACT DUE DILIGENCE ====================
    contract_dd_status: ContractDDStatus = ContractDDStatus.NOT_REQUIRED
    contract_dd_document_id: Optional[str] = None
    contract_dd_completed_by: Optional[str] = None
    contract_dd_completed_at: Optional[datetime] = None
    contract_dd_approved_by: Optional[str] = None
    contract_dd_approved_at: Optional[datetime] = None
    contract_dd_risk_level: Optional[str] = None
    contract_dd_risk_score: Optional[float] = None
    contract_dd_findings: List[str] = []
    contract_dd_followups: List[str] = []
    
    # ==================== SAMA NOC TRACKING ====================
    sama_noc_status: SAMANOCStatus = SAMANOCStatus.NOT_REQUIRED
    sama_noc_reference_number: Optional[str] = None
    sama_noc_submission_date: Optional[datetime] = None
    sama_noc_approval_date: Optional[datetime] = None
    sama_noc_expiry_date: Optional[datetime] = None
    sama_noc_submission_document_id: Optional[str] = None
    sama_noc_approval_document_id: Optional[str] = None
    sama_noc_submitted_by: Optional[str] = None
    sama_noc_approved_by: Optional[str] = None
    sama_noc_notes: Optional[str] = None
    sama_noc_rejection_reason: Optional[str] = None
    
    # ==================== AI ADVISORY ====================
    ai_drafting_hints: List[Dict[str, Any]] = []
    ai_clause_suggestions: List[Dict[str, Any]] = []
    ai_consistency_warnings: List[Dict[str, Any]] = []
    ai_advisory_notes: Optional[str] = None
    ai_advisory_generated_at: Optional[datetime] = None
    
    # ==================== HEAD OF PROCUREMENT APPROVAL ====================
    hop_submitted_for_approval: bool = False
    hop_submitted_at: Optional[datetime] = None
    hop_submitted_by: Optional[str] = None
    hop_decision: Optional[str] = None  # "approved", "rejected", "returned"
    hop_decision_at: Optional[datetime] = None
    hop_decision_by: Optional[str] = None
    hop_decision_notes: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

