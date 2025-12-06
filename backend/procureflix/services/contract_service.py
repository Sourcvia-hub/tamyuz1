"""Contract business logic for ProcureFlix."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

from ..ai import get_ai_client
from ..models import (
    Contract,
    ContractCreateRequest,
    ContractStatus,
    ContractType,
    CriticalityLevel,
    RiskCategory,
)
from ..repositories.contract_repository import InMemoryContractRepository


class ContractService:
    """Application service for contracts in ProcureFlix."""

    def __init__(self, repository: InMemoryContractRepository) -> None:
        self._repository = repository
        self._counter: int = 0

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    def list_contracts(self) -> List[Contract]:
        return self._repository.list()

    def get_contract(self, contract_id: str) -> Optional[Contract]:
        return self._repository.get(contract_id)

    # ------------------------------------------------------------------
    # Commands
    # ------------------------------------------------------------------

    def create_contract(self, contract: Contract) -> Contract:
        now = datetime.now(timezone.utc)
        contract.created_at = now
        contract.updated_at = now

        if not contract.contract_number:
            contract.contract_number = self._generate_contract_number(now)

        self._apply_risk_and_dd_logic(contract)
        return self._repository.add(contract)

    def update_contract(self, contract_id: str, updated: Contract) -> Optional[Contract]:
        existing = self._repository.get(contract_id)
        if not existing:
            return None

        updated.id = contract_id
        updated.contract_number = existing.contract_number or updated.contract_number
        updated.created_at = existing.created_at
        updated.created_by = existing.created_by
        updated.updated_at = datetime.now(timezone.utc)

        self._apply_risk_and_dd_logic(updated)
        return self._repository.update(contract_id, updated)

    def change_status(self, contract_id: str, status: ContractStatus) -> Optional[Contract]:
        contract = self._repository.get(contract_id)
        if not contract:
            return None

        # Basic transition rules similar to Sourcevia
        if status == ContractStatus.PENDING_APPROVAL and contract.status == ContractStatus.DRAFT:
            contract.status = status
        elif status == ContractStatus.ACTIVE and contract.status in {ContractStatus.PENDING_APPROVAL, ContractStatus.DRAFT}:
            contract.status = status
        elif status == ContractStatus.EXPIRED:
            contract.status = status
        elif status == ContractStatus.TERMINATED:
            contract.status = status
            contract.terminated_at = datetime.now(timezone.utc)
        else:
            # For now we allow idempotent re-sets of the same status
            contract.status = status

        contract.updated_at = datetime.now(timezone.utc)
        return self._repository.update(contract_id, contract)

    def mark_expired_if_past_end_date(self, contract_id: str) -> Optional[Contract]:
        contract = self._repository.get(contract_id)
        if not contract:
            return None
        now = datetime.now(timezone.utc)
        if contract.end_date < now and contract.status == ContractStatus.ACTIVE:
            contract.status = ContractStatus.EXPIRED
            contract.updated_at = now
            return self._repository.update(contract_id, contract)
        return contract

    # ------------------------------------------------------------------
    # AI helpers (stubbed)
    # ------------------------------------------------------------------

    async def get_contract_analysis(self, contract_id: str) -> Dict[str, object]:
        ai = get_ai_client()
        contract = self._repository.get(contract_id)
        if not contract:
            return {"error": "contract_not_found"}
        payload = contract.model_dump()
        if not ai.enabled:
            return {"summary": f"AI disabled for contract {contract.contract_number}", "details": []}
        return await ai.analyse_contract(payload)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _generate_contract_number(self, now: datetime) -> str:
        """Generate Contract-YY-NNNN style numbers."""
        year_suffix = now.year % 100
        self._counter += 1
        return f"Contract-{year_suffix:02d}-{self._counter:04d}"

    def _apply_risk_and_dd_logic(self, contract: Contract) -> None:
        """Set risk_score, risk_category, dd_required, and noc_required.

        The rules follow the spirit of the Sourcevia logic:
        - Outsourcing & cloud contracts are inherently higher risk
        - Data access, on-site presence, implementation work and high
          criticality all raise risk
        - High/very-high risk contracts require DD and often NOC
        """

        score = 0.0

        # Base score by contract type
        if contract.contract_type == ContractType.OUTSOURCING:
            score += 25
        elif contract.contract_type == ContractType.CLOUD:
            score += 20

        # Risk drivers
        if contract.has_data_access:
            score += 20
        if contract.has_onsite_presence:
            score += 15
        if contract.has_implementation:
            score += 10

        if contract.criticality_level == CriticalityLevel.HIGH:
            score += 20
        elif contract.criticality_level == CriticalityLevel.MEDIUM:
            score += 10

        contract.risk_score = score
        contract.risk_category = self._risk_category_from_score(score)

        # DD required for high risk or any outsourcing/cloud with key risk flags
        contract.dd_required = contract.risk_category in {RiskCategory.HIGH, RiskCategory.VERY_HIGH} or (
            contract.contract_type in {ContractType.OUTSOURCING, ContractType.CLOUD}
            and (contract.has_data_access or contract.has_onsite_presence or contract.has_implementation)
        )

        # NOC typically required for outsourcing arrangements with
        # on-site presence or data access, especially when critical
        contract.noc_required = (
            contract.contract_type == ContractType.OUTSOURCING
            and (contract.has_data_access or contract.has_onsite_presence)
        ) or (
            contract.contract_type == ContractType.CLOUD and contract.has_data_access
        )

    @staticmethod
    def _risk_category_from_score(score: float) -> RiskCategory:
        if score >= 50:
            return RiskCategory.VERY_HIGH
        if score >= 30:
            return RiskCategory.HIGH
        if score >= 15:
            return RiskCategory.MEDIUM
        return RiskCategory.LOW
