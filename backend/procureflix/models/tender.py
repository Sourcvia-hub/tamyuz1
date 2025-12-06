"""Tender, Proposal, and evaluation models for ProcureFlix.

These models are aligned with the Sourcevia BRD and SharePoint schemas
but implemented cleanly for ProcureFlix without any MongoDB coupling.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


class TenderStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"
    CANCELLED = "cancelled"
    AWARDED = "awarded"


class ProposalStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    SHORTLISTED = "shortlisted"
    REJECTED = "rejected"
    AWARDED = "awarded"


class EvaluationMethod(str, Enum):
    SIMPLE = "simple"  # one overall score
    TECHNICAL_FINANCIAL = "technical_financial"  # weighted technical + financial


class Tender(BaseModel):
    """ProcureFlix tender entity.

    Matches the Sourcevia tender concepts: auto-numbering, project
    details, budget, deadline, invited vendors and evaluation model.
    """

    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid4()))
    tender_number: Optional[str] = Field(
        default=None,
        description="Auto-generated number, e.g. Tender-25-0001",
    )

    title: str
    description: str
    project_reference: Optional[str] = None
    project_name: str
    requirements: str

    budget: float
    deadline: datetime

    status: TenderStatus = TenderStatus.DRAFT

    invited_vendors: List[str] = Field(
        default_factory=list,
        description="List of vendor IDs invited to this tender",
    )

    # Evaluation configuration
    evaluation_method: EvaluationMethod = EvaluationMethod.TECHNICAL_FINANCIAL
    technical_weight: float = 0.6
    financial_weight: float = 0.4

    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Evaluation summary is stored as a lightweight JSON blob so the
    # schema remains flexible for future refinements.
    evaluation_summary: Optional[Dict[str, Any]] = None


class Proposal(BaseModel):
    """Proposal submitted by a vendor for a tender."""

    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid4()))
    tender_id: str
    vendor_id: str

    # High-level fields
    title: str
    summary: Optional[str] = None

    # Scoring-related fields (0–100 scale expected for scores)
    technical_score: Optional[float] = None
    financial_score: Optional[float] = None
    total_score: Optional[float] = None

    currency: Optional[str] = None
    amount: Optional[float] = None

    status: ProposalStatus = ProposalStatus.SUBMITTED
    comments: Optional[str] = None

    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Free-form metadata to keep the model extensible
    metadata: Dict[str, Any] = Field(default_factory=dict)



class TenderCreateRequest(BaseModel):
    """Simplified tender creation request model.
    
    This model contains only essential fields needed to create a new tender.
    System fields (tender_number, status, timestamps, etc.) are auto-generated.
    """
    
    model_config = ConfigDict(extra="ignore")
    
    # Basic tender information (required)
    title: str = Field(..., min_length=5, description="Tender title")
    description: str = Field(..., min_length=20, description="Detailed tender description")
    project_name: str = Field(..., description="Project name")
    requirements: str = Field(..., min_length=20, description="Technical and functional requirements")
    
    # Financial & timeline
    budget: float = Field(..., gt=0, description="Total tender budget")
    deadline: datetime = Field(..., description="Submission deadline")
    
    # Optional fields
    project_reference: Optional[str] = Field(None, description="External project reference/code")
    invited_vendors: List[str] = Field(default_factory=list, description="List of vendor IDs to invite")
    
    # Evaluation configuration (optional with defaults)
    evaluation_method: EvaluationMethod = Field(
        default=EvaluationMethod.TECHNICAL_FINANCIAL,
        description="Evaluation method"
    )
    technical_weight: float = Field(
        default=0.6,
        ge=0.0,
        le=1.0,
        description="Technical evaluation weight (0-1)"
    )
    financial_weight: float = Field(
        default=0.4,
        ge=0.0,
        le=1.0,
        description="Financial evaluation weight (0-1)"
    )
    
    created_by: Optional[str] = Field(None, description="User who created the tender")

