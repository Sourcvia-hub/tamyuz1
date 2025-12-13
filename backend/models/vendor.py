"""
Vendor models
"""
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid

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


class Vendor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_number: Optional[str] = None  # Auto-generated (e.g., Vendor-25-0001)
    vendor_type: VendorType = VendorType.LOCAL  # International or Local
    
    # Company Information - All Optional
    name_english: Optional[str] = None
    commercial_name: Optional[str] = None
    entity_type: Optional[str] = None
    vat_number: Optional[str] = None
    unified_number: Optional[str] = None  # For Saudi entities
    cr_number: Optional[str] = None
    cr_expiry_date: Optional[datetime] = None
    cr_country_city: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry_date: Optional[datetime] = None
    activity_description: Optional[str] = None
    number_of_employees: Optional[int] = 0
    
    # Address and Contact - All Optional
    street: Optional[str] = None
    building_no: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    country: Optional[str] = None
    mobile: Optional[str] = None
    landline: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None  # Changed from EmailStr to allow empty
    
    # Representative Information - All Optional
    representative_name: Optional[str] = None
    representative_designation: Optional[str] = None
    representative_id_type: Optional[str] = None
    representative_id_number: Optional[str] = None
    representative_nationality: Optional[str] = None
    representative_mobile: Optional[str] = None
    representative_residence_tel: Optional[str] = None
    representative_phone_area_code: Optional[str] = None
    representative_email: Optional[str] = None  # Changed from EmailStr to allow empty
    
    # Bank Account Information - All Optional
    bank_account_name: Optional[str] = None
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_country: Optional[str] = None
    iban: Optional[str] = None
    currency: Optional[str] = None
    swift_code: Optional[str] = None
    
    # Owners/Partners/Managers (stored as JSON)
    owners_managers: List[Dict[str, Any]] = []
    
    # Authorization
    authorized_persons: List[Dict[str, Any]] = []
    
    # Documents
    documents: List[str] = []
    
    # System fields
    risk_score: float = 0.0
    risk_category: RiskCategory = RiskCategory.LOW
    risk_assessment_details: Dict[str, Any] = {}  # Breakdown of risk calculation
    status: VendorStatus = VendorStatus.APPROVED  # Auto-approved
    evaluation_notes: Optional[str] = None
    created_by: Optional[str] = None  # User ID who created
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Due Diligence Questionnaire (required for high risk vendors or outsourcing/cloud contracts)
    dd_required: bool = False  # Set to true when due diligence is needed
    dd_completed: bool = False
    dd_completed_by: Optional[str] = None
    dd_completed_at: Optional[datetime] = None
    dd_approved_by: Optional[str] = None
    dd_approved_at: Optional[datetime] = None
    
    # Ownership Structure / General
    dd_ownership_change_last_year: Optional[bool] = None
    dd_location_moved_or_closed: Optional[bool] = None
    dd_new_branches_opened: Optional[bool] = None
    dd_financial_obligations_default: Optional[bool] = None
    dd_shareholding_in_bank: Optional[bool] = None
    
    # Business Continuity (27 questions)
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
    
    # Anti-Fraud
    dd_fraud_whistle_blowing_mechanism: Optional[bool] = None
    dd_fraud_prevention_procedures: Optional[bool] = None
    dd_fraud_internal_last_year: Optional[bool] = None
    dd_fraud_burglary_theft_last_year: Optional[bool] = None
    
    # Operational Risks
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
    
    # Cyber Security
    dd_cyber_cloud_services: Optional[bool] = None
    dd_cyber_data_outside_ksa: Optional[bool] = None
    dd_cyber_remote_access_outside_ksa: Optional[bool] = None
    dd_cyber_digital_channels: Optional[bool] = None
    dd_cyber_card_payments: Optional[bool] = None
    dd_cyber_third_party_access: Optional[bool] = None
    
    # Safety and Security
    dd_safety_procedures_exist: Optional[bool] = None
    dd_safety_security_24_7: Optional[bool] = None
    dd_safety_security_equipment: Optional[bool] = None
    dd_safety_equipment: Optional[bool] = None
    
    # Human Resources
    dd_hr_localization_policy: Optional[bool] = None
    dd_hr_hiring_standards: Optional[bool] = None
    dd_hr_background_investigation: Optional[bool] = None
    dd_hr_academic_verification: Optional[bool] = None
    
    # Judicial / Legal
    dd_legal_formal_representation: Optional[bool] = None
    
    # Regulatory Authorities
    dd_reg_regulated_by_authority: Optional[bool] = None
    dd_reg_audited_by_independent: Optional[bool] = None
    
    # Conflict of Interest
    dd_coi_relationship_with_bank: Optional[bool] = None
    
    # Data Management
    dd_data_customer_data_policy: Optional[bool] = None
    
    # Financial Consumer Protection
    dd_fcp_read_and_understood: Optional[bool] = None
    dd_fcp_will_comply: Optional[bool] = None
    
    # Additional Details
    dd_additional_details: Optional[str] = None
    
    # Final Checklist
    dd_checklist_supporting_documents: Optional[bool] = None
    dd_checklist_related_party_checked: Optional[bool] = None
    dd_checklist_sanction_screening: Optional[bool] = None

