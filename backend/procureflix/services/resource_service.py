"""Resource business logic for ProcureFlix."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from ..models import Resource, ResourceStatus
from ..repositories.resource_repository import InMemoryResourceRepository


class ResourceService:
    def __init__(self, repository: InMemoryResourceRepository) -> None:
        self._repository = repository

    def list_resources(self) -> List[Resource]:
        return self._repository.list()

    def get_resource(self, resource_id: str) -> Optional[Resource]:
        return self._repository.get(resource_id)

    def create_resource(self, resource: Resource) -> Resource:
        now = datetime.now(timezone.utc)
        resource.created_at = now
        resource.updated_at = now
        return self._repository.add(resource)

    def update_resource(self, resource_id: str, updated: Resource) -> Optional[Resource]:
        existing = self._repository.get(resource_id)
        if not existing:
            return None
        updated.id = resource_id
        updated.created_at = existing.created_at
        updated.updated_at = datetime.now(timezone.utc)
        return self._repository.update(resource_id, updated)

    def change_status(self, resource_id: str, status: ResourceStatus) -> Optional[Resource]:
        resource = self._repository.get(resource_id)
        if not resource:
            return None
        resource.status = status
        resource.updated_at = datetime.now(timezone.utc)
        return self._repository.update(resource_id, resource)
