from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request, status
from fastapi.responses import JSONResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import aiohttp
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from io import BytesIO

# Import AI helpers
from ai_helpers import (
    analyze_vendor_scoring,
    analyze_tender_proposal,
    analyze_contract_classification,
    analyze_po_items,
    match_invoice_to_milestone
)

# Import all models from the models package
from models import (
    User, UserSession, UserRole,
    Vendor, VendorType, VendorStatus, RiskCategory,
    Tender, TenderStatus, EvaluationCriteria, Proposal, ProposalStatus,
    Contract, ContractStatus,
    Invoice, InvoiceStatus,
    PurchaseOrder, POItem, POStatus,
    Resource, ResourceStatus, WorkType, Relative,
    Asset, AssetStatus, AssetCondition, Building, Floor, AssetCategory,
    OSR, OSRType, OSRCategory, OSRStatus, OSRPriority,
    Notification, AuditLog
)

# Import utilities
from utils.database import db, client
from utils.auth import hash_password, verify_password, get_current_user, require_auth, require_role
from utils.helpers import generate_number, determine_outsourcing_classification, determine_noc_requirement

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ==================== HELPER FUNCTIONS ====================
def calculate_vendor_registration_score(vendor_data: dict) -> dict:
    """
    Calculate vendor registration score based on 15 Yes/No questions.
    1 point for each "Yes" answer.
    Returns: dict with score, percentage, and risk_category
    """
    total_questions = 15
    score = 0
    
    # All questions award 1 point for "Yes"
    if vendor_data.get('vat_number'): score += 1
    if vendor_data.get('unified_number'): score += 1
    if vendor_data.get('cr_number'): score += 1
    if vendor_data.get('cr_expiry_date'): score += 1
    if vendor_data.get('cr_country_city'): score += 1
    if vendor_data.get('license_number'): score += 1
    if vendor_data.get('license_expiry_date'): score += 1
    if vendor_data.get('activity_description'): score += 1
    if vendor_data.get('number_of_employees'): score += 1
    if vendor_data.get('country_list'): score += 1
    if vendor_data.get('financial_details'): score += 1
    if vendor_data.get('branches_subsidiaries'): score += 1
    if vendor_data.get('key_customers'): score += 1
    if vendor_data.get('financial_statements_2years'): score += 1
    if vendor_data.get('documents_pdf_attached'): score += 1
    
    percentage = (score / total_questions) * 100
    
    # Determine risk category based on percentage
    if percentage >= 80:
        risk_category = 'low'
    elif percentage >= 60:
        risk_category = 'medium'
    elif percentage >= 40:
        risk_category = 'high'
    else:
        risk_category = 'very_high'
    
    return {
        'score': score,
        'total': total_questions,
        'percentage': round(percentage, 2),
        'risk_category': risk_category
    }

def calculate_due_diligence_score(vendor_data: dict) -> dict:
    """
    Calculate due diligence score based on 60+ Yes/No questions.
    1 point for each "Yes" answer (some questions are reverse-scored).
    Returns: dict with score, percentage, and risk_category
    """
    score = 0
    total_questions = 64
    
    # POSITIVE SCORING (Yes = +1 point) - Good practices
    positive_fields = [
        'dd_location_moved_closed',  # Has alternative locations
        'dd_vendor_opened_branches',  # Growth indicator
        'dd_bc_alternative_locations',
        'dd_bc_test_continuity_regularly',
        'dd_bc_certified_standard',
        'dd_bc_dedicated_staff',
        'dd_bc_risk_assessment_done',
        'dd_bc_essential_activities_identified',
        'dd_bc_strategy_exists',
        'dd_bc_emergency_responders',
        'dd_bc_update_arrangements',
        'dd_bc_exercising_strategy',
        'dd_bc_evidence_of_tests',
        'dd_bc_test_results_improve',
        'dd_bc_management_trained',
        'dd_bc_staff_aware',
        'dd_bc_it_continuity_plan',
        'dd_bc_data_backed_up_offsite',
        'dd_bc_vital_documents_backed_up',
        'dd_bc_critical_suppliers_identified',
        'dd_bc_coordinated_with_suppliers',
        'dd_bc_communication_method',
        'dd_bc_pr_crisis_management',
        'dd_fraud_whistleblowing_mechanism',
        'dd_fraud_prevention_procedures',
        'dd_op_documented_procedures',
        'dd_op_internal_audit',
        'dd_op_coi_policies',
        'dd_op_complaint_handling',
        'dd_op_insurance_contracts',
        'dd_cyber_security_procedures',
        'dd_safety_security_24_7',
        'dd_safety_cctv_equipment',
        'dd_safety_fire_exits_equipment',
        'dd_hr_localization_policy',
        'dd_hr_hiring_policy',
        'dd_hr_background_investigation',
        'dd_hr_academic_verification',
        'dd_op_financial_statements_audited',
        'dd_data_management_policy',
        'dd_sama_consumer_protection_understanding',
        'dd_sama_consumer_protection_compliance',
    ]
    
    # NEGATIVE SCORING (Yes = -1 point) - Red flags
    negative_fields = [
        'dd_ownership_change_last_year',  # Instability
        'dd_bc_exposed_to_events',  # Past disruptions
        'dd_conflicts_of_interest',
        'dd_bc_rely_on_third_parties',  # Dependency risk
        'dd_bc_plan_to_subcontract',
        'dd_fraud_internal_last_year',
        'dd_fraud_burglary_theft_last_year',
        'dd_op_criminal_cases_last_3years',
        'dd_op_customer_complaints_last_year',
        'dd_cloud_services',  # Potential risk
        'dd_cyber_data_outside_ksa',
        'dd_cyber_remote_access_outside_ksa',
        'dd_cyber_digital_channel_services',
        'dd_cyber_card_payment_services',
        'dd_cyber_third_party_access',
        'dd_op_legal_public_representation',
        'dd_op_activities_regulated',
        'dd_related_party_to_bank',
    ]
    
    # NEUTRAL (Yes/No both acceptable) - Informational only
    neutral_fields = [
        'dd_op_specific_license_required',
        'dd_op_services_outside_ksa',
    ]
    
    # Calculate positive points
    for field in positive_fields:
        if vendor_data.get(field) is True:
            score += 1
    
    # Calculate negative points (reverse scoring)
    for field in negative_fields:
        if vendor_data.get(field) is False:  # No red flag = good
            score += 1
    
    percentage = (score / total_questions) * 100
    
    # Determine risk category based on percentage
    if percentage >= 75:
        risk_category = 'low'
    elif percentage >= 50:
        risk_category = 'medium'
    elif percentage >= 30:
        risk_category = 'high'
    else:
        risk_category = 'very_high'
    
    return {
        'score': score,
        'total': total_questions,
        'percentage': round(percentage, 2),
        'risk_category': risk_category
    }

def calculate_dd_risk_adjustment(vendor_data: dict) -> float:
    """
    Calculate risk score adjustment based on Due Diligence responses.
    Uses new Yes/No scoring system.
    Returns risk score from 0-100.
    """
    dd_result = calculate_due_diligence_score(vendor_data)
    
    # Convert percentage to risk score (inverse)
    # Higher percentage = lower risk score
    risk_score = 100 - dd_result['percentage']
    
    return risk_score


# ==================== REQUEST/RESPONSE MODELS ====================
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Optional[UserRole] = UserRole.PROCUREMENT_OFFICER

class ProposalEvaluationRequest(BaseModel):
    """Request model for evaluating proposals"""
    vendor_reliability_stability: float
    delivery_warranty_backup: float
    technical_experience: float
    cost_score: float
    meets_requirements: float

