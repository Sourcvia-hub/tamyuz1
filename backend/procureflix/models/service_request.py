"""Service request (OSR) model for ProcureFlix."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


class ServiceRequestStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    CLOSED = "closed"


class ServiceRequestPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class ServiceRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid4()))

    title: str
    description: str

    vendor_id: str
    contract_id: Optional[str] = None
    asset_id: Optional[str] = None

    priority: ServiceRequestPriority = ServiceRequestPriority.MEDIUM
    status: ServiceRequestStatus = ServiceRequestStatus.OPEN

    requester: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
