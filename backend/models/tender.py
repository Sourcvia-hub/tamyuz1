"""
Tender and Proposal models - Business Request (PR)
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid

class TenderStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"
    AWARDED = "awarded"


class Tender(BaseModel):
    """
    Business Request (PR) model - renamed from Tender
    Includes Contract Context Questionnaire for governance workflow
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
    created_by: Optional[str] = None  # user ID who created
    awarded_to: Optional[str] = None  # vendor ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # ==================== CONTRACT CONTEXT QUESTIONNAIRE ====================
    # These fields are filled by Business User during PR creation
    # Used to determine outsourcing/cloud indicators early in the process
    
    # Q1: Does the service require access to company systems or data?
    ctx_requires_system_data_access: Optional[str] = None  # "yes", "no", "unknown"
    
    # Q2: Is the service cloud-based?
    ctx_is_cloud_based: Optional[str] = None  # "yes", "no", "unknown"
    
    # Q3: Is the vendor operating a service on behalf of the company? (Outsourcing indicator)
    ctx_is_outsourcing_service: Optional[str] = None  # "yes", "no", "unknown"
    
    # Q4: Expected data location
    ctx_expected_data_location: Optional[str] = None  # "inside_ksa", "outside_ksa", "unknown"
    
    # Q5: Is onsite presence required?
    ctx_requires_onsite_presence: Optional[str] = None  # "yes", "no"
    
    # Q6: Expected contract duration
    ctx_expected_duration: Optional[str] = None  # "less_than_6_months", "6_to_12_months", "more_than_12_months"
    
    # Procurement Officer validation
    ctx_validated_by_procurement: bool = False
    ctx_validated_by: Optional[str] = None
    ctx_validated_at: Optional[datetime] = None
    ctx_procurement_notes: Optional[str] = None

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

