"""
Business Request (Tender) Approval Workflow Routes
Handles the multi-level approval process:
1. User creates BR
2. Officer adds proposals
3. User evaluates proposals
4. Officer reviews and optionally forwards to additional approver
5. Final HoP approval
6. Auto-create Contract/PO
"""
from fastapi import APIRouter, HTTPException, Request
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel
from uuid import uuid4
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/business-requests", tags=["Business Request Workflow"])

from utils.database import db
from utils.auth import require_auth


# ==================== REQUEST MODELS ====================

class SubmitEvaluationRequest(BaseModel):
    """User submits their evaluation of proposals"""
    selected_proposal_id: str
    evaluation_notes: Optional[str] = None


class ForwardToAdditionalApproverRequest(BaseModel):
    """Officer forwards to additional approver"""
    approver_user_id: str
    notes: Optional[str] = None


class AdditionalApproverDecisionRequest(BaseModel):
    """Additional approver makes decision"""
    decision: str  # "approved", "rejected"
    notes: Optional[str] = None


class ForwardToHoPRequest(BaseModel):
    """Officer forwards to HoP"""
    notes: Optional[str] = None


class HoPDecisionRequest(BaseModel):
    """HoP makes final decision"""
    decision: str  # "approved", "rejected"
    notes: Optional[str] = None
    award_vendor_id: Optional[str] = None  # Vendor to award (if different from user's selection)


# ==================== NEW: ENHANCED EVALUATION WORKFLOW MODELS ====================

class ForwardForReviewRequest(BaseModel):
    """Officer forwards to users for review/validation"""
    reviewer_user_ids: List[str]  # Multiple reviewers (parallel)
    notes: Optional[str] = None


class ReviewerDecisionRequest(BaseModel):
    """Reviewer makes their decision"""
    decision: str  # "validated", "returned"
    notes: Optional[str] = None


class ForwardForApprovalRequest(BaseModel):
    """Officer forwards to multiple approvers (all must approve)"""
    approver_user_ids: List[str]  # Multiple approvers (parallel)
    notes: Optional[str] = None


class ApproverDecisionRequest(BaseModel):
    """Approver makes their decision"""
    decision: str  # "approved", "rejected", "returned"
    notes: Optional[str] = None


class UpdateEvaluationRequest(BaseModel):
    """Officer updates/amends the evaluation"""
    selected_proposal_id: Optional[str] = None
    evaluation_notes: Optional[str] = None
    technical_score: Optional[float] = None
    financial_score: Optional[float] = None
    overall_score: Optional[float] = None
    recommendation: Optional[str] = None


# ==================== HELPER FUNCTIONS ====================

def add_audit_trail(tender: Dict, action: str, user_id: str, notes: Optional[str] = None) -> List[Dict]:
    """Add entry to tender audit trail"""
    audit_trail = tender.get("audit_trail", [])
    audit_trail.append({
        "action": action,
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "notes": notes
    })
    return audit_trail


async def create_approval_notification(
    user_id: str,
    item_type: str,
    item_id: str,
    item_number: str,
    item_title: str,
    requested_by: str,
    message: str
):
    """Create a notification for pending approval"""
    # Get user email
    user = await db.users.find_one({"id": user_id}, {"email": 1, "name": 1})
    requester = await db.users.find_one({"id": requested_by}, {"name": 1, "email": 1})
    
    notification = {
        "id": str(uuid4()),
        "user_id": user_id,
        "user_email": user.get("email") if user else None,
        "item_type": item_type,
        "item_id": item_id,
        "item_number": item_number,
        "item_title": item_title,
        "requested_by": requested_by,
        "requested_by_name": requester.get("name") if requester else None,
        "requested_at": datetime.now(timezone.utc).isoformat(),
        "message": message,
        "status": "pending",
        "email_sent": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.approval_notifications.insert_one(notification)
    
    # TODO: Send email notification
    # For now, just log
    logger.info(f"Created approval notification for user {user_id}: {message}")
    
    return notification


# ==================== ENDPOINTS ====================

@router.get("/{tender_id}/proposals-for-user")
async def get_proposals_for_user(tender_id: str, request: Request):
    """
    Get proposals for a Business Request - accessible by the requester (creator)
    User can see proposals but CANNOT add new ones
    """
    user = await require_auth(request)
    
    tender = await db.tenders.find_one({"id": tender_id}, {"_id": 0})
    if not tender:
        raise HTTPException(status_code=404, detail="Business Request not found")
    
    # Check if user is the creator OR is an officer/manager
    is_creator = tender.get("created_by") == user.id
    is_officer = user.role in ["procurement_officer", "procurement_manager", "admin"]
    
    if not is_creator and not is_officer:
        raise HTTPException(status_code=403, detail="You don't have access to this Business Request")
    
    # Get proposals with vendor info
    proposals = await db.proposals.find({"tender_id": tender_id}, {"_id": 0}).to_list(100)
    
    # Enrich with vendor info
    for proposal in proposals:
        vendor = await db.vendors.find_one(
            {"id": proposal.get("vendor_id")},
            {"_id": 0, "name_english": 1, "commercial_name": 1, "email": 1}
        )
        proposal["vendor_info"] = vendor
    
    return {
        "tender_id": tender_id,
        "tender_title": tender.get("title"),
        "tender_status": tender.get("status"),
        "is_creator": is_creator,
        "can_add_proposals": is_officer,  # Only officers can add
        "can_evaluate": is_creator and tender.get("status") in ["published", "pending_evaluation"],
        "proposals": proposals,
        "count": len(proposals)
    }


@router.post("/{tender_id}/submit-evaluation")
async def submit_evaluation(tender_id: str, data: SubmitEvaluationRequest, request: Request):
    """
    User submits their evaluation of proposals
    Selects the recommended proposal
    Can be submitted by the creator OR procurement officers
    """
    user = await require_auth(request)
    
    tender = await db.tenders.find_one({"id": tender_id})
    if not tender:
        raise HTTPException(status_code=404, detail="Business Request not found")
    
    # Allow evaluation submission by:
    # 1. The creator of the business request
    # 2. Procurement officers, managers, or admins
    is_creator = tender.get("created_by") == user.id
    is_officer = user.role in ["procurement_officer", "procurement_manager", "admin"]
    
    if not is_creator and not is_officer:
        raise HTTPException(status_code=403, detail="Only the requester or procurement officers can submit evaluation")
    
    # Check status - must be published or pending_evaluation
    if tender.get("status") not in ["published", "pending_evaluation"]:
        raise HTTPException(status_code=400, detail=f"Cannot submit evaluation in '{tender.get('status')}' status")
    
    # Verify selected proposal exists
    proposal = await db.proposals.find_one({"id": data.selected_proposal_id, "tender_id": tender_id})
    if not proposal:
        raise HTTPException(status_code=404, detail="Selected proposal not found")
    
    audit_trail = add_audit_trail(tender, "evaluation_submitted", user.id, data.evaluation_notes)
    
    await db.tenders.update_one(
        {"id": tender_id},
        {"$set": {
            "status": "evaluation_complete",
            "evaluation_submitted_by": user.id,
            "evaluation_submitted_at": datetime.now(timezone.utc).isoformat(),
            "evaluation_notes": data.evaluation_notes,
            "selected_proposal_id": data.selected_proposal_id,
            "audit_trail": audit_trail,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Evaluation submitted successfully"}


@router.post("/{tender_id}/officer-review")
async def officer_review_evaluation(tender_id: str, request: Request):
    """
    Officer reviews the user's evaluation
    After this, officer can forward to additional approver or directly to HoP
    """
    user = await require_auth(request)
    
    if user.role not in ["procurement_officer", "procurement_manager", "admin"]:
        raise HTTPException(status_code=403, detail="Only procurement officers can review evaluations")
    
    tender = await db.tenders.find_one({"id": tender_id})
    if not tender:
        raise HTTPException(status_code=404, detail="Business Request not found")
    
    if tender.get("status") != "evaluation_complete":
        raise HTTPException(status_code=400, detail="Evaluation must be complete before officer review")
    
    audit_trail = add_audit_trail(tender, "officer_reviewed_evaluation", user.id)
    
    await db.tenders.update_one(
        {"id": tender_id},
        {"$set": {
            "evaluation_reviewed_by": user.id,
            "evaluation_reviewed_at": datetime.now(timezone.utc).isoformat(),
            "audit_trail": audit_trail,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Evaluation reviewed"}


@router.get("/approvers-list")
async def get_approvers_list(request: Request):
    """Get list of users who can be selected as additional approvers"""
    user = await require_auth(request)
    
    if user.role not in ["procurement_officer", "procurement_manager", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all users except the current user
    users = await db.users.find(
        {"id": {"$ne": user.id}},
        {"_id": 0, "id": 1, "email": 1, "name": 1, "role": 1}
    ).to_list(200)
    
    return {"approvers": users, "count": len(users)}


@router.post("/{tender_id}/forward-to-approver")
async def forward_to_additional_approver(tender_id: str, data: ForwardToAdditionalApproverRequest, request: Request):
    """
    Officer forwards Business Request to additional approver
    Creates notification for the selected approver
    """
    user = await require_auth(request)
    
    if user.role not in ["procurement_officer", "procurement_manager", "admin"]:
        raise HTTPException(status_code=403, detail="Only procurement officers can forward requests")
    
    tender = await db.tenders.find_one({"id": tender_id})
    if not tender:
        raise HTTPException(status_code=404, detail="Business Request not found")
    
    # Must have evaluation reviewed or be in evaluation_complete status
    if tender.get("status") not in ["evaluation_complete"]:
        raise HTTPException(status_code=400, detail="Evaluation must be complete before forwarding")
    
    # Get approver info
    approver = await db.users.find_one({"id": data.approver_user_id}, {"_id": 0, "name": 1, "email": 1})
    if not approver:
        raise HTTPException(status_code=404, detail="Selected approver not found")
    
    audit_trail = add_audit_trail(tender, "forwarded_to_additional_approver", user.id, f"Approver: {approver.get('name', data.approver_user_id)}")
    
    await db.tenders.update_one(
        {"id": tender_id},
        {"$set": {
            "status": "pending_additional_approval",
            "additional_approver_id": data.approver_user_id,
            "additional_approver_name": approver.get("name"),
            "additional_approval_requested_by": user.id,
            "additional_approval_requested_at": datetime.now(timezone.utc).isoformat(),
            "additional_approval_notes": data.notes,
            "audit_trail": audit_trail,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create notification
    await create_approval_notification(
        user_id=data.approver_user_id,
        item_type="business_request",
        item_id=tender_id,
        item_number=tender.get("tender_number"),
        item_title=tender.get("title"),
        requested_by=user.id,
        message=f"Business Request '{tender.get('title')}' requires your approval. {data.notes or ''}"
    )
    
    return {"success": True, "message": f"Forwarded to {approver.get('name', 'approver')} for approval"}


@router.post("/{tender_id}/additional-approver-decision")
async def additional_approver_decision(tender_id: str, data: AdditionalApproverDecisionRequest, request: Request):
    """
    Additional approver makes their decision
    Only the designated approver can make this decision
    """
    user = await require_auth(request)
    
    tender = await db.tenders.find_one({"id": tender_id})
    if not tender:
        raise HTTPException(status_code=404, detail="Business Request not found")
    
    # Only the designated approver can decide
    if tender.get("additional_approver_id") != user.id:
        raise HTTPException(status_code=403, detail="You are not the designated approver for this request")
    
    if tender.get("status") != "pending_additional_approval":
        raise HTTPException(status_code=400, detail="This request is not pending your approval")
    
    valid_decisions = ["approved", "rejected"]
    if data.decision not in valid_decisions:
        raise HTTPException(status_code=400, detail=f"Invalid decision. Must be: {valid_decisions}")
    
    audit_trail = add_audit_trail(tender, f"additional_approver_{data.decision}", user.id, data.notes)
    
    # Update notification
    await db.approval_notifications.update_one(
        {"item_id": tender_id, "user_id": user.id, "status": "pending"},
        {"$set": {
            "status": data.decision,
            "decision_at": datetime.now(timezone.utc).isoformat(),
            "decision_notes": data.notes
        }}
    )
    
    new_status = "evaluation_complete" if data.decision == "approved" else "rejected"
    
    await db.tenders.update_one(
        {"id": tender_id},
        {"$set": {
            "status": new_status,
            "additional_approval_decision": data.decision,
            "additional_approval_decision_at": datetime.now(timezone.utc).isoformat(),
            "additional_approval_decision_notes": data.notes,
            "audit_trail": audit_trail,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": f"Request {data.decision}"}


@router.post("/{tender_id}/forward-to-hop")
async def forward_to_hop(tender_id: str, data: ForwardToHoPRequest, request: Request):
    """
    Officer forwards Business Request to HoP for final approval
    """
    user = await require_auth(request)
    
    if user.role not in ["procurement_officer", "procurement_manager", "admin", "hop"]:
        raise HTTPException(status_code=403, detail="Only procurement officers can forward to HoP")
    
    tender = await db.tenders.find_one({"id": tender_id})
    if not tender:
        raise HTTPException(status_code=404, detail="Business Request not found")
    
    # Allow forwarding from multiple statuses
    allowed_statuses = ["evaluation_complete", "review_complete", "approval_complete"]
    if tender.get("status") not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Cannot forward to HoP from '{tender.get('status')}' status")
    
    audit_trail = add_audit_trail(tender, "forwarded_to_hop", user.id, data.notes)
    
    await db.tenders.update_one(
        {"id": tender_id},
        {"$set": {
            "status": "pending_hop_approval",
            "hop_approval_requested_by": user.id,
            "hop_approval_requested_at": datetime.now(timezone.utc).isoformat(),
            "hop_approval_notes": data.notes,
            "audit_trail": audit_trail,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify HoP users (procurement_manager, hop, admin roles)
    hop_users = await db.users.find(
        {"role": {"$in": ["procurement_manager", "hop", "admin"]}},
        {"id": 1}
    ).to_list(10)
    
    for hop_user in hop_users:
        await create_approval_notification(
            user_id=hop_user["id"],
            item_type="business_request",
            item_id=tender_id,
            item_number=tender.get("tender_number"),
            item_title=tender.get("title"),
            requested_by=user.id,
            message=f"Business Request '{tender.get('title')}' requires HoP final approval"
        )
    
    return {"success": True, "message": "Forwarded to HoP for final approval"}


@router.post("/{tender_id}/hop-decision")
async def hop_final_decision(tender_id: str, data: HoPDecisionRequest, request: Request):
    """
    HoP makes final decision
    If approved, auto-creates Contract or PO
    """
    user = await require_auth(request)
    
    if user.role not in ["procurement_manager", "admin", "hop"]:
        raise HTTPException(status_code=403, detail="Only HoP/Manager can make final decisions")
    
    tender = await db.tenders.find_one({"id": tender_id})
    if not tender:
        raise HTTPException(status_code=404, detail="Business Request not found")
    
    if tender.get("status") != "pending_hop_approval":
        raise HTTPException(status_code=400, detail="This request is not pending HoP approval")
    
    valid_decisions = ["approved", "rejected"]
    if data.decision not in valid_decisions:
        raise HTTPException(status_code=400, detail=f"Invalid decision. Must be: {valid_decisions}")
    
    audit_trail = add_audit_trail(tender, f"hop_{data.decision}", user.id, data.notes)
    
    update_data = {
        "hop_decision": data.decision,
        "hop_decision_by": user.id,
        "hop_decision_at": datetime.now(timezone.utc).isoformat(),
        "hop_decision_notes": data.notes,
        "audit_trail": audit_trail,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    created_contract_id = None
    
    if data.decision == "approved":
        # Award to the selected vendor
        award_vendor_id = data.award_vendor_id or None
        
        # If no vendor specified, use the one from selected proposal
        if not award_vendor_id and tender.get("selected_proposal_id"):
            selected_proposal = await db.proposals.find_one({"id": tender["selected_proposal_id"]})
            if selected_proposal:
                award_vendor_id = selected_proposal.get("vendor_id")
        
        update_data["status"] = "awarded"
        update_data["awarded_to"] = award_vendor_id
        
        # Auto-create Contract (pending with officer)
        if award_vendor_id:
            vendor = await db.vendors.find_one({"id": award_vendor_id}, {"name_english": 1, "commercial_name": 1})
            vendor_name = vendor.get("name_english") or vendor.get("commercial_name", "Vendor") if vendor else "Vendor"
            
            # Generate contract number
            year = datetime.now().year
            count = await db.contracts.count_documents({}) + 1
            contract_number = f"CNT-{year}-{count:04d}"
            
            contract_doc = {
                "id": str(uuid4()),
                "contract_number": contract_number,
                "title": f"Contract for {tender.get('title')}",
                "tender_id": tender_id,
                "vendor_id": award_vendor_id,
                "value": tender.get("budget", 0),
                "status": "pending_completion",  # Pending with officer to forward to user
                "created_from_br": True,
                "br_number": tender.get("tender_number"),
                "auto_created": True,
                "created_by": user.id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.contracts.insert_one(contract_doc)
            created_contract_id = contract_doc["id"]
            update_data["auto_created_contract_id"] = created_contract_id
            
            logger.info(f"Auto-created contract {contract_number} from BR {tender.get('tender_number')}")
    else:
        update_data["status"] = "rejected"
    
    # Update notifications
    await db.approval_notifications.update_many(
        {"item_id": tender_id, "item_type": "business_request", "status": "pending"},
        {"$set": {
            "status": data.decision,
            "decision_at": datetime.now(timezone.utc).isoformat(),
            "decision_notes": data.notes
        }}
    )
    
    await db.tenders.update_one({"id": tender_id}, {"$set": update_data})
    
    return {
        "success": True,
        "message": f"Business Request {data.decision}",
        "created_contract_id": created_contract_id
    }


# ==================== NOTIFICATION ENDPOINTS ====================

@router.get("/my-pending-approvals")
async def get_my_pending_approvals(request: Request):
    """Get all pending approval requests for the current user (HoP sees contracts, deliverables, assets)"""
    user = await require_auth(request)
    user_role = user.role.value.lower() if hasattr(user.role, 'value') else str(user.role).lower()
    is_hop = user_role in ["procurement_manager", "admin", "hop"]
    
    notification_items = []
    entity_items = []
    
    # 1. Get standard approval notifications
    notifications = await db.approval_notifications.find(
        {"user_id": user.id, "status": "pending"},
        {"_id": 0}
    ).sort("requested_at", -1).to_list(50)
    
    # Enrich with item details and filter out stale notifications
    for notif in notifications:
        item_type = notif.get("item_type")
        item_id = notif.get("item_id")
        
        # Skip notifications for items that have already been decided
        if item_type == "business_request":
            tender = await db.tenders.find_one(
                {"id": item_id},
                {"_id": 0, "title": 1, "tender_number": 1, "budget": 1, "status": 1, "selected_proposal_id": 1, "hop_decision": 1}
            )
            if not tender or tender.get("hop_decision") in ["approved", "rejected"]:
                # Mark notification as processed
                await db.approval_notifications.update_one(
                    {"id": notif.get("id")},
                    {"$set": {"status": "processed"}}
                )
                continue
            notif["item_details"] = tender
        elif item_type in ["contract", "contract_approval"]:
            contract = await db.contracts.find_one({"id": item_id}, {"_id": 0, "hop_decision": 1, "status": 1, "workflow_status": 1})
            if not contract or contract.get("hop_decision") in ["approved", "rejected"]:
                await db.approval_notifications.update_one({"id": notif.get("id")}, {"$set": {"status": "processed"}})
                continue
        elif item_type in ["po", "po_approval", "purchase_order", "purchase_order_approval"]:
            po = await db.purchase_orders.find_one({"id": item_id}, {"_id": 0, "hop_decision": 1, "status": 1, "workflow_status": 1})
            if not po or po.get("hop_decision") in ["approved", "rejected"]:
                await db.approval_notifications.update_one({"id": notif.get("id")}, {"$set": {"status": "processed"}})
                continue
        elif item_type in ["vendor", "vendor_approval"]:
            vendor = await db.vendors.find_one({"id": item_id}, {"_id": 0, "hop_decision": 1, "status": 1, "workflow_status": 1})
            if not vendor or vendor.get("hop_decision") in ["approved", "rejected"]:
                await db.approval_notifications.update_one({"id": notif.get("id")}, {"$set": {"status": "processed"}})
                continue
        elif item_type in ["asset", "asset_approval"]:
            asset = await db.assets.find_one({"id": item_id}, {"_id": 0, "hop_decision": 1, "approval_status": 1, "workflow_status": 1})
            if not asset or asset.get("hop_decision") in ["approved", "rejected"]:
                await db.approval_notifications.update_one({"id": notif.get("id")}, {"$set": {"status": "processed"}})
                continue
        elif item_type in ["deliverable", "deliverable_approval"]:
            deliverable = await db.deliverables.find_one({"id": item_id}, {"_id": 0, "hop_decision": 1, "status": 1, "workflow_status": 1})
            if not deliverable or deliverable.get("hop_decision") in ["approved", "rejected"]:
                await db.approval_notifications.update_one({"id": notif.get("id")}, {"$set": {"status": "processed"}})
                continue
        elif item_type in ["resource", "resource_approval"]:
            resource = await db.resources.find_one({"id": item_id}, {"_id": 0, "hop_decision": 1, "status": 1, "workflow_status": 1})
            if not resource or resource.get("hop_decision") in ["approved", "rejected"]:
                await db.approval_notifications.update_one({"id": notif.get("id")}, {"$set": {"status": "processed"}})
                continue
        
        # Enrich with requester name if missing
        if not notif.get("requested_by_name") or notif.get("requested_by_name") == "Unknown":
            requester_id = notif.get("requested_by")
            if requester_id:
                requester = await db.users.find_one({"id": requester_id}, {"_id": 0, "name": 1})
                notif["requested_by_name"] = requester.get("name", "Officer") if requester else "Officer"
            else:
                notif["requested_by_name"] = "Officer"
        
        notification_items.append(notif)
    
    # 2. If user is HoP, include pending contracts, deliverables, and assets
    if is_hop:
        # Get contracts pending HoP approval (check both status fields, exclude already decided)
        pending_contracts = await db.contracts.find(
            {"$and": [
                {"$or": [
                    {"status": "pending_hop_approval"},
                    {"workflow_status": "pending_hop_approval"}
                ]},
                {"hop_decision": {"$nin": ["approved", "rejected"]}}
            ]},
            {"_id": 0}
        ).to_list(50)
        
        for contract in pending_contracts:
            vendor = await db.vendors.find_one(
                {"id": contract.get("vendor_id")},
                {"_id": 0, "name_english": 1, "commercial_name": 1, "vendor_number": 1}
            )
            vendor_name = "Unknown"
            if vendor:
                vendor_name = vendor.get("name_english") or vendor.get("commercial_name") or vendor.get("vendor_number") or "Unknown Vendor"
            
            # Get requester name
            requester_id = contract.get("hop_approval_requested_by") or contract.get("created_by")
            requester = await db.users.find_one({"id": requester_id}, {"_id": 0, "name": 1}) if requester_id else None
            requester_name = requester.get("name", "Officer") if requester else "Officer"
            
            entity_items.append({
                "id": f"contract_{contract['id']}",
                "item_type": "contract_approval",
                "item_id": contract["id"],
                "item_number": contract.get("contract_number"),
                "item_title": contract.get("title"),
                "status": "pending",
                "message": f"Contract {contract.get('contract_number')} requires HoP approval",
                "requested_by_name": requester_name,
                "requested_at": contract.get("hop_submitted_at") or contract.get("created_at"),
                "vendor_name": vendor_name,
                "amount": contract.get("value", 0)
            })
        
        # Get deliverables pending HoP approval (exclude already decided)
        pending_deliverables = await db.deliverables.find(
            {"$and": [
                {"$or": [
                    {"status": "pending_hop_approval"},
                    {"workflow_status": "pending_hop_approval"}
                ]},
                {"hop_decision": {"$nin": ["approved", "rejected"]}}
            ]},
            {"_id": 0}
        ).to_list(50)
        
        for deliverable in pending_deliverables:
            vendor = await db.vendors.find_one(
                {"id": deliverable.get("vendor_id")},
                {"_id": 0, "name_english": 1, "commercial_name": 1, "vendor_number": 1}
            )
            vendor_name = "Unknown"
            if vendor:
                vendor_name = vendor.get("name_english") or vendor.get("commercial_name") or vendor.get("vendor_number") or "Unknown Vendor"
            
            # Get requester name
            requester_id = deliverable.get("submitted_to_hop_by") or deliverable.get("created_by")
            requester = await db.users.find_one({"id": requester_id}, {"_id": 0, "name": 1}) if requester_id else None
            requester_name = requester.get("name", "Officer") if requester else "Officer"
            
            entity_items.append({
                "id": f"deliverable_{deliverable['id']}",
                "item_type": "deliverable",
                "item_id": deliverable["id"],
                "item_number": deliverable.get("deliverable_number"),
                "item_title": deliverable.get("title"),
                "status": "pending",
                "message": f"Deliverable {deliverable.get('deliverable_number')} requires HoP approval for payment",
                "requested_by_name": requester_name,
                "requested_at": deliverable.get("submitted_to_hop_at") or deliverable.get("created_at"),
                "vendor_name": vendor_name,
                "amount": deliverable.get("amount", 0)
            })
        
        # Get assets pending HoP approval (exclude already decided)
        pending_assets = await db.assets.find(
            {"$and": [
                {"$or": [
                    {"approval_status": "pending_hop_approval"},
                    {"workflow_status": "pending_hop_approval"}
                ]},
                {"hop_decision": {"$nin": ["approved", "rejected"]}}
            ]},
            {"_id": 0}
        ).to_list(50)
        
        for asset in pending_assets:
            vendor = await db.vendors.find_one(
                {"id": asset.get("vendor_id")},
                {"_id": 0, "name_english": 1, "commercial_name": 1, "vendor_number": 1}
            )
            vendor_name = "Unknown"
            if vendor:
                vendor_name = vendor.get("name_english") or vendor.get("commercial_name") or vendor.get("vendor_number") or "Unknown Vendor"
            
            # Get requester name
            requester_id = asset.get("submitted_for_approval_by") or asset.get("created_by")
            requester = await db.users.find_one({"id": requester_id}, {"_id": 0, "name": 1}) if requester_id else None
            requester_name = requester.get("name", "Officer") if requester else "Officer"
            
            entity_items.append({
                "id": f"asset_{asset['id']}",
                "item_type": "asset",
                "item_id": asset["id"],
                "item_number": asset.get("asset_number"),
                "item_title": asset.get("name"),
                "status": "pending",
                "message": f"Asset {asset.get('asset_number')} registration requires HoP approval",
                "requested_by_name": requester_name,
                "requested_at": asset.get("submitted_for_approval_at") or asset.get("created_at"),
                "vendor_name": vendor_name,
                "amount": asset.get("cost", 0)
            })
        
        # Get vendors pending HoP approval (high-risk vendors, exclude already decided)
        pending_vendors = await db.vendors.find(
            {"$and": [
                {"$or": [
                    {"status": "pending_hop_approval"},
                    {"workflow_status": "pending_hop_approval"}
                ]},
                {"hop_decision": {"$nin": ["approved", "rejected"]}}
            ]},
            {"_id": 0}
        ).to_list(50)
        
        for vendor in pending_vendors:
            # Get requester name
            requester_id = vendor.get("submitted_for_approval_by") or vendor.get("created_by")
            requester = await db.users.find_one({"id": requester_id}, {"_id": 0, "name": 1}) if requester_id else None
            requester_name = requester.get("name", "Officer") if requester else "Officer"
            
            entity_items.append({
                "id": f"vendor_{vendor['id']}",
                "item_type": "vendor",
                "item_id": vendor["id"],
                "item_number": vendor.get("vendor_number"),
                "item_title": vendor.get("name_english") or vendor.get("commercial_name", "Unknown Vendor"),
                "status": "pending",
                "message": f"Vendor {vendor.get('vendor_number')} requires HoP approval",
                "requested_by_name": requester_name,
                "requested_at": vendor.get("submitted_for_approval_at") or vendor.get("created_at"),
                "vendor_name": vendor.get("name_english") or vendor.get("commercial_name", "Unknown"),
                "amount": 0
            })
        
        # Get purchase orders pending HoP approval (exclude already decided)
        pending_pos = await db.purchase_orders.find(
            {"$and": [
                {"$or": [
                    {"status": "pending_hop_approval"},
                    {"workflow_status": "pending_hop_approval"}
                ]},
                {"hop_decision": {"$nin": ["approved", "rejected"]}}
            ]},
            {"_id": 0}
        ).to_list(50)
        
        for po in pending_pos:
            vendor = await db.vendors.find_one(
                {"id": po.get("vendor_id")},
                {"_id": 0, "name_english": 1, "commercial_name": 1, "vendor_number": 1}
            )
            vendor_name = "Unknown"
            if vendor:
                vendor_name = vendor.get("name_english") or vendor.get("commercial_name") or vendor.get("vendor_number") or "Unknown Vendor"
            
            # Get requester name
            requester_id = po.get("submitted_for_approval_by") or po.get("created_by")
            requester = await db.users.find_one({"id": requester_id}, {"_id": 0, "name": 1}) if requester_id else None
            requester_name = requester.get("name", "Officer") if requester else "Officer"
            
            entity_items.append({
                "id": f"po_{po['id']}",
                "item_type": "po",
                "item_id": po["id"],
                "item_number": po.get("po_number"),
                "item_title": po.get("title") or f"PO {po.get('po_number')}",
                "status": "pending",
                "message": f"Purchase Order {po.get('po_number')} requires HoP approval",
                "requested_by_name": requester_name,
                "requested_at": po.get("submitted_for_approval_at") or po.get("created_at"),
                "vendor_name": vendor_name,
                "amount": po.get("total_value", 0)
            })
        
        # Get resources pending HoP approval (exclude already decided)
        pending_resources = await db.resources.find(
            {"$and": [
                {"$or": [
                    {"status": "pending_hop_approval"},
                    {"workflow_status": "pending_hop_approval"}
                ]},
                {"hop_decision": {"$nin": ["approved", "rejected"]}}
            ]},
            {"_id": 0}
        ).to_list(50)
        
        for resource in pending_resources:
            # Get requester name
            requester_id = resource.get("submitted_for_approval_by") or resource.get("created_by")
            requester = await db.users.find_one({"id": requester_id}, {"_id": 0, "name": 1}) if requester_id else None
            requester_name = requester.get("name", "Officer") if requester else "Officer"
            
            entity_items.append({
                "id": f"resource_{resource['id']}",
                "item_type": "resource",
                "item_id": resource["id"],
                "item_number": resource.get("resource_number"),
                "item_title": resource.get("name") or f"Resource {resource.get('resource_number')}",
                "status": "pending",
                "message": f"Resource {resource.get('name') or resource.get('resource_number')} requires HoP approval",
                "requested_by_name": requester_name,
                "requested_at": resource.get("submitted_for_approval_at") or resource.get("created_at"),
                "vendor_name": "",
                "amount": 0
            })
    
    # Combine and deduplicate: prefer entity query results over notifications
    # Entity items have more accurate requester info from the entity itself
    seen_item_ids = set()
    all_items = []
    
    # First add entity items (they have better data)
    for item in entity_items:
        item_id = item.get("item_id")
        if item_id and item_id not in seen_item_ids:
            seen_item_ids.add(item_id)
            all_items.append(item)
    
    # Then add notification items that aren't duplicates
    for item in notification_items:
        item_id = item.get("item_id")
        if item_id and item_id not in seen_item_ids:
            seen_item_ids.add(item_id)
            all_items.append(item)
    
    # Sort all items by requested_at (handle both datetime and string types)
    def get_sort_key(item):
        val = item.get("requested_at", "")
        if val is None:
            return ""
        if hasattr(val, 'isoformat'):  # datetime object
            return val.isoformat()
        return str(val)
    
    all_items.sort(key=get_sort_key, reverse=True)
    
    return {
        "notifications": all_items,
        "count": len(all_items)
    }


@router.get("/approval-history")
async def get_approval_history(request: Request):
    """Get approval history for the current user"""
    user = await require_auth(request)
    
    notifications = await db.approval_notifications.find(
        {"user_id": user.id, "status": {"$ne": "pending"}},
        {"_id": 0}
    ).sort("decision_at", -1).to_list(100)
    
    return {
        "history": notifications,
        "count": len(notifications)
    }


# ==================== STATUS CHECK ENDPOINT ====================

@router.get("/{tender_id}/workflow-status")
async def get_workflow_status(tender_id: str, request: Request):
    """Get detailed workflow status for a Business Request"""
    user = await require_auth(request)
    
    tender = await db.tenders.find_one({"id": tender_id}, {"_id": 0})
    if not tender:
        raise HTTPException(status_code=404, detail="Business Request not found")
    
    # Get proposals count
    proposals_count = await db.proposals.count_documents({"tender_id": tender_id})
    
    # Check user's role in this workflow
    is_creator = tender.get("created_by") == user.id
    is_additional_approver = tender.get("additional_approver_id") == user.id
    is_officer = user.role in ["procurement_officer", "procurement_manager", "admin"]
    is_hop = user.role in ["procurement_manager", "admin"]
    
    # Determine what actions the user can take
    can_evaluate = is_creator and tender.get("status") in ["published", "pending_evaluation"]
    can_approve_additional = is_additional_approver and tender.get("status") == "pending_additional_approval"
    can_forward_to_approver = is_officer and tender.get("status") == "evaluation_complete"
    can_forward_to_hop = is_officer and tender.get("status") == "evaluation_complete"
    can_hop_decide = is_hop and tender.get("status") == "pending_hop_approval"
    
    return {
        "tender_id": tender_id,
        "tender_number": tender.get("tender_number"),
        "title": tender.get("title"),
        "status": tender.get("status"),
        "proposals_count": proposals_count,
        "created_by": tender.get("created_by"),
        "is_creator": is_creator,
        
        # Workflow state
        "evaluation_submitted": tender.get("evaluation_submitted_at") is not None,
        "selected_proposal_id": tender.get("selected_proposal_id"),
        "additional_approver": tender.get("additional_approver_name"),
        "additional_approval_status": tender.get("additional_approval_decision"),
        "hop_decision": tender.get("hop_decision"),
        
        # Actions available to current user
        "actions": {
            "can_evaluate": can_evaluate,
            "can_approve_as_additional": can_approve_additional,
            "can_forward_to_approver": can_forward_to_approver,
            "can_forward_to_hop": can_forward_to_hop,
            "can_hop_decide": can_hop_decide
        },
        
        # Auto-created resources
        "auto_created_contract_id": tender.get("auto_created_contract_id"),
        "auto_created_po_id": tender.get("auto_created_po_id"),
        
        # Audit trail
        "audit_trail": tender.get("audit_trail", [])
    }



# ==================== ENHANCED EVALUATION WORKFLOW ENDPOINTS ====================

@router.get("/active-users-list")
async def get_active_users_list(request: Request):
    """Get list of all active users for review/approval assignment"""
    user = await require_auth(request)
    
    if user.role not in ["procurement_officer", "procurement_manager", "admin", "hop"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all active users
    users = await db.users.find(
        {"status": {"$ne": "disabled"}},
        {"_id": 0, "id": 1, "email": 1, "name": 1, "role": 1}
    ).sort("name", 1).to_list(500)
    
    return {"users": users, "count": len(users)}


@router.post("/{tender_id}/update-evaluation")
async def update_evaluation(tender_id: str, data: UpdateEvaluationRequest, request: Request):
    """
    Officer reviews and updates/amends the evaluation
    Can change selected proposal, scores, and notes
    """
    user = await require_auth(request)
    
    if user.role not in ["procurement_officer", "procurement_manager", "admin", "hop"]:
        raise HTTPException(status_code=403, detail="Only officers can update evaluations")
    
    tender = await db.tenders.find_one({"id": tender_id})
    if not tender:
        raise HTTPException(status_code=404, detail="Business Request not found")
    
    # Allow update in various evaluation states - officer can re-evaluate at any point
    allowed_statuses = ["evaluation_complete", "returned_for_revision", "pending_review", "pending_approval", "pending_additional_approval", "review_complete", "approval_complete"]
    if tender.get("status") not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Cannot update evaluation in '{tender.get('status')}' status. Allowed: {allowed_statuses}")
    
    # Build update data
    update_data = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "evaluation_updated_by": user.id,
        "evaluation_updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if data.selected_proposal_id:
        # Verify proposal exists
        proposal = await db.proposals.find_one({"id": data.selected_proposal_id, "tender_id": tender_id})
        if not proposal:
            raise HTTPException(status_code=404, detail="Selected proposal not found")
        update_data["selected_proposal_id"] = data.selected_proposal_id
    
    if data.evaluation_notes:
        update_data["evaluation_notes"] = data.evaluation_notes
    if data.technical_score is not None:
        update_data["evaluation_technical_score"] = data.technical_score
    if data.financial_score is not None:
        update_data["evaluation_financial_score"] = data.financial_score
    if data.overall_score is not None:
        update_data["evaluation_overall_score"] = data.overall_score
    if data.recommendation:
        update_data["evaluation_recommendation"] = data.recommendation
    
    # Reset status if it was returned
    if tender.get("status") == "returned_for_revision":
        update_data["status"] = "evaluation_complete"
    
    audit_trail = add_audit_trail(tender, "evaluation_updated", user.id, data.evaluation_notes)
    update_data["audit_trail"] = audit_trail
    
    await db.tenders.update_one({"id": tender_id}, {"$set": update_data})
    
    return {"success": True, "message": "Evaluation updated successfully"}


@router.post("/{tender_id}/forward-for-review")
async def forward_for_review(tender_id: str, data: ForwardForReviewRequest, request: Request):
    """
    Officer forwards evaluation to multiple users for review/validation (parallel)
    All reviewers will receive notifications
    """
    user = await require_auth(request)
    
    if user.role not in ["procurement_officer", "procurement_manager", "admin", "hop"]:
        raise HTTPException(status_code=403, detail="Only officers can forward for review")
    
    tender = await db.tenders.find_one({"id": tender_id})
    if not tender:
        raise HTTPException(status_code=404, detail="Business Request not found")
    
    # Accept legacy status + new statuses
    allowed_statuses = ["evaluation_complete", "returned_for_revision", "pending_additional_approval"]
    if tender.get("status") not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Cannot forward for review from '{tender.get('status')}' status. Allowed: {allowed_statuses}")
    
    if not data.reviewer_user_ids or len(data.reviewer_user_ids) == 0:
        raise HTTPException(status_code=400, detail="At least one reviewer must be selected")
    
    # Get reviewer info
    reviewers = []
    reviewer_statuses = []
    for reviewer_id in data.reviewer_user_ids:
        reviewer = await db.users.find_one({"id": reviewer_id}, {"_id": 0, "id": 1, "name": 1, "email": 1})
        if reviewer:
            reviewers.append(reviewer)
            reviewer_statuses.append({
                "user_id": reviewer_id,
                "user_name": reviewer.get("name") or reviewer.get("email"),
                "status": "pending",
                "assigned_at": datetime.now(timezone.utc).isoformat()
            })
    
    reviewer_names = ", ".join([r.get("name") or r.get("email") for r in reviewers])
    audit_trail = add_audit_trail(tender, "forwarded_for_review", user.id, f"Reviewers: {reviewer_names}")
    
    await db.tenders.update_one(
        {"id": tender_id},
        {"$set": {
            "status": "pending_review",
            "reviewers": reviewer_statuses,
            "review_requested_by": user.id,
            "review_requested_at": datetime.now(timezone.utc).isoformat(),
            "review_notes": data.notes,
            "audit_trail": audit_trail,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create notifications for all reviewers
    for reviewer in reviewers:
        await create_approval_notification(
            user_id=reviewer["id"],
            item_type="business_request_review",
            item_id=tender_id,
            item_number=tender.get("tender_number"),
            item_title=tender.get("title"),
            requested_by=user.id,
            message=f"Business Request '{tender.get('title')}' requires your review and validation. {data.notes or ''}"
        )
    
    return {"success": True, "message": f"Forwarded to {len(reviewers)} reviewer(s) for review"}


@router.post("/{tender_id}/reviewer-decision")
async def reviewer_decision(tender_id: str, data: ReviewerDecisionRequest, request: Request):
    """
    Reviewer submits their validation decision
    All reviewers must validate for the request to proceed
    """
    user = await require_auth(request)
    
    tender = await db.tenders.find_one({"id": tender_id})
    if not tender:
        raise HTTPException(status_code=404, detail="Business Request not found")
    
    if tender.get("status") != "pending_review":
        raise HTTPException(status_code=400, detail="This request is not pending review")
    
    # Check if user is one of the reviewers
    reviewers = tender.get("reviewers", [])
    user_reviewer = None
    for r in reviewers:
        if r.get("user_id") == user.id:
            user_reviewer = r
            break
    
    if not user_reviewer:
        raise HTTPException(status_code=403, detail="You are not assigned as a reviewer for this request")
    
    if user_reviewer.get("status") != "pending":
        raise HTTPException(status_code=400, detail="You have already submitted your review")
    
    valid_decisions = ["validated", "returned"]
    if data.decision not in valid_decisions:
        raise HTTPException(status_code=400, detail=f"Invalid decision. Must be: {valid_decisions}")
    
    # Update the reviewer's status
    for r in reviewers:
        if r.get("user_id") == user.id:
            r["status"] = data.decision
            r["decision_at"] = datetime.now(timezone.utc).isoformat()
            r["notes"] = data.notes
            break
    
    audit_trail = add_audit_trail(tender, f"reviewer_{data.decision}", user.id, data.notes)
    
    # Update notification
    await db.approval_notifications.update_one(
        {"item_id": tender_id, "user_id": user.id, "item_type": "business_request_review", "status": "pending"},
        {"$set": {
            "status": data.decision,
            "decision_at": datetime.now(timezone.utc).isoformat(),
            "decision_notes": data.notes
        }}
    )
    
    # Check if all reviewers have responded
    all_responded = all(r.get("status") != "pending" for r in reviewers)
    any_returned = any(r.get("status") == "returned" for r in reviewers)
    
    new_status = tender.get("status")
    if all_responded:
        if any_returned:
            new_status = "returned_for_revision"  # Any return sends back to officer
        else:
            new_status = "review_complete"  # All validated
    
    await db.tenders.update_one(
        {"id": tender_id},
        {"$set": {
            "status": new_status,
            "reviewers": reviewers,
            "audit_trail": audit_trail,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    status_message = "Review submitted"
    if all_responded:
        if any_returned:
            status_message = "Returned to officer for revision"
        else:
            status_message = "All reviews complete - ready for approval"
    
    return {"success": True, "message": status_message, "all_reviewed": all_responded}


@router.post("/{tender_id}/forward-for-approval")
async def forward_for_approval(tender_id: str, data: ForwardForApprovalRequest, request: Request):
    """
    Officer forwards to multiple approvers (parallel - all must approve)
    Can skip review step and go directly to approval
    """
    user = await require_auth(request)
    
    if user.role not in ["procurement_officer", "procurement_manager", "admin", "hop"]:
        raise HTTPException(status_code=403, detail="Only officers can forward for approval")
    
    tender = await db.tenders.find_one({"id": tender_id})
    if not tender:
        raise HTTPException(status_code=404, detail="Business Request not found")
    
    # Allow forwarding from multiple states - review step is optional
    allowed_statuses = ["evaluation_complete", "review_complete", "returned_for_revision", "pending_additional_approval", "pending_review"]
    if tender.get("status") not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Cannot forward for approval in '{tender.get('status')}' status. Allowed: {allowed_statuses}")
    
    if not data.approver_user_ids or len(data.approver_user_ids) == 0:
        raise HTTPException(status_code=400, detail="At least one approver must be selected")
    
    # Get approver info
    approvers = []
    approver_statuses = []
    for approver_id in data.approver_user_ids:
        approver = await db.users.find_one({"id": approver_id}, {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1})
        if approver:
            approvers.append(approver)
            approver_statuses.append({
                "user_id": approver_id,
                "user_name": approver.get("name") or approver.get("email"),
                "user_role": approver.get("role"),
                "status": "pending",
                "assigned_at": datetime.now(timezone.utc).isoformat()
            })
    
    approver_names = ", ".join([a.get("name") or a.get("email") for a in approvers])
    audit_trail = add_audit_trail(tender, "forwarded_for_approval", user.id, f"Approvers: {approver_names}")
    
    await db.tenders.update_one(
        {"id": tender_id},
        {"$set": {
            "status": "pending_approval",
            "approvers": approver_statuses,
            "approval_requested_by": user.id,
            "approval_requested_at": datetime.now(timezone.utc).isoformat(),
            "approval_notes": data.notes,
            "audit_trail": audit_trail,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create notifications for all approvers
    for approver in approvers:
        await create_approval_notification(
            user_id=approver["id"],
            item_type="business_request_approval",
            item_id=tender_id,
            item_number=tender.get("tender_number"),
            item_title=tender.get("title"),
            requested_by=user.id,
            message=f"Business Request '{tender.get('title')}' requires your approval. {data.notes or ''}"
        )
    
    return {"success": True, "message": f"Forwarded to {len(approvers)} approver(s)"}


@router.post("/{tender_id}/approver-decision")
async def approver_decision(tender_id: str, data: ApproverDecisionRequest, request: Request):
    """
    Approver submits their decision (parallel - all must approve)
    """
    user = await require_auth(request)
    
    tender = await db.tenders.find_one({"id": tender_id})
    if not tender:
        raise HTTPException(status_code=404, detail="Business Request not found")
    
    if tender.get("status") != "pending_approval":
        raise HTTPException(status_code=400, detail="This request is not pending approval")
    
    # Check if user is one of the approvers
    approvers = tender.get("approvers", [])
    user_approver = None
    for a in approvers:
        if a.get("user_id") == user.id:
            user_approver = a
            break
    
    if not user_approver:
        raise HTTPException(status_code=403, detail="You are not assigned as an approver for this request")
    
    if user_approver.get("status") != "pending":
        raise HTTPException(status_code=400, detail="You have already submitted your decision")
    
    valid_decisions = ["approved", "rejected", "returned"]
    if data.decision not in valid_decisions:
        raise HTTPException(status_code=400, detail=f"Invalid decision. Must be: {valid_decisions}")
    
    # Update the approver's status
    for a in approvers:
        if a.get("user_id") == user.id:
            a["status"] = data.decision
            a["decision_at"] = datetime.now(timezone.utc).isoformat()
            a["notes"] = data.notes
            break
    
    audit_trail = add_audit_trail(tender, f"approver_{data.decision}", user.id, data.notes)
    
    # Update notification
    await db.approval_notifications.update_one(
        {"item_id": tender_id, "user_id": user.id, "item_type": "business_request_approval", "status": "pending"},
        {"$set": {
            "status": data.decision,
            "decision_at": datetime.now(timezone.utc).isoformat(),
            "decision_notes": data.notes
        }}
    )
    
    # Check if all approvers have responded
    all_responded = all(a.get("status") != "pending" for a in approvers)
    any_rejected = any(a.get("status") == "rejected" for a in approvers)
    any_returned = any(a.get("status") == "returned" for a in approvers)
    all_approved = all(a.get("status") == "approved" for a in approvers)
    
    new_status = tender.get("status")
    if all_responded:
        if any_rejected:
            new_status = "rejected"
        elif any_returned:
            new_status = "returned_for_revision"
        elif all_approved:
            new_status = "approval_complete"  # Ready for HoP
    
    await db.tenders.update_one(
        {"id": tender_id},
        {"$set": {
            "status": new_status,
            "approvers": approvers,
            "audit_trail": audit_trail,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    status_message = "Decision submitted"
    if all_responded:
        if any_rejected:
            status_message = "Request rejected"
        elif any_returned:
            status_message = "Returned to officer for revision"
        elif all_approved:
            status_message = "All approvers approved - ready for HoP final approval"
    
    return {"success": True, "message": status_message, "all_decided": all_responded}


@router.post("/{tender_id}/skip-to-hop")
async def skip_to_hop(tender_id: str, data: ForwardToHoPRequest, request: Request):
    """
    Officer skips review/approval steps and forwards directly to HoP
    Can be used at any point in the workflow
    """
    user = await require_auth(request)
    
    if user.role not in ["procurement_officer", "procurement_manager", "admin", "hop"]:
        raise HTTPException(status_code=403, detail="Only officers can skip to HoP")
    
    tender = await db.tenders.find_one({"id": tender_id})
    if not tender:
        raise HTTPException(status_code=404, detail="Business Request not found")
    
    # Allow skip from any workflow state - full flexibility for officers
    allowed_statuses = ["evaluation_complete", "review_complete", "approval_complete", "returned_for_revision", "pending_additional_approval", "pending_review", "pending_approval"]
    if tender.get("status") not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Cannot skip to HoP from '{tender.get('status')}' status. Allowed: {allowed_statuses}")
    
    audit_trail = add_audit_trail(tender, "skipped_to_hop", user.id, data.notes)
    
    await db.tenders.update_one(
        {"id": tender_id},
        {"$set": {
            "status": "pending_hop_approval",
            "hop_approval_requested_by": user.id,
            "hop_approval_requested_at": datetime.now(timezone.utc).isoformat(),
            "hop_approval_notes": data.notes,
            "skipped_to_hop": True,
            "audit_trail": audit_trail,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify HoP users
    hop_users = await db.users.find(
        {"role": {"$in": ["procurement_manager", "hop", "admin"]}},
        {"id": 1}
    ).to_list(10)
    
    for hop_user in hop_users:
        await create_approval_notification(
            user_id=hop_user["id"],
            item_type="business_request",
            item_id=tender_id,
            item_number=tender.get("tender_number"),
            item_title=tender.get("title"),
            requested_by=user.id,
            message=f"Business Request '{tender.get('title')}' requires HoP final approval (direct submission)"
        )
    
    return {"success": True, "message": "Forwarded directly to HoP for final approval"}


@router.get("/{tender_id}/evaluation-workflow-status")
async def get_evaluation_workflow_status(tender_id: str, request: Request):
    """Get detailed evaluation workflow status including reviewers and approvers"""
    user = await require_auth(request)
    
    tender = await db.tenders.find_one({"id": tender_id}, {"_id": 0})
    if not tender:
        raise HTTPException(status_code=404, detail="Business Request not found")
    
    # Check user's role
    is_officer = user.role in ["procurement_officer", "procurement_manager", "admin", "hop"]
    is_reviewer = any(r.get("user_id") == user.id for r in tender.get("reviewers", []))
    is_approver = any(a.get("user_id") == user.id for a in tender.get("approvers", []))
    is_hop = user.role in ["procurement_manager", "admin", "hop"]
    
    # Determine available actions
    can_update_evaluation = is_officer and tender.get("status") in ["evaluation_complete", "returned_for_revision", "review_complete", "approval_complete"]
    can_forward_for_review = is_officer and tender.get("status") in ["evaluation_complete", "returned_for_revision"]
    can_forward_for_approval = is_officer and tender.get("status") in ["evaluation_complete", "review_complete", "returned_for_revision"]
    can_skip_to_hop = is_officer and tender.get("status") in ["evaluation_complete", "review_complete", "approval_complete", "returned_for_revision"]
    can_forward_to_hop = is_officer and tender.get("status") in ["approval_complete"]
    can_review = is_reviewer and tender.get("status") == "pending_review"
    can_approve = is_approver and tender.get("status") == "pending_approval"
    can_hop_decide = is_hop and tender.get("status") == "pending_hop_approval"
    
    # Get my pending status
    my_review_status = None
    my_approval_status = None
    for r in tender.get("reviewers", []):
        if r.get("user_id") == user.id:
            my_review_status = r.get("status")
    for a in tender.get("approvers", []):
        if a.get("user_id") == user.id:
            my_approval_status = a.get("status")
    
    return {
        "tender_id": tender_id,
        "tender_number": tender.get("tender_number"),
        "title": tender.get("title"),
        "status": tender.get("status"),
        
        # Evaluation info
        "selected_proposal_id": tender.get("selected_proposal_id"),
        "evaluation_notes": tender.get("evaluation_notes"),
        "evaluation_submitted_by": tender.get("evaluation_submitted_by"),
        "evaluation_submitted_at": tender.get("evaluation_submitted_at"),
        "evaluation_updated_by": tender.get("evaluation_updated_by"),
        "evaluation_updated_at": tender.get("evaluation_updated_at"),
        
        # Reviewers
        "reviewers": tender.get("reviewers", []),
        "review_requested_at": tender.get("review_requested_at"),
        
        # Approvers  
        "approvers": tender.get("approvers", []),
        "approval_requested_at": tender.get("approval_requested_at"),
        
        # HoP
        "hop_decision": tender.get("hop_decision"),
        "hop_decision_at": tender.get("hop_decision_at"),
        "skipped_to_hop": tender.get("skipped_to_hop", False),
        
        # User's status
        "my_review_status": my_review_status,
        "my_approval_status": my_approval_status,
        
        # Available actions
        "actions": {
            "can_update_evaluation": can_update_evaluation,
            "can_forward_for_review": can_forward_for_review,
            "can_forward_for_approval": can_forward_for_approval,
            "can_skip_to_hop": can_skip_to_hop,
            "can_forward_to_hop": can_forward_to_hop,
            "can_review": can_review,
            "can_approve": can_approve,
            "can_hop_decide": can_hop_decide
        },
        
        # Audit trail
        "audit_trail": tender.get("audit_trail", [])
    }
