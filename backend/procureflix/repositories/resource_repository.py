"""In-memory repository for resources in ProcureFlix."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, List, Optional

from ..models import Resource
from .base import IRepository


@dataclass
class _ResourceRecord:
    id: str
    resource: Resource


class InMemoryResourceRepository(IRepository[Resource]):
    def __init__(self, seed_path: Optional[Path] = None) -> None:
        self._items: List[_ResourceRecord] = []
        if seed_path is not None and seed_path.exists():
            self._load_seed(seed_path)

    def list(self) -> List[Resource]:
        return [r.resource for r in self._items]

    def get(self, item_id: str) -> Optional[Resource]:
        for r in self._items:
            if r.id == item_id:
                return r.resource
        return None

    def add(self, item: Resource) -> Resource:
        now = datetime.now(timezone.utc)
        item.created_at = item.created_at or now
        item.updated_at = now
        self._items.append(_ResourceRecord(id=item.id, resource=item))
        return item

    def update(self, item_id: str, item: Resource) -> Optional[Resource]:
        for idx, r in enumerate(self._items):
            if r.id == item_id:
                item.updated_at = datetime.now(timezone.utc)
                self._items[idx] = _ResourceRecord(id=item_id, resource=item)
                return item
        return None

    def delete(self, item_id: str) -> bool:
        before = len(self._items)
        self._items = [r for r in self._items if r.id != item_id]
        return len(self._items) != before

    def bulk_seed(self, items: Iterable[Resource]) -> None:
        self._items = [_ResourceRecord(id=i.id, resource=i) for i in items]

    def _load_seed(self, seed_path: Path) -> None:
        try:
            raw = json.loads(seed_path.read_text(encoding="utf-8"))
            resources = [Resource(**entry) for entry in raw]
            self.bulk_seed(resources)
        except Exception as exc:  # pragma: no cover
            print(f"[ProcureFlix] Failed to load resource seed data: {exc}")
