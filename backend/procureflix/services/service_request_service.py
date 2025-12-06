"""Service request (OSR) business logic for ProcureFlix."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from ..models import ServiceRequest, ServiceRequestStatus
from ..repositories.service_request_repository import InMemoryServiceRequestRepository


class ServiceRequestService:
    def __init__(self, repository: InMemoryServiceRequestRepository) -> None:
        self._repository = repository

    def list_service_requests(self) -> List[ServiceRequest]:
        return self._repository.list()

    def get_service_request(self, sr_id: str) -> Optional[ServiceRequest]:
        return self._repository.get(sr_id)

    def create_service_request(self, sr: ServiceRequest) -> ServiceRequest:
        now = datetime.now(timezone.utc)
        sr.created_at = now
        sr.updated_at = now
        sr.status = ServiceRequestStatus.OPEN
        return self._repository.add(sr)

    def update_service_request(self, sr_id: str, updated: ServiceRequest) -> Optional[ServiceRequest]:
        existing = self._repository.get(sr_id)
        if not existing:
            return None
        updated.id = sr_id
        updated.created_at = existing.created_at
        updated.updated_at = datetime.now(timezone.utc)
        return self._repository.update(sr_id, updated)

    def change_status(self, sr_id: str, status: ServiceRequestStatus) -> Optional[ServiceRequest]:
        sr = self._repository.get(sr_id)
        if not sr:
            return None

        # Simple lifecycle: open -> in_progress -> closed
        if status == ServiceRequestStatus.IN_PROGRESS and sr.status == ServiceRequestStatus.OPEN:
            sr.status = status
        elif status == ServiceRequestStatus.CLOSED and sr.status in {ServiceRequestStatus.OPEN, ServiceRequestStatus.IN_PROGRESS}:
            sr.status = status
        else:
            sr.status = status  # allow manual override

        sr.updated_at = datetime.now(timezone.utc)
        return self._repository.update(sr_id, sr)
