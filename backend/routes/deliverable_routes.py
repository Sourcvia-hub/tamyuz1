"""
Deliverable Routes - Unified deliverables with AI validation and HoP approval
Replaces the old Invoice model with an integrated workflow
"""
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from pydantic import BaseModel
from pathlib import Path
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/deliverables", tags=["Deliverables"])

# File upload configuration
UPLOAD_DIR = Path("/app/backend/uploads/deliverables")
ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.gif', '.zip', '.txt'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Import dependencies
from utils.database import db
from utils.auth import require_auth
from services.payment_authorization_ai_service import get_payment_authorization_ai_service
from models.deliverable import Deliverable, DeliverableStatus, DeliverableType


# ==================== REQUEST MODELS ====================

class CreateDeliverableRequest(BaseModel):
    contract_id: Optional[str] = None
    po_id: Optional[str] = None
    tender_id: Optional[str] = None
    vendor_id: str
    title: str
    description: str
    deliverable_type: str = "milestone"
    vendor_invoice_number: Optional[str] = None
    vendor_invoice_date: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    due_date: Optional[str] = None
    amount: float = 0.0
    line_items: List[Dict[str, Any]] = []
    documents: List[str] = []


class UpdateDeliverableRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deliverable_type: Optional[str] = None
    vendor_invoice_number: Optional[str] = None
    vendor_invoice_date: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    due_date: Optional[str] = None
    amount: Optional[float] = None
    line_items: Optional[List[Dict[str, Any]]] = None
    documents: Optional[List[str]] = None


class ReviewDeliverableRequest(BaseModel):
    status: str  # "validated", "rejected"
    review_notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class HoPDecisionRequest(BaseModel):
    decision: str  # "approved", "rejected", "returned"
    notes: Optional[str] = None
    return_reason: Optional[str] = None


# ==================== HELPER FUNCTIONS ====================

async def generate_deliverable_number() -> str:
    """Generate unique deliverable number"""
    year = datetime.now().year
    count = await db.deliverables.count_documents({})
    return f"DEL-{year}-{str(count + 1).zfill(4)}"


async def generate_payment_reference() -> str:
    """Generate unique payment reference"""
    year = datetime.now().year
    count = await db.deliverables.count_documents({"payment_reference": {"$ne": None}})
    return f"PAY-{year}-{str(count + 1).zfill(4)}"


def add_audit_trail(deliverable: Dict, action: str, user_id: str, notes: Optional[str] = None) -> List[Dict]:
    """Add entry to deliverable audit trail"""
    audit_trail = deliverable.get("audit_trail", [])
    audit_trail.append({
        "action": action,
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "notes": notes
    })
    return audit_trail


# ==================== DELIVERABLE ENDPOINTS ====================

@router.get("")
async def list_deliverables(
    request: Request,
    contract_id: Optional[str] = None,
    po_id: Optional[str] = None,
    vendor_id: Optional[str] = None,
    status: Optional[str] = None
):
    """List deliverables with optional filters - RBAC: data filtering for regular users"""
    from utils.permissions import should_filter_by_user
    user = await require_auth(request)
    user_role_str = user.role.value.lower() if hasattr(user.role, 'value') else str(user.role).lower()
    
    query = {}
    
    # Apply row-level security: regular users see only their own deliverables
    if should_filter_by_user(user_role_str, "invoices"):
        query["created_by"] = user.id
    
    if contract_id:
        query["contract_id"] = contract_id
    if po_id:
        query["po_id"] = po_id
    if vendor_id:
        query["vendor_id"] = vendor_id
    if status:
        query["status"] = status
    
    deliverables = await db.deliverables.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Enrich with vendor/contract info
    for d in deliverables:
        if d.get("vendor_id"):
            vendor = await db.vendors.find_one({"id": d["vendor_id"]}, {"_id": 0, "name_english": 1, "commercial_name": 1})
            d["vendor_name"] = vendor.get("name_english") or vendor.get("commercial_name", "Unknown") if vendor else "Unknown"
        if d.get("contract_id"):
            contract = await db.contracts.find_one({"id": d["contract_id"]}, {"_id": 0, "contract_number": 1, "title": 1})
            d["contract_info"] = contract
        if d.get("po_id"):
            po = await db.purchase_orders.find_one({"id": d["po_id"]}, {"_id": 0, "po_number": 1})
            d["po_info"] = po
    
    return {"deliverables": deliverables, "count": len(deliverables)}


@router.post("")
async def create_deliverable(request: Request, data: CreateDeliverableRequest):
    """Create a new deliverable"""
    user = await require_auth(request)
    
    # Must have either contract_id or po_id
    if not data.contract_id and not data.po_id:
        raise HTTPException(status_code=400, detail="Deliverable must be linked to a Contract or Purchase Order")
    
    # Validate references
    if data.contract_id:
        contract = await db.contracts.find_one({"id": data.contract_id})
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
    
    if data.po_id:
        po = await db.purchase_orders.find_one({"id": data.po_id})
        if not po:
            raise HTTPException(status_code=404, detail="Purchase Order not found")
    
    # Create deliverable
    deliverable = Deliverable(
        deliverable_number=await generate_deliverable_number(),
        contract_id=data.contract_id,
        po_id=data.po_id,
        tender_id=data.tender_id,
        vendor_id=data.vendor_id,
        title=data.title,
        description=data.description,
        deliverable_type=DeliverableType(data.deliverable_type) if data.deliverable_type else DeliverableType.MILESTONE,
        vendor_invoice_number=data.vendor_invoice_number,
        vendor_invoice_date=datetime.fromisoformat(data.vendor_invoice_date) if data.vendor_invoice_date else None,
        period_start=datetime.fromisoformat(data.period_start) if data.period_start else None,
        period_end=datetime.fromisoformat(data.period_end) if data.period_end else None,
        due_date=datetime.fromisoformat(data.due_date) if data.due_date else None,
        amount=data.amount,
        currency="SAR",  # Fixed to SAR
        line_items=data.line_items,
        documents=data.documents,
        status=DeliverableStatus.DRAFT,
        created_by=user.id,
        audit_trail=[{
            "action": "created",
            "user_id": user.id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }]
    )
    
    await db.deliverables.insert_one(deliverable.model_dump())
    
    return {"success": True, "deliverable": deliverable.model_dump()}


@router.get("/pending-hop-approval")
async def list_pending_hop_approvals(request: Request):
    """List deliverables pending HoP approval - for Contract Approvals dashboard"""
    user = await require_auth(request)
    
    deliverables = await db.deliverables.find(
        {"status": "pending_hop_approval"},
        {"_id": 0}
    ).sort("hop_submitted_at", -1).to_list(100)
    
    # Enrich with related data
    for d in deliverables:
        if d.get("vendor_id"):
            vendor = await db.vendors.find_one({"id": d["vendor_id"]}, {"_id": 0, "name_english": 1, "commercial_name": 1})
            d["vendor_name"] = vendor.get("name_english") or vendor.get("commercial_name", "Unknown") if vendor else "Unknown"
        if d.get("contract_id"):
            contract = await db.contracts.find_one({"id": d["contract_id"]}, {"_id": 0, "contract_number": 1, "title": 1, "value": 1})
            d["contract_info"] = contract
        if d.get("po_id"):
            po = await db.purchase_orders.find_one({"id": d["po_id"]}, {"_id": 0, "po_number": 1, "total_amount": 1})
            d["po_info"] = po
    
    return {"deliverables": deliverables, "count": len(deliverables)}


@router.get("/{deliverable_id}")
async def get_deliverable(deliverable_id: str, request: Request):
    """Get a single deliverable with enriched data"""
    user = await require_auth(request)
    
    deliverable = await db.deliverables.find_one({"id": deliverable_id}, {"_id": 0})
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    
    # Enrich with related data
    if deliverable.get("contract_id"):
        contract = await db.contracts.find_one({"id": deliverable["contract_id"]}, {"_id": 0})
        deliverable["contract_info"] = contract
    
    if deliverable.get("po_id"):
        po = await db.purchase_orders.find_one({"id": deliverable["po_id"]}, {"_id": 0})
        deliverable["po_info"] = po
    
    if deliverable.get("vendor_id"):
        vendor = await db.vendors.find_one({"id": deliverable["vendor_id"]}, {"_id": 0})
        deliverable["vendor_info"] = vendor
    
    return deliverable


@router.put("/{deliverable_id}")
async def update_deliverable(deliverable_id: str, data: UpdateDeliverableRequest, request: Request):
    """Update a deliverable"""
    user = await require_auth(request)
    
    deliverable = await db.deliverables.find_one({"id": deliverable_id})
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    
    # Only allow updates on draft status
    if deliverable.get("status") not in ["draft"]:
        raise HTTPException(status_code=400, detail=f"Cannot update deliverable in '{deliverable.get('status')}' status")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Add audit trail
    audit_trail = add_audit_trail(deliverable, "updated", user.id)
    update_data["audit_trail"] = audit_trail
    
    await db.deliverables.update_one({"id": deliverable_id}, {"$set": update_data})
    
    return {"success": True, "message": "Deliverable updated"}


@router.post("/{deliverable_id}/submit")
async def submit_deliverable(deliverable_id: str, request: Request):
    """Submit a deliverable for review and AI validation"""
    user = await require_auth(request)
    
    deliverable = await db.deliverables.find_one({"id": deliverable_id}, {"_id": 0})
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    
    if deliverable.get("status") != "draft":
        raise HTTPException(status_code=400, detail="Only draft deliverables can be submitted")
    
    # Run AI validation
    contract = None
    po = None
    tender = None
    vendor = None
    
    if deliverable.get("contract_id"):
        contract = await db.contracts.find_one({"id": deliverable["contract_id"]}, {"_id": 0})
    if deliverable.get("po_id"):
        po = await db.purchase_orders.find_one({"id": deliverable["po_id"]}, {"_id": 0})
    if deliverable.get("tender_id"):
        tender = await db.tenders.find_one({"id": deliverable["tender_id"]}, {"_id": 0})
    if deliverable.get("vendor_id"):
        vendor = await db.vendors.find_one({"id": deliverable["vendor_id"]}, {"_id": 0})
    
    ai_service = get_payment_authorization_ai_service()
    validation = await ai_service.validate_deliverable_for_payment(deliverable, contract, po, tender, vendor)
    
    audit_trail = add_audit_trail(deliverable, "submitted", user.id)
    
    await db.deliverables.update_one(
        {"id": deliverable_id},
        {"$set": {
            "status": "submitted",
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "submitted_by": user.id,
            "ai_validation_summary": validation.get("advisory_summary"),
            "ai_validation_status": validation.get("payment_readiness"),
            "ai_key_observations": validation.get("key_observations", []),
            "ai_required_clarifications": validation.get("required_clarifications", []),
            "ai_advisory_summary": validation.get("advisory_summary"),
            "ai_confidence": validation.get("confidence"),
            "ai_validated_at": datetime.now(timezone.utc).isoformat(),
            "audit_trail": audit_trail,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Deliverable submitted", "validation": validation}


@router.post("/{deliverable_id}/review")
async def review_deliverable(deliverable_id: str, data: ReviewDeliverableRequest, request: Request):
    """Review deliverable - Officer validates and marks ready for HoP"""
    user = await require_auth(request)
    
    deliverable = await db.deliverables.find_one({"id": deliverable_id})
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    
    if deliverable.get("status") not in ["submitted", "under_review"]:
        raise HTTPException(status_code=400, detail="Deliverable must be submitted before review")
    
    valid_statuses = ["validated", "rejected"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    audit_trail = add_audit_trail(deliverable, f"reviewed_{data.status}", user.id, data.review_notes)
    
    update_data = {
        "status": data.status,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_by": user.id,
        "review_notes": data.review_notes,
        "audit_trail": audit_trail,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if data.status == "rejected":
        update_data["rejection_reason"] = data.rejection_reason
        update_data["rejected_by"] = user.id
        update_data["rejected_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.deliverables.update_one({"id": deliverable_id}, {"$set": update_data})
    
    return {"success": True, "message": f"Deliverable {data.status}"}


@router.post("/{deliverable_id}/submit-to-hop")
async def submit_to_hop(deliverable_id: str, request: Request):
    """Submit validated deliverable to Head of Procurement for final approval"""
    user = await require_auth(request)
    
    deliverable = await db.deliverables.find_one({"id": deliverable_id})
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    
    if deliverable.get("status") != "validated":
        raise HTTPException(status_code=400, detail="Only validated deliverables can be submitted to HoP")
    
    audit_trail = add_audit_trail(deliverable, "submitted_to_hop", user.id)
    
    await db.deliverables.update_one(
        {"id": deliverable_id},
        {"$set": {
            "status": "pending_hop_approval",
            "hop_submitted_at": datetime.now(timezone.utc).isoformat(),
            "hop_submitted_by": user.id,
            "audit_trail": audit_trail,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Deliverable submitted to HoP for approval"}


@router.post("/{deliverable_id}/hop-decision")
async def hop_decision(deliverable_id: str, data: HoPDecisionRequest, request: Request):
    """HoP makes final decision on deliverable"""
    user = await require_auth(request)
    
    deliverable = await db.deliverables.find_one({"id": deliverable_id})
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    
    if deliverable.get("status") != "pending_hop_approval":
        raise HTTPException(status_code=400, detail="Deliverable is not pending HoP approval")
    
    valid_decisions = ["approved", "rejected", "returned"]
    if data.decision not in valid_decisions:
        raise HTTPException(status_code=400, detail=f"Invalid decision. Must be one of: {valid_decisions}")
    
    audit_trail = add_audit_trail(deliverable, f"hop_{data.decision}", user.id, data.notes)
    
    update_data = {
        "hop_decision": data.decision,
        "hop_decision_by": user.id,
        "hop_decision_at": datetime.now(timezone.utc).isoformat(),
        "hop_decision_notes": data.notes,
        "audit_trail": audit_trail,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if data.decision == "approved":
        update_data["status"] = "approved"
        update_data["payment_reference"] = await generate_payment_reference()
    elif data.decision == "rejected":
        update_data["status"] = "rejected"
        update_data["rejection_reason"] = data.notes
        update_data["rejected_by"] = user.id
        update_data["rejected_at"] = datetime.now(timezone.utc).isoformat()
    elif data.decision == "returned":
        update_data["status"] = "validated"  # Send back to officer
        update_data["hop_return_reason"] = data.return_reason or data.notes
    
    await db.deliverables.update_one({"id": deliverable_id}, {"$set": update_data})
    
    return {"success": True, "message": f"Deliverable {data.decision}", "payment_reference": update_data.get("payment_reference")}


@router.post("/{deliverable_id}/export")
async def export_deliverable(deliverable_id: str, request: Request):
    """Export approved deliverable for payment processing"""
    user = await require_auth(request)
    
    deliverable = await db.deliverables.find_one({"id": deliverable_id})
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    
    if deliverable.get("status") != "approved":
        raise HTTPException(status_code=400, detail="Only approved deliverables can be exported")
    
    export_reference = f"EXP-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    audit_trail = add_audit_trail(deliverable, "exported", user.id, export_reference)
    
    await db.deliverables.update_one(
        {"id": deliverable_id},
        {"$set": {
            "exported": True,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "exported_by": user.id,
            "export_reference": export_reference,
            "audit_trail": audit_trail,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "export_reference": export_reference}


@router.post("/{deliverable_id}/mark-paid")
async def mark_as_paid(deliverable_id: str, request: Request):
    """Mark deliverable as paid"""
    user = await require_auth(request)
    
    deliverable = await db.deliverables.find_one({"id": deliverable_id})
    if not deliverable:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    
    if deliverable.get("status") != "approved":
        raise HTTPException(status_code=400, detail="Only approved deliverables can be marked as paid")
    
    audit_trail = add_audit_trail(deliverable, "paid", user.id)
    
    await db.deliverables.update_one(
        {"id": deliverable_id},
        {"$set": {
            "status": "paid",
            "payment_date": datetime.now(timezone.utc).isoformat(),
            "audit_trail": audit_trail,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Deliverable marked as paid"}


# ==================== STATS ENDPOINT ====================

@router.get("/stats/summary")
async def get_deliverables_stats(request: Request):
    """Get deliverables summary statistics"""
    user = await require_auth(request)
    
    total = await db.deliverables.count_documents({})
    draft = await db.deliverables.count_documents({"status": "draft"})
    submitted = await db.deliverables.count_documents({"status": "submitted"})
    validated = await db.deliverables.count_documents({"status": "validated"})
    pending_hop = await db.deliverables.count_documents({"status": "pending_hop_approval"})
    approved = await db.deliverables.count_documents({"status": "approved"})
    rejected = await db.deliverables.count_documents({"status": "rejected"})
    paid = await db.deliverables.count_documents({"status": "paid"})
    
    # Total amounts
    amount_pipeline = [
        {"$group": {"_id": "$status", "total": {"$sum": "$amount"}}}
    ]
    amounts = await db.deliverables.aggregate(amount_pipeline).to_list(20)
    amounts_by_status = {a["_id"]: a["total"] for a in amounts}
    
    return {
        "counts": {
            "total": total,
            "draft": draft,
            "submitted": submitted,
            "validated": validated,
            "pending_hop_approval": pending_hop,
            "approved": approved,
            "rejected": rejected,
            "paid": paid
        },
        "amounts": amounts_by_status,
        "total_pending_amount": amounts_by_status.get("pending_hop_approval", 0) + amounts_by_status.get("validated", 0),
        "total_approved_amount": amounts_by_status.get("approved", 0) + amounts_by_status.get("paid", 0)
    }
