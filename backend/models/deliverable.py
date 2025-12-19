"""
Deliverable Model - Contract/PO Deliverables with Payment Authorization & HoP Approval
Replaces the old Invoice model with an integrated deliverables workflow
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class DeliverableStatus(str, Enum):
    """Deliverable workflow status"""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    VALIDATED = "validated"  # AI validation passed
    PENDING_HOP_APPROVAL = "pending_hop_approval"  # Waiting for Head of Procurement
    APPROVED = "approved"  # HoP approved
    REJECTED = "rejected"
    PARTIALLY_ACCEPTED = "partially_accepted"
    PAID = "paid"  # Payment completed


class DeliverableType(str, Enum):
    """Type of deliverable"""
    MILESTONE = "milestone"
    SERVICE_DELIVERY = "service_delivery"
    PRODUCT_DELIVERY = "product_delivery"
    REPORT = "report"
    MONTHLY_INVOICE = "monthly_invoice"
    FINAL_DELIVERY = "final_delivery"
    OTHER = "other"


class Deliverable(BaseModel):
    """
    Deliverable model - represents work items/invoices under a Contract or PO
    Includes integrated Payment Authorization and HoP Approval workflow
    """
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    deliverable_number: Optional[str] = None  # Auto-generated (e.g., DEL-2025-0001)
    
    # References - Must link to Contract OR PO
    contract_id: Optional[str] = None
    po_id: Optional[str] = None
    tender_id: Optional[str] = None  # PR reference
    vendor_id: str
    
    # Core Information
    title: str
    description: str
    deliverable_type: DeliverableType = DeliverableType.MILESTONE
    
    # Vendor Invoice Details
    vendor_invoice_number: Optional[str] = None  # Invoice number from vendor
    vendor_invoice_date: Optional[datetime] = None
    
    # Period (if applicable)
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    due_date: Optional[datetime] = None
    
    # Financial - All amounts in SAR
    amount: float = 0.0
    currency: str = "SAR"  # Fixed to SAR
    percentage_of_contract: Optional[float] = None  # e.g., 25% of contract value
    
    # Line Items (optional - for detailed breakdowns)
    line_items: List[Dict[str, Any]] = []  # [{name, description, quantity, unit_price, total}]
    
    # Status & Workflow
    status: DeliverableStatus = DeliverableStatus.DRAFT
    
    # Submission
    submitted_at: Optional[datetime] = None
    submitted_by: Optional[str] = None
    
    # Officer Review
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    
    # AI Validation (PAF concept)
    ai_validation_summary: Optional[str] = None
    ai_validation_score: Optional[float] = None
    ai_validation_status: Optional[str] = None  # "ready", "ready_with_clarifications", "not_ready"
    ai_validated_at: Optional[datetime] = None
    ai_key_observations: List[str] = []
    ai_required_clarifications: List[str] = []
    ai_advisory_summary: Optional[str] = None
    ai_confidence: Optional[str] = None  # "High", "Medium", "Low"
    
    # HoP Approval (Head of Procurement)
    hop_submitted_at: Optional[datetime] = None
    hop_submitted_by: Optional[str] = None
    hop_decision: Optional[str] = None  # "approved", "rejected", "returned"
    hop_decision_by: Optional[str] = None
    hop_decision_at: Optional[datetime] = None
    hop_decision_notes: Optional[str] = None
    hop_return_reason: Optional[str] = None
    
    # Rejection (from any stage)
    rejection_reason: Optional[str] = None
    rejected_by: Optional[str] = None
    rejected_at: Optional[datetime] = None
    
    # Supporting Documents
    documents: List[str] = []  # Document IDs/URLs
    
    # Payment Information (after approval)
    payment_reference: Optional[str] = None  # e.g., PAF-2025-0001
    payment_date: Optional[datetime] = None
    payment_notes: Optional[str] = None
    
    # Export (for finance system)
    exported: bool = False
    exported_at: Optional[datetime] = None
    exported_by: Optional[str] = None
    export_reference: Optional[str] = None
    
    # Audit
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Audit Trail
    audit_trail: List[Dict[str, Any]] = []


# Keep PaymentAuthorization for backward compatibility but deprecated
class PaymentAuthorizationStatus(str, Enum):
    """Payment Authorization Form status - DEPRECATED, use DeliverableStatus instead"""
    DRAFT = "draft"
    GENERATED = "generated"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"


class PaymentAuthorization(BaseModel):
    """
    Payment Authorization Form (PAF) - DEPRECATED
    Functionality merged into Deliverable model
    Kept for backward compatibility with existing data
    """
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    paf_number: Optional[str] = None
    generated_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    generated_by: Optional[str] = None
    deliverable_id: str
    deliverable_number: Optional[str] = None
    deliverable_description: Optional[str] = None
    deliverable_period_start: Optional[datetime] = None
    deliverable_period_end: Optional[datetime] = None
    vendor_id: str
    vendor_name: Optional[str] = None
    contract_id: Optional[str] = None
    contract_number: Optional[str] = None
    contract_title: Optional[str] = None
    po_id: Optional[str] = None
    po_number: Optional[str] = None
    tender_id: Optional[str] = None
    tender_number: Optional[str] = None
    project_name: Optional[str] = None
    authorized_amount: float
    currency: str = "SAR"
    supporting_documents: List[str] = []
    ai_deliverable_validation: Optional[str] = None
    ai_payment_readiness: Optional[str] = None
    ai_key_observations: List[str] = []
    ai_required_clarifications: List[str] = []
    ai_advisory_summary: Optional[str] = None
    ai_confidence: Optional[str] = None
    status: PaymentAuthorizationStatus = PaymentAuthorizationStatus.GENERATED
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    approval_notes: Optional[str] = None
    rejected_by: Optional[str] = None
    rejected_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    exported: bool = False
    exported_at: Optional[datetime] = None
    exported_by: Optional[str] = None
    export_reference: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    audit_trail: List[Dict[str, Any]] = []
