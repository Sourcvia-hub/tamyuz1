"""Vendor-related business logic for ProcureFlix.

Phase 2 expands the vendor slice to include:
- auto-numbering for vendors
- risk scoring based on registration completeness and DD questionnaire
- status and DD lifecycle flags
- hooks for AI explanations (via ProcureFlixAIClient, wired later)
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List

from ..ai import get_ai_client
from ..models import (
    RiskCategory,
    Vendor,
    VendorStatus,
)
from ..repositories import InMemoryVendorRepository


class VendorService:
    """Application service for vendor operations."""

    def __init__(self, repository: InMemoryVendorRepository) -> None:
        self._repository = repository
        # Simple in-memory counter for auto-numbering
        self._counter: int = 0

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    def list_vendors(self) -> List[Vendor]:
        return self._repository.list()

    def get_vendor(self, vendor_id: str) -> Vendor | None:
        return self._repository.get(vendor_id)

    # ------------------------------------------------------------------
    # Commands
    # ------------------------------------------------------------------

    def create_vendor(self, vendor: Vendor) -> Vendor:
        """Create a new vendor with risk initialization and auto-numbering."""

        now = datetime.now(timezone.utc)
        vendor.created_at = now
        vendor.updated_at = now

        if not vendor.vendor_number:
            vendor.vendor_number = self._generate_vendor_number(now)

        self._apply_registration_risk(vendor)
        self._determine_dd_requirements(vendor)

        return self._repository.add(vendor)

    def update_vendor(self, vendor_id: str, updated: Vendor) -> Vendor | None:
        existing = self._repository.get(vendor_id)
        if not existing:
            return None

        updated.id = vendor_id
        updated.vendor_number = existing.vendor_number or updated.vendor_number
        updated.created_at = existing.created_at
        updated.created_by = existing.created_by
        updated.updated_at = datetime.now(timezone.utc)

        self._apply_registration_risk(updated)
        self._determine_dd_requirements(updated)

        return self._repository.update(vendor_id, updated)

    def submit_due_diligence(self, vendor_id: str, dd_updates: Dict[str, object], user_id: str | None = None) -> Vendor | None:
        vendor = self._repository.get(vendor_id)
        if not vendor:
            return None

        # Apply incoming DD fields onto the vendor model
        for key, value in dd_updates.items():
            if hasattr(vendor, key):
                setattr(vendor, key, value)

        vendor.dd_completed = True
        vendor.dd_completed_by = user_id
        vendor.dd_completed_at = datetime.now(timezone.utc)

        # Recompute DD-based risk contribution
        self._apply_registration_risk(vendor)
        self._apply_due_diligence_risk(vendor)
        self._determine_dd_requirements(vendor)

        # If DD is completed and not high risk, vendor can move to approved
        if vendor.dd_required and vendor.dd_completed and vendor.risk_category in {RiskCategory.LOW, RiskCategory.MEDIUM}:
            vendor.status = VendorStatus.APPROVED

        vendor.updated_at = datetime.now(timezone.utc)
        return self._repository.update(vendor_id, vendor)

    def set_status(self, vendor_id: str, status: VendorStatus) -> Vendor | None:
        vendor = self._repository.get(vendor_id)
        if not vendor:
            return None

        vendor.status = status
        vendor.updated_at = datetime.now(timezone.utc)
        return self._repository.update(vendor_id, vendor)

    # ------------------------------------------------------------------
    # AI helpers (stubbed for now)
    # ------------------------------------------------------------------

    async def get_risk_explanation(self, vendor: Vendor) -> Dict[str, object]:
        ai = get_ai_client()
        payload = vendor.model_dump()
        return await ai.analyse_vendor(payload)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _generate_vendor_number(self, now: datetime) -> str:
        """Generate a human-friendly vendor number: Vendor-YY-NNNN.

        Since we are in-memory for now, this counter is process-local and
        resets on restart, which is acceptable for demo data.
        """

        year_suffix = now.year % 100
        self._counter += 1
        return f"Vendor-{year_suffix:02d}-{self._counter:04d}"

    def _apply_registration_risk(self, vendor: Vendor) -> None:
        """Set baseline risk based on registration completeness.

        This mirrors the spirit of the Sourcevia logic without copying it
        verbatim: missing documents and weak company profile increase risk.
        """

        score = 0.0
        details: Dict[str, Dict[str, object]] = {}

        if not vendor.documents:
            score += 30
            details["missing_documents"] = {"score": 30, "reason": "No documents uploaded"}

        if not vendor.bank_name or not vendor.iban:
            score += 20
            details["incomplete_banking"] = {"score": 20, "reason": "Missing bank information"}

        # Short CR or license validity indicates higher risk
        now = datetime.now(timezone.utc)
        days_to_cr_expiry = (vendor.cr_expiry_date - now).days
        if days_to_cr_expiry < 90:
            score += 15
            details["cr_expiring_soon"] = {"score": 15, "reason": f"CR expires in {days_to_cr_expiry} days"}

        if vendor.license_expiry_date is not None:
            days_to_license_expiry = (vendor.license_expiry_date - now).days
            if days_to_license_expiry < 90:
                score += 10
                details["license_expiring_soon"] = {
                    "score": 10,
                    "reason": f"License expires in {days_to_license_expiry} days",
                }

        if vendor.number_of_employees < 5:
            score += 10
            details["small_team"] = {
                "score": 10,
                "reason": f"Only {vendor.number_of_employees} employees",
            }

        vendor.risk_score = score
        vendor.risk_assessment_details = details
        vendor.risk_category = self._risk_category_from_score(score)

    def _apply_due_diligence_risk(self, vendor: Vendor) -> None:
        """Adjust risk based on DD questionnaire answers.

        We approximate the legacy scoring by grouping DD questions into
        positive and negative indicators.
        """

        # Start from existing registration risk
        score = vendor.risk_score

        # Positive indicators (good practices) reduce risk when True
        positive_booleans = [
            vendor.dd_bc_alternative_locations,
            vendor.dd_bc_certified_standard,
            vendor.dd_bc_staff_assigned,
            vendor.dd_bc_risks_assessed,
            vendor.dd_bc_essential_activities_identified,
            vendor.dd_bc_strategy_exists,
            vendor.dd_bc_management_trained,
            vendor.dd_bc_staff_aware,
            vendor.dd_bc_it_continuity_plan,
            vendor.dd_bc_critical_data_backed_up,
            vendor.dd_bc_vital_documents_offsite,
            vendor.dd_fraud_whistle_blowing_mechanism,
            vendor.dd_fraud_prevention_procedures,
            vendor.dd_op_documented_procedures,
            vendor.dd_op_internal_audit,
            vendor.dd_op_insurance_contracts,
        ]

        # Negative indicators (red flags) increase risk when True
        negative_booleans = [
            vendor.dd_ownership_change_last_year,
            vendor.dd_financial_obligations_default,
            vendor.dd_bc_business_stopped_over_week,
            vendor.dd_fraud_internal_last_year,
            vendor.dd_fraud_burglary_theft_last_year,
            vendor.dd_op_criminal_cases_last_3years,
            vendor.dd_op_customer_complaints_last_year,
            vendor.dd_cyber_cloud_services,
            vendor.dd_cyber_data_outside_ksa,
            vendor.dd_cyber_remote_access_outside_ksa,
            vendor.dd_cyber_card_payments,
            vendor.dd_cyber_third_party_access,
        ]

        # Each good practice reduces risk slightly, each red flag increases it
        for flag in positive_booleans:
            if flag is True:
                score = max(0.0, score - 1.0)

        for flag in negative_booleans:
            if flag is True:
                score += 2.0

        vendor.risk_score = score
        vendor.risk_category = self._risk_category_from_score(score)

    def _determine_dd_requirements(self, vendor: Vendor) -> None:
        """Set dd_required and status based on current risk and checklist.

        - High risk vendors automatically require DD.
        - If DD checklist fields are populated, vendor moves to
          PENDING_DUE_DILIGENCE.
        - If full DD questionnaire is provided, vendor can be considered
          DD-completed (subject to risk).
        """

        vendor.dd_required = vendor.risk_category in {RiskCategory.HIGH, RiskCategory.VERY_HIGH}

        checklist_present = any(
            value is True
            for value in [
                vendor.dd_checklist_supporting_documents,
                vendor.dd_checklist_related_party_checked,
                vendor.dd_checklist_sanction_screening,
            ]
        )

        dd_fields_present = any(
            getattr(vendor, name) is not None
            for name in [
                "dd_ownership_change_last_year",
                "dd_bc_rely_on_third_parties",
                "dd_fraud_whistle_blowing_mechanism",
                "dd_op_documented_procedures",
                "dd_hr_background_investigation",
            ]
        )

        if dd_fields_present:
            vendor.dd_completed = True
            vendor.status = VendorStatus.APPROVED
        elif checklist_present:
            vendor.dd_completed = False
            vendor.status = VendorStatus.PENDING_DUE_DILIGENCE
        else:
            # No checklist and no DD fields -> default path
            vendor.status = VendorStatus.APPROVED if not vendor.dd_required else VendorStatus.PENDING_DUE_DILIGENCE

    @staticmethod
    def _risk_category_from_score(score: float) -> RiskCategory:
        if score >= 50:
            return RiskCategory.VERY_HIGH
        if score >= 30:
            return RiskCategory.HIGH
        if score >= 15:
            return RiskCategory.MEDIUM
        return RiskCategory.LOW
