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


class ServiceRequestCategory(str, Enum):
    """Service request categories aligned with Asset categories"""
    IT_EQUIPMENT = "IT Equipment"
    FURNITURE = "Furniture"
    HVAC_SYSTEMS = "HVAC Systems"
    SECURITY_EQUIPMENT = "Security Equipment"
    OFFICE_EQUIPMENT = "Office Equipment"
    ELECTRICAL_EQUIPMENT = "Electrical Equipment"
    COMMUNICATION_SYSTEMS = "Communication Systems"
    KITCHEN_EQUIPMENT = "Kitchen Equipment"
    VEHICLES = "Vehicles"
    TOOLS_EQUIPMENT = "Tools & Equipment"
    GENERAL = "General"  # For non-asset related requests


class ServiceRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid4()))

    title: str
    description: str

    # Category and Location
    category: Optional[ServiceRequestCategory] = ServiceRequestCategory.GENERAL
    building_id: Optional[str] = None
    building_name: Optional[str] = None
    floor_id: Optional[str] = None
    floor_name: Optional[str] = None
    room_area: Optional[str] = None

    vendor_id: str
    contract_id: Optional[str] = None
    asset_id: Optional[str] = None

    priority: ServiceRequestPriority = ServiceRequestPriority.MEDIUM
    status: ServiceRequestStatus = ServiceRequestStatus.OPEN

    requester: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
