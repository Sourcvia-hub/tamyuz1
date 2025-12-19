"""
Tender and Proposal models - Business Request (PR)
Includes multi-level approval workflow
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class TenderStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"  # Officer added proposals, awaiting user evaluation
    PENDING_EVALUATION = "pending_evaluation"  # User is evaluating
    EVALUATION_COMPLETE = "evaluation_complete"  # User completed evaluation
    PENDING_ADDITIONAL_APPROVAL = "pending_additional_approval"  # Forwarded to additional approver
    PENDING_HOP_APPROVAL = "pending_hop_approval"  # Forwarded to HoP
    AWARDED = "awarded"  # Final approval complete
    REJECTED = "rejected"
    CLOSED = "closed"


class Tender(BaseModel):
    """
    Business Request (PR) model
    Includes Contract Context Questionnaire and multi-level approval workflow
    """
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tender_number: Optional[str] = None  # Auto-generated (e.g., TND-2025-0001)
    title: str
    request_type: str = "technology"  # "technology" or "non-technology"
    is_project_related: str = "no"  # "yes" or "no"
    project_reference: Optional[str] = None  # Mandatory if is_project_related = "yes"
    project_name: str
    description: str
    requirements: str  # Business Need
    budget: float  # Estimated Budget (Indicative)
    deadline: datetime
    invited_vendors: List[str] = []  # vendor IDs
    status: TenderStatus = TenderStatus.DRAFT
    created_by: Optional[str] = None  # user ID who created (the requester)
    awarded_to: Optional[str] = None  # vendor ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # ==================== CONTRACT CONTEXT QUESTIONNAIRE ====================
    ctx_requires_system_data_access: Optional[str] = None
    ctx_is_cloud_based: Optional[str] = None
    ctx_is_outsourcing_service: Optional[str] = None
    ctx_expected_data_location: Optional[str] = None
    ctx_requires_onsite_presence: Optional[str] = None
    ctx_expected_duration: Optional[str] = None
    ctx_validated_by_procurement: bool = False
    ctx_validated_by: Optional[str] = None
    ctx_validated_at: Optional[datetime] = None
    ctx_procurement_notes: Optional[str] = None
    
    # ==================== EVALUATION WORKFLOW ====================
    # User's evaluation submission
    evaluation_submitted_by: Optional[str] = None  # User who submitted evaluation
    evaluation_submitted_at: Optional[datetime] = None
    evaluation_notes: Optional[str] = None
    selected_proposal_id: Optional[str] = None  # Recommended proposal by user
    
    # Officer review of evaluation
    evaluation_reviewed_by: Optional[str] = None
    evaluation_reviewed_at: Optional[datetime] = None
    evaluation_review_notes: Optional[str] = None
    
    # ==================== ADDITIONAL APPROVAL WORKFLOW ====================
    # Officer forwards to additional approver (optional)
    additional_approver_id: Optional[str] = None  # User ID of selected approver
    additional_approver_name: Optional[str] = None
    additional_approval_requested_by: Optional[str] = None
    additional_approval_requested_at: Optional[datetime] = None
    additional_approval_notes: Optional[str] = None
    
    # Additional approver's decision
    additional_approval_decision: Optional[str] = None  # "approved", "rejected"
    additional_approval_decision_at: Optional[datetime] = None
    additional_approval_decision_notes: Optional[str] = None
    
    # ==================== HOP APPROVAL WORKFLOW ====================
    hop_approval_requested_by: Optional[str] = None
    hop_approval_requested_at: Optional[datetime] = None
    hop_approval_notes: Optional[str] = None
    
    hop_decision: Optional[str] = None  # "approved", "rejected"
    hop_decision_by: Optional[str] = None
    hop_decision_at: Optional[datetime] = None
    hop_decision_notes: Optional[str] = None
    
    # ==================== AUTO-CREATED RESOURCES ====================
    # After HoP approval, auto-create contract/PO
    auto_created_contract_id: Optional[str] = None
    auto_created_po_id: Optional[str] = None
    
    # Audit trail
    audit_trail: List[Dict[str, Any]] = []


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
    
    # User comments for each criterion
    vendor_reliability_comments: Optional[str] = None
    delivery_warranty_comments: Optional[str] = None
    technical_experience_comments: Optional[str] = None
    cost_comments: Optional[str] = None
    meets_requirements_comments: Optional[str] = None


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
    
    # Added by officer
    added_by: Optional[str] = None
    added_at: Optional[datetime] = None
    
    # Evaluation scores (filled by user during evaluation)
    evaluation: Optional[EvaluationCriteria] = None
    evaluated_by: Optional[str] = None  # User ID who evaluated
    evaluated_at: Optional[datetime] = None
    
    # Legacy fields (kept for compatibility)
    technical_score: float = 0.0
    financial_score: float = 0.0
    final_score: float = 0.0
    
    documents: List[str] = []
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== APPROVAL NOTIFICATION MODEL ====================
class ApprovalNotification(BaseModel):
    """Notification for pending approvals"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # User who needs to approve
    user_email: Optional[str] = None
    
    # Reference to the item needing approval
    item_type: str  # "business_request", "contract", "deliverable"
    item_id: str
    item_number: Optional[str] = None
    item_title: Optional[str] = None
    
    # Request details
    requested_by: str
    requested_by_name: Optional[str] = None
    requested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    message: Optional[str] = None
    
    # Status
    status: str = "pending"  # "pending", "approved", "rejected", "expired"
    decision_at: Optional[datetime] = None
    decision_notes: Optional[str] = None
    
    # Notification sent
    email_sent: bool = False
    email_sent_at: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
