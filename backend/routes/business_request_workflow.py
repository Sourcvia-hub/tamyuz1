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
    
    if user.role not in ["procurement_officer", "procurement_manager", "admin"]:
        raise HTTPException(status_code=403, detail="Only procurement officers can forward to HoP")
    
    tender = await db.tenders.find_one({"id": tender_id})
    if not tender:
        raise HTTPException(status_code=404, detail="Business Request not found")
    
    # Must be in evaluation_complete (either directly or after additional approval)
    if tender.get("status") != "evaluation_complete":
        raise HTTPException(status_code=400, detail="Evaluation must be complete before forwarding to HoP")
    
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
    
    # Notify HoP users (procurement_manager role)
    hop_users = await db.users.find({"role": "procurement_manager"}, {"id": 1}).to_list(10)
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
    
    if user.role not in ["procurement_manager", "admin"]:
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
    
    all_items = []
    
    # 1. Get standard approval notifications
    notifications = await db.approval_notifications.find(
        {"user_id": user.id, "status": "pending"},
        {"_id": 0}
    ).sort("requested_at", -1).to_list(50)
    
    # Enrich with item details
    for notif in notifications:
        if notif.get("item_type") == "business_request":
            tender = await db.tenders.find_one(
                {"id": notif["item_id"]},
                {"_id": 0, "title": 1, "tender_number": 1, "budget": 1, "status": 1, "selected_proposal_id": 1}
            )
            notif["item_details"] = tender
        all_items.append(notif)
    
    # 2. If user is HoP, include pending contracts, deliverables, and assets
    if is_hop:
        # Get contracts pending HoP approval
        pending_contracts = await db.contracts.find(
            {"status": "pending_hop_approval"},
            {"_id": 0}
        ).to_list(50)
        
        for contract in pending_contracts:
            vendor = await db.vendors.find_one(
                {"id": contract.get("vendor_id")},
                {"_id": 0, "name_english": 1, "commercial_name": 1}
            )
            vendor_name = vendor.get("name_english") or vendor.get("commercial_name", "Unknown") if vendor else "Unknown"
            
            all_items.append({
                "id": f"contract_{contract['id']}",
                "item_type": "contract",
                "item_id": contract["id"],
                "item_number": contract.get("contract_number"),
                "item_title": contract.get("title"),
                "status": "pending",
                "message": f"Contract {contract.get('contract_number')} requires HoP approval",
                "requested_by_name": "Officer",
                "requested_at": contract.get("hop_submitted_at") or contract.get("created_at"),
                "vendor_name": vendor_name,
                "amount": contract.get("value", 0)
            })
        
        # Get deliverables pending HoP approval
        pending_deliverables = await db.deliverables.find(
            {"status": "pending_hop_approval"},
            {"_id": 0}
        ).to_list(50)
        
        for deliverable in pending_deliverables:
            vendor = await db.vendors.find_one(
                {"id": deliverable.get("vendor_id")},
                {"_id": 0, "name_english": 1, "commercial_name": 1}
            )
            vendor_name = vendor.get("name_english") or vendor.get("commercial_name", "Unknown") if vendor else "Unknown"
            
            all_items.append({
                "id": f"deliverable_{deliverable['id']}",
                "item_type": "deliverable",
                "item_id": deliverable["id"],
                "item_number": deliverable.get("deliverable_number"),
                "item_title": deliverable.get("title"),
                "status": "pending",
                "message": f"Deliverable {deliverable.get('deliverable_number')} requires HoP approval for payment",
                "requested_by_name": "Officer",
                "requested_at": deliverable.get("submitted_to_hop_at") or deliverable.get("created_at"),
                "vendor_name": vendor_name,
                "amount": deliverable.get("amount", 0)
            })
        
        # Get assets pending HoP approval
        pending_assets = await db.assets.find(
            {"approval_status": "pending_hop_approval"},
            {"_id": 0}
        ).to_list(50)
        
        for asset in pending_assets:
            vendor = await db.vendors.find_one(
                {"id": asset.get("vendor_id")},
                {"_id": 0, "name_english": 1, "commercial_name": 1}
            )
            vendor_name = vendor.get("name_english") or vendor.get("commercial_name", "Unknown") if vendor else "Unknown"
            
            all_items.append({
                "id": f"asset_{asset['id']}",
                "item_type": "asset",
                "item_id": asset["id"],
                "item_number": asset.get("asset_number"),
                "item_title": asset.get("name"),
                "status": "pending",
                "message": f"Asset {asset.get('asset_number')} registration requires HoP approval",
                "requested_by_name": "Officer",
                "requested_at": asset.get("submitted_for_approval_at") or asset.get("created_at"),
                "vendor_name": vendor_name,
                "amount": asset.get("cost", 0)
            })
    
    # Sort all items by requested_at
    all_items.sort(key=lambda x: x.get("requested_at", ""), reverse=True)
    
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
