"""
Invoice models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid

class InvoiceStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    APPROVED = "approved"
    PAID = "paid"
    REJECTED = "rejected"


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

