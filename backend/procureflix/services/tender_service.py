"""Tender, proposals and evaluation logic for ProcureFlix."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

from ..ai import get_ai_client
from ..models import (
    EvaluationMethod,
    Proposal,
    ProposalStatus,
    Tender,
    TenderStatus,
)
from ..repositories.tender_repository import (
    InMemoryProposalRepository,
    InMemoryTenderRepository,
)


class TenderService:
    """Application service for managing tenders and proposals."""

    def __init__(
        self,
        tender_repo: InMemoryTenderRepository,
        proposal_repo: InMemoryProposalRepository,
    ) -> None:
        self._tenders = tender_repo
        self._proposals = proposal_repo
        self._counter: int = 0

    # ------------------------------------------------------------------
    # Tender queries
    # ------------------------------------------------------------------

    def list_tenders(self) -> List[Tender]:
        return self._tenders.list()

    def get_tender(self, tender_id: str) -> Optional[Tender]:
        return self._tenders.get(tender_id)

    # ------------------------------------------------------------------
    # Tender commands
    # ------------------------------------------------------------------

    def create_tender(self, tender: Tender) -> Tender:
        now = datetime.now(timezone.utc)
        tender.created_at = now
        tender.updated_at = now

        if not tender.tender_number:
            tender.tender_number = self._generate_tender_number(now)

        tender.status = TenderStatus.DRAFT
        tender.evaluation_summary = None

        return self._tenders.add(tender)

    def update_tender(self, tender_id: str, updated: Tender) -> Optional[Tender]:
        existing = self._tenders.get(tender_id)
        if not existing:
            return None

        updated.id = tender_id
        updated.tender_number = existing.tender_number or updated.tender_number
        updated.created_at = existing.created_at
        updated.created_by = existing.created_by
        updated.updated_at = datetime.now(timezone.utc)

        return self._tenders.update(tender_id, updated)

    def publish_tender(self, tender_id: str) -> Optional[Tender]:
        tender = self._tenders.get(tender_id)
        if not tender:
            return None
        tender.status = TenderStatus.PUBLISHED
        tender.updated_at = datetime.now(timezone.utc)
        return self._tenders.update(tender_id, tender)

    def close_tender(self, tender_id: str) -> Optional[Tender]:
        tender = self._tenders.get(tender_id)
        if not tender:
            return None
        tender.status = TenderStatus.CLOSED
        tender.updated_at = datetime.now(timezone.utc)
        return self._tenders.update(tender_id, tender)

    # ------------------------------------------------------------------
    # Proposal queries & commands
    # ------------------------------------------------------------------

    def list_proposals_for_tender(self, tender_id: str) -> List[Proposal]:
        return [p for p in self._proposals.list() if p.tender_id == tender_id]

    def submit_proposal(self, tender_id: str, proposal: Proposal) -> Optional[Proposal]:
        tender = self._tenders.get(tender_id)
        if not tender:
            return None

        proposal.tender_id = tender_id
        proposal.submitted_at = datetime.now(timezone.utc)
        proposal.updated_at = proposal.submitted_at
        proposal.status = ProposalStatus.SUBMITTED

        created = self._proposals.add(proposal)

        # Recompute evaluation summary whenever a new proposal arrives
        self._recompute_evaluation(tender_id)
        return created

    # ------------------------------------------------------------------
    # Evaluation logic
    # ------------------------------------------------------------------

    def get_evaluation(self, tender_id: str) -> Optional[Dict[str, object]]:
        tender = self._tenders.get(tender_id)
        if not tender:
            return None
        # Ensure evaluation_summary is up to date
        if tender.evaluation_summary is None:
            self._recompute_evaluation(tender_id)
            tender = self._tenders.get(tender_id)
        return tender.evaluation_summary

    def evaluate_now(self, tender_id: str) -> Optional[Dict[str, object]]:
        self._recompute_evaluation(tender_id)
        tender = self._tenders.get(tender_id)
        return tender.evaluation_summary if tender else None

    # ------------------------------------------------------------------
    # AI helpers (stubbed)
    # ------------------------------------------------------------------

    async def get_tender_summary(self, tender_id: str) -> Dict[str, object]:
        ai = get_ai_client()
        tender = self._tenders.get(tender_id)
        if not tender:
            return {"error": "tender_not_found"}
        payload = tender.model_dump()
        # Placeholder behaviour
        if not ai.enabled:
            return {"summary": f"AI disabled for tender {tender.tender_number}", "details": []}
        # Real implementation will delegate to ai.analyse_tender
        return await ai.analyse_tender(payload)

    async def get_evaluation_suggestions(self, tender_id: str) -> Dict[str, object]:
        ai = get_ai_client()
        tender = self._tenders.get(tender_id)
        if not tender:
            return {"error": "tender_not_found"}
        proposals = self.list_proposals_for_tender(tender_id)
        payload = {
            "tender": tender.model_dump(),
            "proposals": [p.model_dump() for p in proposals],
        }
        if not ai.enabled:
            return {
                "summary": f"AI disabled for tender {tender.tender_number}",
                "details": [],
            }
        return await ai.analyse_tender_proposals(payload)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _generate_tender_number(self, now: datetime) -> str:
        """Generate Tender-YY-NNNN style numbers."""
        year_suffix = now.year % 100
        self._counter += 1
        return f"Tender-{year_suffix:02d}-{self._counter:04d}"

    def _recompute_evaluation(self, tender_id: str) -> None:
        tender = self._tenders.get(tender_id)
        if not tender:
            return

        proposals = self.list_proposals_for_tender(tender_id)
        if not proposals:
            tender.evaluation_summary = None
            self._tenders.update(tender_id, tender)
            return

        if tender.evaluation_method == EvaluationMethod.SIMPLE:
            self._evaluate_simple(tender, proposals)
        else:
            self._evaluate_technical_financial(tender, proposals)

    def _evaluate_simple(self, tender: Tender, proposals: List[Proposal]) -> None:
        # Use total_score directly, defaulting to 0.0
        for p in proposals:
            if p.total_score is None:
                p.total_score = float(p.technical_score or 0.0)
                self._proposals.update(p.id, p)

        sorted_props = sorted(proposals, key=lambda p: p.total_score or 0.0, reverse=True)
        best = sorted_props[0]

        tender.evaluation_summary = {
            "method": "simple",
            "best_proposal_id": best.id,
            "recommended_vendor_id": best.vendor_id,
            "proposals": [
                {
                    "proposal_id": p.id,
                    "vendor_id": p.vendor_id,
                    "total_score": p.total_score,
                }
                for p in sorted_props
            ],
        }
        tender.status = TenderStatus.AWARDED
        self._tenders.update(tender.id, tender)

    def _evaluate_technical_financial(self, tender: Tender, proposals: List[Proposal]) -> None:
        tw = tender.technical_weight
        fw = tender.financial_weight
        if tw + fw == 0:
            tw, fw = 0.6, 0.4

        scored: List[Proposal] = []
        for p in proposals:
            tech = p.technical_score or 0.0
            fin = p.financial_score or 0.0
            p.total_score = tech * tw + fin * fw
            self._proposals.update(p.id, p)
            scored.append(p)

        sorted_props = sorted(scored, key=lambda p: p.total_score or 0.0, reverse=True)
        best = sorted_props[0]

        tender.evaluation_summary = {
            "method": "technical_financial",
            "weights": {"technical": tw, "financial": fw},
            "best_proposal_id": best.id,
            "recommended_vendor_id": best.vendor_id,
            "proposals": [
                {
                    "proposal_id": p.id,
                    "vendor_id": p.vendor_id,
                    "technical_score": p.technical_score,
                    "financial_score": p.financial_score,
                    "total_score": p.total_score,
                }
                for p in sorted_props
            ],
        }
        tender.status = TenderStatus.AWARDED
        self._tenders.update(tender.id, tender)
