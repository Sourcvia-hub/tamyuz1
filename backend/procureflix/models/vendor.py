"""Vendor domain model for ProcureFlix.

This model mirrors the business fields used in Sourcevia and the
SharePoint vendor schema, but is storage-agnostic and designed to work
with ProcureFlix's clean architecture (repositories + services).
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class VendorType(str, Enum):
    LOCAL = "local"
    INTERNATIONAL = "international"


class VendorStatus(str, Enum):
    PENDING = "pending"
    PENDING_DUE_DILIGENCE = "pending_due_diligence"
    APPROVED = "approved"
    REJECTED = "rejected"
    BLACKLISTED = "blacklisted"


class RiskCategory(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


class Vendor(BaseModel):
    """Core vendor entity for ProcureFlix.

    Field set is aligned with the SharePoint schema and legacy Sourcevia
    business logic, but this model is decoupled from any particular
    storage engine.
    """

    model_config = ConfigDict(extra="ignore")

    # Identity & numbering
    id: str = Field(default_factory=lambda: str(uuid4()))
    vendor_number: Optional[str] = Field(
        default=None,
        description="Auto-generated number, e.g. Vendor-25-0001",
    )
    vendor_type: VendorType = VendorType.LOCAL

    # Company information
    name_english: str
    commercial_name: str
    entity_type: str
    vat_number: str
    unified_number: Optional[str] = None
    cr_number: str
    cr_expiry_date: datetime
    cr_country_city: str
    license_number: Optional[str] = None
    license_expiry_date: Optional[datetime] = None
    activity_description: str
    number_of_employees: int

    # Address & contact
    street: str
    building_no: str
    city: str
    district: str
    country: str
    mobile: str
    landline: Optional[str] = None
    fax: Optional[str] = None
    email: EmailStr

    # Representative information
    representative_name: str
    representative_designation: str
    representative_id_type: str
    representative_id_number: str
    representative_nationality: str
    representative_mobile: str
    representative_residence_tel: Optional[str] = None
    representative_phone_area_code: Optional[str] = None
    representative_email: EmailStr

    # Bank account information
    bank_account_name: str
    bank_name: str
    bank_branch: str
    bank_country: str
    iban: str
    currency: str
    swift_code: str

    # Structured JSON-like data (kept as generic dicts/lists)
    owners_managers: List[Dict[str, Any]] = Field(default_factory=list)
    authorized_persons: List[Dict[str, Any]] = Field(default_factory=list)
    documents: List[str] = Field(default_factory=list)

    # System & risk fields
    risk_score: float = 0.0
    risk_category: RiskCategory = RiskCategory.LOW
    risk_assessment_details: Dict[str, Any] = Field(default_factory=dict)
    status: VendorStatus = VendorStatus.APPROVED
    evaluation_notes: Optional[str] = None

    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Due diligence lifecycle
    dd_required: bool = False
    dd_completed: bool = False
    dd_completed_by: Optional[str] = None
    dd_completed_at: Optional[datetime] = None
    dd_approved_by: Optional[str] = None
    dd_approved_at: Optional[datetime] = None

    # Ownership / structure
    dd_ownership_change_last_year: Optional[bool] = None
    dd_location_moved_or_closed: Optional[bool] = None
    dd_new_branches_opened: Optional[bool] = None
    dd_financial_obligations_default: Optional[bool] = None
    dd_shareholding_in_bank: Optional[bool] = None

    # Business continuity
    dd_bc_rely_on_third_parties: Optional[bool] = None
    dd_bc_intend_to_outsource: Optional[bool] = None
    dd_bc_business_stopped_over_week: Optional[bool] = None
    dd_bc_alternative_locations: Optional[bool] = None
    dd_bc_site_readiness_test_frequency: Optional[str] = None
    dd_bc_certified_standard: Optional[bool] = None
    dd_bc_staff_assigned: Optional[bool] = None
    dd_bc_risks_assessed: Optional[bool] = None
    dd_bc_threats_identified: Optional[bool] = None
    dd_bc_essential_activities_identified: Optional[bool] = None
    dd_bc_strategy_exists: Optional[bool] = None
    dd_bc_emergency_responders_engaged: Optional[bool] = None
    dd_bc_arrangements_updated: Optional[bool] = None
    dd_bc_documented_strategy: Optional[bool] = None
    dd_bc_can_provide_exercise_info: Optional[bool] = None
    dd_bc_exercise_results_used: Optional[bool] = None
    dd_bc_management_trained: Optional[bool] = None
    dd_bc_staff_aware: Optional[bool] = None
    dd_bc_it_continuity_plan: Optional[bool] = None
    dd_bc_critical_data_backed_up: Optional[bool] = None
    dd_bc_vital_documents_offsite: Optional[bool] = None
    dd_bc_critical_suppliers_identified: Optional[bool] = None
    dd_bc_suppliers_consulted: Optional[bool] = None
    dd_bc_communication_method: Optional[bool] = None
    dd_bc_public_relations_capability: Optional[bool] = None

    # Anti-fraud
    dd_fraud_whistle_blowing_mechanism: Optional[bool] = None
    dd_fraud_prevention_procedures: Optional[bool] = None
    dd_fraud_internal_last_year: Optional[bool] = None
    dd_fraud_burglary_theft_last_year: Optional[bool] = None

    # Operational risks
    dd_op_criminal_cases_last_3years: Optional[bool] = None
    dd_op_financial_issues_last_3years: Optional[bool] = None
    dd_op_documented_procedures: Optional[bool] = None
    dd_op_internal_audit: Optional[bool] = None
    dd_op_specific_license_required: Optional[bool] = None
    dd_op_services_outside_ksa: Optional[bool] = None
    dd_op_conflict_of_interest_policy: Optional[bool] = None
    dd_op_complaint_handling_procedures: Optional[bool] = None
    dd_op_customer_complaints_last_year: Optional[bool] = None
    dd_op_insurance_contracts: Optional[bool] = None

    # Cyber security
    dd_cyber_cloud_services: Optional[bool] = None
    dd_cyber_data_outside_ksa: Optional[bool] = None
    dd_cyber_remote_access_outside_ksa: Optional[bool] = None
    dd_cyber_digital_channels: Optional[bool] = None
    dd_cyber_card_payments: Optional[bool] = None
    dd_cyber_third_party_access: Optional[bool] = None

    # Safety and security
    dd_safety_procedures_exist: Optional[bool] = None
    dd_safety_security_24_7: Optional[bool] = None
    dd_safety_security_equipment: Optional[bool] = None
    dd_safety_equipment: Optional[bool] = None

    # Human resources
    dd_hr_localization_policy: Optional[bool] = None
    dd_hr_hiring_standards: Optional[bool] = None
    dd_hr_background_investigation: Optional[bool] = None
    dd_hr_academic_verification: Optional[bool] = None

    # Legal / regulatory
    dd_legal_formal_representation: Optional[bool] = None
    dd_reg_regulated_by_authority: Optional[bool] = None
    dd_reg_audited_by_independent: Optional[bool] = None

    # Conflict of interest & data management
    dd_coi_relationship_with_bank: Optional[bool] = None
    dd_data_customer_data_policy: Optional[bool] = None

    # Financial consumer protection
    dd_fcp_read_and_understood: Optional[bool] = None
    dd_fcp_will_comply: Optional[bool] = None

    # Additional questionnaire details & final checklist
    dd_additional_details: Optional[str] = None
    dd_checklist_supporting_documents: Optional[bool] = None
    dd_checklist_related_party_checked: Optional[bool] = None
    dd_checklist_sanction_screening: Optional[bool] = None

    # Tags for searching / grouping in ProcureFlix
    tags: List[str] = Field(default_factory=list)
