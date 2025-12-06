"""In-memory repository for service requests (OSR) in ProcureFlix."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, List, Optional

from ..models import ServiceRequest
from .base import IRepository


@dataclass
class _SRRecord:
    id: str
    sr: ServiceRequest


class InMemoryServiceRequestRepository(IRepository[ServiceRequest]):
    def __init__(self, seed_path: Optional[Path] = None) -> None:
        self._items: List[_SRRecord] = []
        if seed_path is not None and seed_path.exists():
            self._load_seed(seed_path)

    def list(self) -> List[ServiceRequest]:
        return [r.sr for r in self._items]

    def get(self, item_id: str) -> Optional[ServiceRequest]:
        for r in self._items:
            if r.id == item_id:
                return r.sr
        return None

    def add(self, item: ServiceRequest) -> ServiceRequest:
        now = datetime.now(timezone.utc)
        item.created_at = item.created_at or now
        item.updated_at = now
        self._items.append(_SRRecord(id=item.id, sr=item))
        return item

    def update(self, item_id: str, item: ServiceRequest) -> Optional[ServiceRequest]:
        for idx, r in enumerate(self._items):
            if r.id == item_id:
                item.updated_at = datetime.now(timezone.utc)
                self._items[idx] = _SRRecord(id=item_id, sr=item)
                return item
        return None

    def delete(self, item_id: str) -> bool:
        before = len(self._items)
        self._items = [r for r in self._items if r.id != item_id]
        return len(self._items) != before

    def bulk_seed(self, items: Iterable[ServiceRequest]) -> None:
        self._items = [_SRRecord(id=i.id, sr=i) for i in items]

    def _load_seed(self, seed_path: Path) -> None:
        try:
            raw = json.loads(seed_path.read_text(encoding="utf-8"))
            srs = [ServiceRequest(**entry) for entry in raw]
            self.bulk_seed(srs)
        except Exception as exc:  # pragma: no cover
            print(f"[ProcureFlix] Failed to load service request seed data: {exc}")
