"""Resource model for ProcureFlix.

Represents a human or service resource used in contract delivery.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


class ResourceStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class Resource(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    role: str

    vendor_id: str
    contract_id: Optional[str] = None
    assigned_to_project: Optional[str] = None

    status: ResourceStatus = ResourceStatus.ACTIVE

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
