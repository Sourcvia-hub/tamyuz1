"""
Contract models
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
    APPROVED = "approved"
    ACTIVE = "active"
    EXPIRED = "expired"


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

