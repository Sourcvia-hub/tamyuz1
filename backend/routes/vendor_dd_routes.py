"""
Vendor Due Diligence API Routes
New AI-powered DD system with workflow
"""
import os
import uuid
import shutil
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File, Form
from pydantic import BaseModel

from utils.auth import get_current_user
from models.vendor_dd import (
    VendorDDData, VendorDDStatus, AIAssessment, RiskAcceptance,
    DDDocumentUpload, AIRunRecord, DDAuditLog, FieldChangeRecord,
    AIConfidenceLevel, VendorRiskLevel, ExtractedField, FieldExtractionStatus,
    DEFAULT_HIGH_RISK_COUNTRIES
)
from services.vendor_dd_ai_service import get_vendor_dd_ai_service

# MongoDB setup
from motor.motor_asyncio import AsyncIOMotorClient
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017/procureflix")
client = AsyncIOMotorClient(MONGO_URL)
db_name = MONGO_URL.split("/")[-1].split("?")[0]
db = client[db_name]

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vendor-dd", tags=["Vendor Due Diligence"])

# Upload directory
UPLOAD_DIR = "/app/uploads/vendor_dd"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# Request/Response Models
class FieldUpdateRequest(BaseModel):
    """Update a single field with reason"""
    field_name: str
    new_value: Any
    reason: Optional[str] = None


class OfficerReviewRequest(BaseModel):
    """Officer review submission"""
    accept_assessment: bool
    comments: Optional[str] = None


class HoPApprovalRequest(BaseModel):
    """HoP approval request"""
    approved: bool
    with_conditions: bool = False
    comments: Optional[str] = None


class RiskAcceptanceRequest(BaseModel):
    """Risk acceptance for high-risk vendors"""
    risk_acceptance_reason: str
    mitigating_controls: str
    scope_limitations: Optional[str] = None


class HighRiskCountryUpdate(BaseModel):
    """Update high-risk country list"""
    countries: List[str]


# Helper functions
def get_user_role(current_user) -> str:
    """Get user role as string"""
    if hasattr(current_user.role, 'value'):
        return current_user.role.value
    return str(current_user.role)


def serialize_dd_data(dd_data: dict) -> dict:
    """Serialize DD data for JSON response"""
    if '_id' in dd_data:
        del dd_data['_id']
    return dd_data


# ==================== VENDOR DD CRUD ====================

@router.post("/vendors/{vendor_id}/init-dd")
async def initialize_vendor_dd(
    vendor_id: str,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Initialize DD data for a vendor (removes old DD, creates new structure)"""
    user_role = get_user_role(current_user)
    
    # Get vendor
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Create new DD data structure
    dd_data = VendorDDData(
        request_type="new_registration",
        status=VendorDDStatus.DRAFT
    )
    
    # Add audit log
    dd_data.add_audit_log(
        action="dd_initialized",
        details={"vendor_id": vendor_id, "previous_dd_removed": True},
        user_id=current_user.id,
        user_name=current_user.name
    )
    
    dd_dict = dd_data.model_dump(mode='json')
    
    # Update vendor with new DD structure
    await db.vendors.update_one(
        {"id": vendor_id},
        {
            "$set": {
                "vendor_dd": dd_dict,
                "status": "draft",
                # Clear old DD fields
                "dd_required": False,
                "dd_completed": False,
                "dd_completed_by": None,
                "dd_completed_at": None,
                "dd_approved_by": None,
                "dd_approved_at": None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$unset": {
                # Remove all old DD fields
                "dd_ownership_change_last_year": "",
                "dd_location_moved_or_closed": "",
                "dd_new_branches_opened": "",
                "dd_financial_obligations_default": "",
                "dd_shareholding_in_bank": "",
                "dd_bc_rely_on_third_parties": "",
                "dd_bc_intend_to_outsource": "",
                "dd_bc_business_stopped_over_week": "",
                "dd_bc_alternative_locations": "",
                # ... other old DD fields
            }
        }
    )
    
    return {
        "message": "Vendor DD initialized successfully",
        "vendor_id": vendor_id,
        "dd_status": VendorDDStatus.DRAFT.value
    }


@router.get("/vendors/{vendor_id}/dd")
async def get_vendor_dd(
    vendor_id: str,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Get vendor DD data"""
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    dd_data = vendor.get("vendor_dd")
    if not dd_data:
        raise HTTPException(status_code=404, detail="DD not initialized for this vendor")
    
    return serialize_dd_data(dd_data)


@router.put("/vendors/{vendor_id}/dd/fields")
async def update_dd_field(
    vendor_id: str,
    update: FieldUpdateRequest,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Update a DD field (Officer only, with audit trail)"""
    user_role = get_user_role(current_user)
    
    if user_role not in ["procurement_officer", "procurement_manager"]:
        raise HTTPException(status_code=403, detail="Only officers can edit DD fields")
    
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    dd_data = vendor.get("vendor_dd", {})
    if not dd_data:
        raise HTTPException(status_code=404, detail="DD not initialized")
    
    # Get old value
    old_value = dd_data.get(update.field_name, {}).get("value") if isinstance(dd_data.get(update.field_name), dict) else dd_data.get(update.field_name)
    
    # Create field change record
    change_record = {
        "id": str(uuid.uuid4()),
        "field_name": update.field_name,
        "old_value": old_value,
        "new_value": update.new_value,
        "changed_by": current_user.id,
        "changed_by_name": current_user.name,
        "changed_at": datetime.now(timezone.utc).isoformat(),
        "reason": update.reason
    }
    
    # Update field
    if isinstance(dd_data.get(update.field_name), dict) and "value" in dd_data.get(update.field_name, {}):
        # It's an ExtractedField
        dd_data[update.field_name]["value"] = update.new_value
        dd_data[update.field_name]["status"] = "Manual"
    else:
        dd_data[update.field_name] = update.new_value
    
    # Add to change history
    if "field_change_history" not in dd_data:
        dd_data["field_change_history"] = []
    dd_data["field_change_history"].append(change_record)
    
    # Add audit log
    if "audit_log" not in dd_data:
        dd_data["audit_log"] = []
    dd_data["audit_log"].append({
        "id": str(uuid.uuid4()),
        "action": "field_changed",
        "details": {"field": update.field_name, "reason": update.reason},
        "performed_by": current_user.id,
        "performed_by_name": current_user.name,
        "performed_at": datetime.now(timezone.utc).isoformat()
    })
    
    await db.vendors.update_one(
        {"id": vendor_id},
        {"$set": {"vendor_dd": dd_data, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Field updated", "field": update.field_name}


# ==================== DOCUMENT UPLOAD ====================

@router.post("/vendors/{vendor_id}/dd/upload")
async def upload_dd_document(
    vendor_id: str,
    request: Request,
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """Upload a DD document (Word/PDF)"""
    user_role = get_user_role(current_user)
    
    if user_role not in ["procurement_officer", "procurement_manager"]:
        raise HTTPException(status_code=403, detail="Only officers can upload documents")
    
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Validate file type
    filename = file.filename or "document"
    file_ext = filename.split(".")[-1].lower()
    if file_ext not in ["pdf", "docx", "doc"]:
        raise HTTPException(status_code=400, detail="Only PDF and Word documents are supported")
    
    # Save file
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{vendor_id}_{file_id}.{file_ext}")
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Create upload record
    upload_record = {
        "id": file_id,
        "filename": filename,
        "file_path": file_path,
        "file_type": file_ext,
        "uploaded_by": current_user.id,
        "uploaded_by_name": current_user.name,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update vendor DD
    dd_data = vendor.get("vendor_dd", {})
    if "uploaded_documents" not in dd_data:
        dd_data["uploaded_documents"] = []
    dd_data["uploaded_documents"].append(upload_record)
    
    # Add audit log
    if "audit_log" not in dd_data:
        dd_data["audit_log"] = []
    dd_data["audit_log"].append({
        "id": str(uuid.uuid4()),
        "action": "document_uploaded",
        "details": {"filename": filename, "file_type": file_ext, "file_id": file_id},
        "performed_by": current_user.id,
        "performed_by_name": current_user.name,
        "performed_at": datetime.now(timezone.utc).isoformat()
    })
    
    await db.vendors.update_one(
        {"id": vendor_id},
        {"$set": {"vendor_dd": dd_data, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "message": "Document uploaded successfully",
        "document_id": file_id,
        "filename": filename
    }


# ==================== AI EXTRACTION & ASSESSMENT ====================

@router.post("/vendors/{vendor_id}/dd/run-ai")
async def run_ai_assessment(
    vendor_id: str,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Run AI extraction and risk assessment on uploaded documents"""
    user_role = get_user_role(current_user)
    
    if user_role not in ["procurement_officer", "procurement_manager"]:
        raise HTTPException(status_code=403, detail="Only officers can run AI assessment")
    
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    dd_data = vendor.get("vendor_dd", {})
    if not dd_data:
        raise HTTPException(status_code=404, detail="DD not initialized")
    
    # Check for uploaded documents
    uploaded_docs = dd_data.get("uploaded_documents", [])
    if not uploaded_docs:
        raise HTTPException(status_code=400, detail="No documents uploaded for AI analysis")
    
    # Get AI service
    ai_service = get_vendor_dd_ai_service()
    
    try:
        # Process most recent document
        latest_doc = uploaded_docs[-1]
        file_path = latest_doc["file_path"]
        file_type = latest_doc["file_type"]
        
        # Step 1: Extract text from document
        document_text = await ai_service.extract_document_text(file_path, file_type)
        
        # Step 2: Extract fields
        extracted_fields = await ai_service.extract_fields(document_text)
        
        # Step 3: Run risk assessment
        assessment_result = await ai_service.run_risk_assessment(document_text, extracted_fields)
        
        # Map extracted fields to DD data structure
        dd_data = _map_extracted_fields_to_dd(dd_data, extracted_fields)
        
        # Store AI assessment
        ai_assessment = {
            "vendor_name": assessment_result.get("vendor_name"),
            "country_jurisdiction": assessment_result.get("country_jurisdiction"),
            "vendor_risk_score": assessment_result.get("vendor_risk_score", 0),
            "vendor_risk_level": assessment_result.get("vendor_risk_level", "Medium"),
            "top_risk_drivers": assessment_result.get("top_risk_drivers", [])[:3],
            "assessment_summary": assessment_result.get("assessment_summary"),
            "ai_confidence_level": assessment_result.get("ai_confidence_level", "Medium"),
            "ai_confidence_rationale": assessment_result.get("ai_confidence_rationale"),
            "notes_for_human_review": assessment_result.get("notes_for_human_review"),
            "assessed_at": datetime.now(timezone.utc).isoformat(),
            "prompt_version": "1.0"
        }
        dd_data["ai_assessment"] = ai_assessment
        
        # Record AI run
        ai_run_record = {
            "id": str(uuid.uuid4()),
            "run_at": datetime.now(timezone.utc).isoformat(),
            "prompt_version": "1.0",
            "confidence_level": ai_assessment["ai_confidence_level"],
            "risk_score": ai_assessment["vendor_risk_score"],
            "risk_level": ai_assessment["vendor_risk_level"],
            "triggered_by": current_user.id,
            "triggered_by_name": current_user.name
        }
        if "ai_run_history" not in dd_data:
            dd_data["ai_run_history"] = []
        dd_data["ai_run_history"].append(ai_run_record)
        
        # Update status to pending officer review
        dd_data["status"] = VendorDDStatus.PENDING_OFFICER_REVIEW.value
        
        # Add audit log
        if "audit_log" not in dd_data:
            dd_data["audit_log"] = []
        dd_data["audit_log"].append({
            "id": str(uuid.uuid4()),
            "action": "ai_run",
            "details": {
                "risk_score": ai_assessment["vendor_risk_score"],
                "risk_level": ai_assessment["vendor_risk_level"],
                "confidence": ai_assessment["ai_confidence_level"]
            },
            "performed_by": current_user.id,
            "performed_by_name": current_user.name,
            "performed_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Update vendor
        await db.vendors.update_one(
            {"id": vendor_id},
            {
                "$set": {
                    "vendor_dd": dd_data,
                    "risk_score": ai_assessment["vendor_risk_score"],
                    "risk_category": ai_assessment["vendor_risk_level"].lower(),
                    "status": "pending_officer_review",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {
            "message": "AI assessment completed",
            "risk_score": ai_assessment["vendor_risk_score"],
            "risk_level": ai_assessment["vendor_risk_level"],
            "top_risk_drivers": ai_assessment["top_risk_drivers"],
            "confidence_level": ai_assessment["ai_confidence_level"],
            "notes_for_review": ai_assessment["notes_for_human_review"]
        }
        
    except Exception as e:
        logger.error(f"AI assessment failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI assessment failed: {str(e)}")


def _map_extracted_fields_to_dd(dd_data: dict, extracted_fields: dict) -> dict:
    """Map AI-extracted fields to DD data structure"""
    field_mapping = {
        "vendor_name_arabic": "name_arabic",
        "vendor_name_english": "name_english",
        "commercial_name": "commercial_name",
        "entity_type": "entity_type",
        "vat_number": "vat_registration_number",
        "unified_number": "unified_number",
        "cr_number": "cr_number",
        "cr_expiry_date": "cr_expiry_date",
        "cr_country_city": "cr_country_city",
        "license_number": "license_number",
        "license_expiry_date": "license_expiry_date",
        "activity_description": "activity_description",
        "employees_total": "number_of_employees_total",
        "employees_saudi": "number_of_employees_saudi",
        "address_street": "street",
        "address_building": "building_no",
        "address_city": "city",
        "address_district": "district",
        "address_country": "country",
        "contact_mobile": "mobile",
        "contact_landline": "landline",
        "contact_fax": "fax",
        "contact_email": "email_address",
        "rep_name": "rep_full_name",
        "rep_designation": "rep_designation",
        "rep_id_type": "rep_id_document_type",
        "rep_id_number": "rep_id_document_number",
        "rep_nationality": "rep_nationality",
        "rep_mobile": "rep_mobile",
        "rep_email": "rep_email",
        "bank_account_name": "bank_account_name",
        "bank_name": "bank_name",
        "bank_branch": "bank_branch",
        "bank_country": "bank_country",
        "iban": "iban",
        "currency": "currency",
        "swift_code": "swift_code",
        "years_in_business": "years_of_business",
        "number_of_customers": "number_of_customers",
        "number_of_branches": "number_of_branches"
    }
    
    for source_field, target_field in field_mapping.items():
        if source_field in extracted_fields:
            extracted = extracted_fields[source_field]
            if isinstance(extracted, dict):
                dd_data[target_field] = {
                    "value": extracted.get("value"),
                    "status": extracted.get("status", "Extracted"),
                    "confidence": extracted.get("confidence", 0.5)
                }
            else:
                dd_data[target_field] = {
                    "value": extracted,
                    "status": "Extracted",
                    "confidence": 0.5
                }
    
    # Handle owners/managers
    if "owners_managers" in extracted_fields:
        dd_data["owners_managers"] = extracted_fields["owners_managers"]
    
    return dd_data


# ==================== WORKFLOW ACTIONS ====================

@router.post("/vendors/{vendor_id}/dd/officer-review")
async def submit_officer_review(
    vendor_id: str,
    review: OfficerReviewRequest,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Officer submits review to HoP"""
    user_role = get_user_role(current_user)
    
    if user_role not in ["procurement_officer", "procurement_manager"]:
        raise HTTPException(status_code=403, detail="Only officers can submit reviews")
    
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    dd_data = vendor.get("vendor_dd", {})
    if dd_data.get("status") != VendorDDStatus.PENDING_OFFICER_REVIEW.value:
        raise HTTPException(status_code=400, detail="Vendor must be in pending_officer_review status")
    
    # Update officer review
    dd_data["officer_reviewed_by"] = current_user.id
    dd_data["officer_reviewed_by_name"] = current_user.name
    dd_data["officer_reviewed_at"] = datetime.now(timezone.utc).isoformat()
    dd_data["officer_comments"] = review.comments
    dd_data["officer_accepted_assessment"] = review.accept_assessment
    
    # Move to pending HoP approval
    dd_data["status"] = VendorDDStatus.PENDING_HOP_APPROVAL.value
    
    # Add audit log
    dd_data["audit_log"].append({
        "id": str(uuid.uuid4()),
        "action": "officer_submit",
        "details": {"accepted_assessment": review.accept_assessment, "comments": review.comments},
        "performed_by": current_user.id,
        "performed_by_name": current_user.name,
        "performed_at": datetime.now(timezone.utc).isoformat()
    })
    
    await db.vendors.update_one(
        {"id": vendor_id},
        {
            "$set": {
                "vendor_dd": dd_data,
                "status": "pending_hop_approval",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Review submitted to Head of Procurement", "status": "pending_hop_approval"}


@router.post("/vendors/{vendor_id}/dd/hop-approval")
async def submit_hop_approval(
    vendor_id: str,
    approval: HoPApprovalRequest,
    request: Request,
    current_user = Depends(get_current_user)
):
    """HoP (procurement_manager) approves/rejects vendor"""
    user_role = get_user_role(current_user)
    
    if user_role != "procurement_manager":
        raise HTTPException(status_code=403, detail="Only Head of Procurement can approve")
    
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    dd_data = vendor.get("vendor_dd", {})
    if dd_data.get("status") != VendorDDStatus.PENDING_HOP_APPROVAL.value:
        raise HTTPException(status_code=400, detail="Vendor must be in pending_hop_approval status")
    
    # Check if high risk requires risk acceptance
    ai_assessment = dd_data.get("ai_assessment", {})
    risk_level = ai_assessment.get("vendor_risk_level", "Medium")
    
    if risk_level == "High" and approval.approved and not dd_data.get("risk_acceptance"):
        raise HTTPException(
            status_code=400, 
            detail="Risk Acceptance is mandatory for High Risk vendors. Please submit risk acceptance first."
        )
    
    # Update HoP approval
    dd_data["hop_approved_by"] = current_user.id
    dd_data["hop_approved_by_name"] = current_user.name
    dd_data["hop_approved_at"] = datetime.now(timezone.utc).isoformat()
    dd_data["hop_comments"] = approval.comments
    
    # Set final status
    if approval.approved:
        if approval.with_conditions:
            dd_data["status"] = VendorDDStatus.APPROVED_WITH_CONDITIONS.value
            vendor_status = "approved_with_conditions"
        else:
            dd_data["status"] = VendorDDStatus.APPROVED.value
            vendor_status = "approved"
    else:
        dd_data["status"] = VendorDDStatus.REJECTED.value
        vendor_status = "rejected"
    
    # Add audit log
    dd_data["audit_log"].append({
        "id": str(uuid.uuid4()),
        "action": "hop_approval",
        "details": {
            "approved": approval.approved,
            "with_conditions": approval.with_conditions,
            "comments": approval.comments
        },
        "performed_by": current_user.id,
        "performed_by_name": current_user.name,
        "performed_at": datetime.now(timezone.utc).isoformat()
    })
    
    await db.vendors.update_one(
        {"id": vendor_id},
        {
            "$set": {
                "vendor_dd": dd_data,
                "status": vendor_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": f"Vendor {vendor_status}", "status": vendor_status}


@router.post("/vendors/{vendor_id}/dd/risk-acceptance")
async def submit_risk_acceptance(
    vendor_id: str,
    acceptance: RiskAcceptanceRequest,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Submit risk acceptance (required for High Risk vendors before HoP approval)"""
    user_role = get_user_role(current_user)
    
    if user_role != "procurement_manager":
        raise HTTPException(status_code=403, detail="Only Head of Procurement can accept risk")
    
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    dd_data = vendor.get("vendor_dd", {})
    
    # Verify this is a high-risk vendor
    ai_assessment = dd_data.get("ai_assessment", {})
    if ai_assessment.get("vendor_risk_level") != "High":
        raise HTTPException(status_code=400, detail="Risk acceptance is only required for High Risk vendors")
    
    # Store risk acceptance
    risk_acceptance = {
        "risk_acceptance_reason": acceptance.risk_acceptance_reason,
        "mitigating_controls": acceptance.mitigating_controls,
        "scope_limitations": acceptance.scope_limitations,
        "acceptance_owner": current_user.id,
        "acceptance_owner_name": current_user.name,
        "acceptance_date": datetime.now(timezone.utc).isoformat()
    }
    dd_data["risk_acceptance"] = risk_acceptance
    
    # Add audit log
    dd_data["audit_log"].append({
        "id": str(uuid.uuid4()),
        "action": "risk_acceptance",
        "details": {
            "reason": acceptance.risk_acceptance_reason,
            "controls": acceptance.mitigating_controls
        },
        "performed_by": current_user.id,
        "performed_by_name": current_user.name,
        "performed_at": datetime.now(timezone.utc).isoformat()
    })
    
    await db.vendors.update_one(
        {"id": vendor_id},
        {"$set": {"vendor_dd": dd_data, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Risk acceptance recorded"}


# ==================== HIGH-RISK COUNTRY ADMIN ====================

@router.get("/admin/high-risk-countries")
async def get_high_risk_countries(
    request: Request,
    current_user = Depends(get_current_user)
):
    """Get the configurable high-risk country list"""
    # Get from database or return defaults
    config = await db.system_config.find_one({"key": "high_risk_countries"})
    if config:
        return {"countries": config.get("value", DEFAULT_HIGH_RISK_COUNTRIES)}
    return {"countries": DEFAULT_HIGH_RISK_COUNTRIES}


@router.put("/admin/high-risk-countries")
async def update_high_risk_countries(
    update: HighRiskCountryUpdate,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Update the high-risk country list (Admin only)"""
    user_role = get_user_role(current_user)
    
    if user_role not in ["procurement_manager", "system_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can update high-risk countries")
    
    await db.system_config.update_one(
        {"key": "high_risk_countries"},
        {
            "$set": {
                "key": "high_risk_countries",
                "value": update.countries,
                "updated_by": current_user.id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"message": "High-risk countries updated", "countries": update.countries}


# ==================== AUDIT LOG ====================

@router.get("/vendors/{vendor_id}/dd/audit-log")
async def get_dd_audit_log(
    vendor_id: str,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Get complete DD audit log for a vendor"""
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    dd_data = vendor.get("vendor_dd", {})
    
    return {
        "vendor_id": vendor_id,
        "audit_log": dd_data.get("audit_log", []),
        "field_change_history": dd_data.get("field_change_history", []),
        "ai_run_history": dd_data.get("ai_run_history", [])
    }
