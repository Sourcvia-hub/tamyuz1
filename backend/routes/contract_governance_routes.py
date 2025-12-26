"""
Contract Governance Routes - AI-Powered Contract Intelligence APIs
"""
from fastapi import APIRouter, HTTPException, Depends, Request, File, UploadFile
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from pydantic import BaseModel
import os
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contract-governance", tags=["Contract Governance"])

# Import dependencies
from utils.database import db
from utils.auth import require_auth
from services.contract_ai_service import get_contract_ai_service
from models.contract_governance import (
    CONTRACT_DD_QUESTIONNAIRE_SECTIONS,
    SERVICE_AGREEMENT_EXHIBITS,
)


# ==================== REQUEST MODELS ====================

class ContractContextRequest(BaseModel):
    """Contract context questionnaire from PR"""
    requires_system_data_access: Optional[str] = None
    is_cloud_based: Optional[str] = None
    is_outsourcing_service: Optional[str] = None
    expected_data_location: Optional[str] = None
    requires_onsite_presence: Optional[str] = None
    expected_duration: Optional[str] = None


class ClassifyContractRequest(BaseModel):
    """Request to classify a contract"""
    contract_id: str
    context_questionnaire: Dict[str, Any]
    contract_details: Dict[str, Any]
    vendor_id: Optional[str] = None


class GenerateAdvisoryRequest(BaseModel):
    """Request to generate AI advisory"""
    contract_id: str
    classification: str
    include_pr_comparison: bool = True


class UpdateSAMANOCRequest(BaseModel):
    """Update SAMA NOC status"""
    status: str
    reference_number: Optional[str] = None
    submission_date: Optional[str] = None
    approval_date: Optional[str] = None
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class ContractDDSubmission(BaseModel):
    """Contract DD questionnaire submission"""
    responses: List[Dict[str, Any]]
    notes: Optional[str] = None


class HOPDecisionRequest(BaseModel):
    """Head of Procurement decision request"""
    decision: str  # "approved", "rejected", "returned"
    notes: Optional[str] = None
    risk_acceptance: bool = False


# ==================== ENDPOINTS ====================

@router.get("/questionnaire-template")
async def get_dd_questionnaire_template(request: Request):
    """Get the Contract DD questionnaire template"""
    await require_auth(request)
    return {
        "sections": CONTRACT_DD_QUESTIONNAIRE_SECTIONS,
        "total_questions": sum(len(s["questions"]) for s in CONTRACT_DD_QUESTIONNAIRE_SECTIONS)
    }


@router.get("/exhibits-template")
async def get_exhibits_template(request: Request):
    """Get the Service Agreement exhibits template"""
    await require_auth(request)
    return {
        "exhibits": SERVICE_AGREEMENT_EXHIBITS,
        "total_exhibits": len(SERVICE_AGREEMENT_EXHIBITS)
    }


@router.post("/extract-contract")
async def extract_contract_document(
    request: Request,
    contract_id: str,
    file: UploadFile = File(...)
):
    """
    Extract information from uploaded contract document using AI
    Supports Word (.docx) and PDF files
    """
    user = await require_auth(request)
    
    # Validate file type
    allowed_extensions = [".docx", ".doc", ".pdf"]
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Save file temporarily
    upload_dir = "/app/backend/uploads/contracts"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_id = str(uuid.uuid4())
    file_path = os.path.join(upload_dir, f"{file_id}{file_ext}")
    
    try:
        # Save uploaded file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Get AI service
        ai_service = get_contract_ai_service()
        
        # Extract text from document
        file_type = "pdf" if file_ext == ".pdf" else "docx"
        document_text = await ai_service.extract_contract_document(file_path, file_type)
        
        if not document_text or document_text.startswith("["):
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from document. Please ensure the document contains readable text."
            )
        
        # Extract fields using AI
        extraction = await ai_service.extract_contract_fields(document_text)
        
        # Update contract with extracted data
        update_data = {
            "creation_method": "upload",
            "uploaded_contract_document_id": file_id,
            "ai_sow_summary": extraction.sow_summary,
            "ai_sla_summary": extraction.sla_summary,
            "ai_extracted_value": extraction.extracted_value,
            "ai_extracted_currency": extraction.extracted_currency,
            "ai_extracted_duration_months": extraction.extracted_duration_months,
            "ai_supplier_name": extraction.supplier_name,
            "ai_supplier_country": extraction.supplier_country,
            "ai_exhibits_identified": extraction.exhibits_identified or [],
            "ai_extraction_confidence": extraction.extraction_confidence,
            "ai_extraction_notes": extraction.extraction_notes,
            "ai_extracted_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Also pre-fill main fields if empty
        contract = await db.contracts.find_one({"id": contract_id})
        if contract:
            if not contract.get("sow") and extraction.sow_summary:
                update_data["sow"] = extraction.sow_summary
            if not contract.get("sla") and extraction.sla_summary:
                update_data["sla"] = extraction.sla_summary
            if extraction.extracted_value and not contract.get("value"):
                update_data["value"] = extraction.extracted_value
        
        await db.contracts.update_one(
            {"id": contract_id},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "file_id": file_id,
            "extraction": extraction.model_dump(),
            "message": "Contract document extracted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Contract extraction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")
    finally:
        # Clean up temp file
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass


@router.post("/classify")
async def classify_contract(
    request: Request,
    classify_request: ClassifyContractRequest
):
    """
    Classify contract based on SAMA outsourcing regulations
    Returns classification and required actions
    """
    user = await require_auth(request)
    
    # Get AI service
    ai_service = get_contract_ai_service()
    
    # Get vendor info if provided
    vendor_info = None
    if classify_request.vendor_id:
        vendor = await db.vendors.find_one(
            {"id": classify_request.vendor_id},
            {"_id": 0}
        )
        if vendor:
            vendor_info = {
                "name": vendor.get("name_english") or vendor.get("commercial_name"),
                "country": vendor.get("cr_country_city"),
                "risk_score": vendor.get("risk_score", 0),
                "risk_category": vendor.get("risk_category", "medium")
            }
    
    # Classify contract
    classification_result = await ai_service.classify_contract(
        classify_request.context_questionnaire,
        classify_request.contract_details,
        vendor_info
    )
    
    # Update contract with classification
    update_data = {
        "outsourcing_classification": classification_result.get("classification"),
        "classification_reason": classification_result.get("classification_reason"),
        "classification_by": "ai",
        "classification_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Set required actions based on classification
    if classification_result.get("requires_sama_noc"):
        update_data["sama_noc_status"] = "pending"
        update_data["is_noc"] = True
    
    if classification_result.get("requires_contract_dd"):
        update_data["contract_dd_status"] = "pending"
    
    await db.contracts.update_one(
        {"id": classify_request.contract_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "classification": classification_result,
        "contract_id": classify_request.contract_id
    }


@router.post("/generate-advisory/{contract_id}")
async def generate_contract_advisory(
    contract_id: str,
    request: Request
):
    """
    Generate AI advisory for contract including drafting hints and clause suggestions
    """
    user = await require_auth(request)
    
    # Get contract
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Get PR details
    pr_details = None
    if contract.get("tender_id"):
        tender = await db.tenders.find_one(
            {"id": contract.get("tender_id")},
            {"_id": 0}
        )
        if tender:
            pr_details = {
                "title": tender.get("title"),
                "requirements": tender.get("requirements"),
                "budget": tender.get("budget"),
                "project_name": tender.get("project_name")
            }
    
    # Build context questionnaire from PR or contract
    context_questionnaire = {
        "requires_system_data_access": contract.get("ctx_requires_system_data_access"),
        "is_cloud_based": contract.get("ctx_is_cloud_based") or ("yes" if contract.get("a5_cloud_hosted") else None),
        "is_outsourcing_service": contract.get("ctx_is_outsourcing_service"),
        "expected_data_location": contract.get("ctx_expected_data_location") or ("outside_ksa" if contract.get("b4_outside_ksa") else None),
        "requires_onsite_presence": contract.get("ctx_requires_onsite_presence"),
        "expected_duration": contract.get("ctx_expected_duration")
    }
    
    # Get AI service
    ai_service = get_contract_ai_service()
    
    # Generate advisory
    advisory = await ai_service.generate_advisory(
        classification=contract.get("outsourcing_classification", "not_outsourcing"),
        context_questionnaire=context_questionnaire,
        contract_details={
            "title": contract.get("title"),
            "sow": contract.get("sow"),
            "sla": contract.get("sla"),
            "value": contract.get("value"),
            "start_date": str(contract.get("start_date")),
            "end_date": str(contract.get("end_date"))
        },
        pr_details=pr_details
    )
    
    # Update contract with advisory
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {
            "ai_drafting_hints": [h.model_dump() for h in advisory.drafting_hints],
            "ai_clause_suggestions": [c.model_dump() for c in advisory.clause_suggestions],
            "ai_consistency_warnings": [w.model_dump() for w in advisory.consistency_warnings],
            "ai_advisory_notes": advisory.ai_analysis_notes,
            "ai_advisory_generated_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "advisory": advisory.model_dump(),
        "contract_id": contract_id
    }


@router.post("/assess-risk/{contract_id}")
async def assess_contract_risk(
    contract_id: str,
    request: Request
):
    """
    Calculate contract risk assessment
    """
    user = await require_auth(request)
    
    # Get contract
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Get vendor risk score
    vendor_risk_score = 50  # Default
    if contract.get("vendor_id"):
        vendor = await db.vendors.find_one(
            {"id": contract.get("vendor_id")},
            {"_id": 0}
        )
        if vendor:
            vendor_risk_score = vendor.get("risk_score", 50)
    
    # Build context from contract
    context_questionnaire = {
        "requires_system_data_access": contract.get("ctx_requires_system_data_access"),
        "is_cloud_based": contract.get("ctx_is_cloud_based") or ("yes" if contract.get("a5_cloud_hosted") else "no"),
        "expected_data_location": contract.get("ctx_expected_data_location") or ("outside_ksa" if contract.get("b4_outside_ksa") else "inside_ksa"),
    }
    
    # Calculate duration in months
    start_date = contract.get("start_date")
    end_date = contract.get("end_date")
    duration_months = 12  # Default
    if start_date and end_date:
        if isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        if isinstance(end_date, str):
            end_date = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        duration_months = max(1, (end_date - start_date).days // 30)
    
    # Get AI service
    ai_service = get_contract_ai_service()
    
    # Ensure contract_value is numeric
    try:
        contract_value = float(contract.get("value", 0) or 0)
    except (TypeError, ValueError):
        contract_value = 0.0
    
    # Calculate risk
    risk_assessment = ai_service.calculate_contract_risk(
        classification=contract.get("outsourcing_classification", "not_outsourcing"),
        vendor_risk_score=vendor_risk_score,
        context_questionnaire=context_questionnaire,
        contract_value=contract_value,
        duration_months=duration_months
    )
    
    # Update contract with risk assessment
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {
            "risk_score": risk_assessment.risk_score,
            "risk_level": risk_assessment.risk_level.value,
            "risk_drivers": risk_assessment.top_risk_drivers,
            "risk_assessed_by": "ai",
            "risk_assessed_at": datetime.now(timezone.utc).isoformat(),
            "requires_risk_acceptance": risk_assessment.requires_risk_acceptance,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "risk_assessment": risk_assessment.model_dump(),
        "contract_id": contract_id
    }


@router.put("/sama-noc/{contract_id}")
async def update_sama_noc_status(
    contract_id: str,
    noc_update: UpdateSAMANOCRequest,
    request: Request
):
    """
    Update SAMA NOC status for a contract
    """
    user = await require_auth(request)
    
    # Validate status
    valid_statuses = ["not_required", "pending", "submitted", "approved", "rejected"]
    if noc_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    update_data = {
        "sama_noc_status": noc_update.status,
        "sama_noc_notes": noc_update.notes,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if noc_update.reference_number:
        update_data["sama_noc_reference_number"] = noc_update.reference_number
    
    if noc_update.status == "submitted":
        update_data["sama_noc_submitted_by"] = user.id
        if noc_update.submission_date:
            update_data["sama_noc_submission_date"] = noc_update.submission_date
        else:
            update_data["sama_noc_submission_date"] = datetime.now(timezone.utc).isoformat()
    
    if noc_update.status == "approved":
        update_data["sama_noc_approved_by"] = user.id
        if noc_update.approval_date:
            update_data["sama_noc_approval_date"] = noc_update.approval_date
        else:
            update_data["sama_noc_approval_date"] = datetime.now(timezone.utc).isoformat()
    
    if noc_update.status == "rejected":
        update_data["sama_noc_rejection_reason"] = noc_update.rejection_reason
    
    result = await db.contracts.update_one(
        {"id": contract_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    return {
        "success": True,
        "message": f"SAMA NOC status updated to {noc_update.status}",
        "contract_id": contract_id
    }


@router.post("/contract-dd/{contract_id}/submit")
async def submit_contract_dd(
    contract_id: str,
    dd_submission: ContractDDSubmission,
    request: Request
):
    """
    Submit Contract Due Diligence questionnaire responses
    """
    user = await require_auth(request)
    
    # Get contract
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Get AI service
    ai_service = get_contract_ai_service()
    
    # Analyze DD responses
    dd_analysis = await ai_service.analyze_contract_dd(dd_submission.responses)
    
    # Update contract with DD results
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {
            "contract_dd_status": "completed",
            "contract_dd_completed_by": user.id,
            "contract_dd_completed_at": datetime.now(timezone.utc).isoformat(),
            "contract_dd_risk_level": dd_analysis.dd_risk_level.value,
            "contract_dd_risk_score": dd_analysis.dd_risk_score,
            "contract_dd_findings": dd_analysis.key_findings,
            "contract_dd_followups": dd_analysis.required_followups,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Store DD responses separately
    dd_record = {
        "id": str(uuid.uuid4()),
        "contract_id": contract_id,
        "responses": dd_submission.responses,
        "notes": dd_submission.notes,
        "analysis": dd_analysis.model_dump(),
        "submitted_by": user.id,
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contract_dd_records.insert_one(dd_record)
    
    return {
        "success": True,
        "dd_analysis": dd_analysis.model_dump(),
        "contract_id": contract_id
    }


@router.post("/hop-decision/{contract_id}")
async def submit_hop_decision(
    contract_id: str,
    decision: HOPDecisionRequest,
    request: Request
):
    """
    Submit Head of Procurement decision for contract approval
    """
    user = await require_auth(request)
    
    # Validate decision
    valid_decisions = ["approved", "rejected", "returned"]
    if decision.decision not in valid_decisions:
        raise HTTPException(status_code=400, detail=f"Invalid decision. Must be one of: {valid_decisions}")
    
    # Get contract
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    update_data = {
        "hop_decision": decision.decision,
        "hop_decision_at": datetime.now(timezone.utc).isoformat(),
        "hop_decision_by": user.id,
        "hop_decision_notes": decision.notes,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if decision.decision == "approved":
        update_data["status"] = "approved"
        update_data["approved_by"] = user.id
        
        # Handle risk acceptance if required
        if decision.risk_acceptance and contract.get("requires_risk_acceptance"):
            update_data["risk_accepted_by"] = user.id
            update_data["risk_accepted_at"] = datetime.now(timezone.utc).isoformat()
            update_data["risk_acceptance_notes"] = decision.notes
    
    elif decision.decision == "rejected":
        update_data["status"] = "rejected"
    
    elif decision.decision == "returned":
        update_data["status"] = "under_review"
        update_data["hop_submitted_for_approval"] = False
    
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": f"Contract {decision.decision}",
        "contract_id": contract_id
    }


@router.get("/pending-approvals")
async def get_pending_hop_approvals(request: Request):
    """
    Get all contracts pending Head of Procurement approval
    """
    user = await require_auth(request)
    
    contracts = await db.contracts.find(
        {
            "$or": [
                {"status": "pending_hop_approval"},
                {"hop_submitted_for_approval": True, "hop_decision": None}
            ]
        },
        {"_id": 0}
    ).to_list(100)
    
    # Enrich with vendor and PR info
    enriched = []
    for contract in contracts:
        vendor = await db.vendors.find_one(
            {"id": contract.get("vendor_id")},
            {"_id": 0, "name_english": 1, "commercial_name": 1, "risk_score": 1, "risk_category": 1}
        )
        tender = await db.tenders.find_one(
            {"id": contract.get("tender_id")},
            {"_id": 0, "title": 1, "tender_number": 1, "budget": 1}
        )
        
        enriched.append({
            **contract,
            "vendor_info": vendor,
            "pr_info": tender
        })
    
    return {
        "contracts": enriched,
        "count": len(enriched)
    }


@router.post("/submit-for-approval/{contract_id}")
async def submit_contract_for_hop_approval(
    contract_id: str,
    request: Request
):
    """
    Submit contract for Head of Procurement approval
    """
    user = await require_auth(request)
    
    # Get contract
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Validate contract is ready for approval
    errors = []
    
    # Check if SAMA NOC is required and not yet approved
    if contract.get("sama_noc_status") == "pending":
        errors.append("SAMA NOC is pending - submit SAMA NOC first")
    
    # Check if Contract DD is required and not completed
    if contract.get("contract_dd_status") == "pending":
        errors.append("Contract Due Diligence is pending - complete DD first")
    
    if errors:
        raise HTTPException(status_code=400, detail={"errors": errors})
    
    # Update contract status
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {
            "status": "pending_hop_approval",
            "hop_submitted_for_approval": True,
            "hop_submitted_at": datetime.now(timezone.utc).isoformat(),
            "hop_submitted_by": user.id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Contract submitted for Head of Procurement approval",
        "contract_id": contract_id
    }
