"""AI client abstraction for ProcureFlix.

This module is a thin facade over the underlying LLM integration. It is
responsible for:

* Exposing high-level domain methods (e.g. analyse_vendor, 
  analyse_tender_proposal, classify_contract)
* Handling the case where no AI key is configured (graceful degradation)
* Hiding provider-specific details from the rest of the codebase

Phase 1 provides stub implementations that return placeholder results so
that the rest of the system can be wired without depending on a live AI
key. Later phases will connect this to the Emergent integrations library.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class ProcureFlixAIClient:
    """High-level AI facade for ProcureFlix.

    In Phase 1 this is a stub that returns deterministic placeholder
    responses. The interface is intentionally small and focused on the
    business use cases we know we need.
    """

    enabled: bool = False

    # ------------------------------------------------------------------
    # Vendor-related helpers
    # ------------------------------------------------------------------

    async def analyse_vendor(self, vendor_payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.enabled:
            return {"summary": "AI disabled", "details": []}
        # Real implementation will call Emergent LLMs here.
        return {"summary": "Stub vendor analysis", "details": []}

    # ------------------------------------------------------------------
    # Tender / evaluation helpers
    # ------------------------------------------------------------------

    async def analyse_tender(self, tender_payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.enabled:
            return {"summary": "AI disabled", "details": []}
        return {"summary": "Stub tender analysis", "details": []}

    async def analyse_tender_proposals(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.enabled:
            return {"summary": "AI disabled", "details": []}
        return {"summary": "Stub tender proposals analysis", "details": []}


_ai_client: Optional[ProcureFlixAIClient] = None


def get_ai_client() -> ProcureFlixAIClient:
    global _ai_client
    if _ai_client is None:
        # For Phase 1 we initialize with enabled=False; later we will
        # introspect environment / Emergent key to toggle this.
        _ai_client = ProcureFlixAIClient(enabled=False)
    return _ai_client
