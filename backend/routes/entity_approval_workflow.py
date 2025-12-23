"""
Entity Approval Workflow Routes
Unified approval workflow for all entities:
- Contracts
- Purchase Orders (POs)
- Resources
- Assets
- Vendors (High Risk only)
- Deliverables (extends existing)

Workflow: Draft → Forward for Review (optional) → Forward to HoP → HoP Approval
"""
from fastapi import APIRouter, HTTPException, Request
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/entity-workflow", tags=["Entity Approval Workflow"])

# Import database and auth
from utils.database import db
from utils.auth import require_auth

# ==================== REQUEST MODELS ====================

class ForwardForReviewRequest(BaseModel):
    """Forward entity to users for review"""
    reviewer_user_ids: List[str]
    notes: Optional[str] = None


class ReviewerDecisionRequest(BaseModel):
    """Reviewer makes their decision"""
    decision: str  # "validated", "returned"
    notes: Optional[str] = None


class ForwardToHoPRequest(BaseModel):
    """Forward to HoP for final approval"""
    notes: Optional[str] = None


class HoPDecisionRequest(BaseModel):
    """HoP makes final decision"""
    decision: str  # "approved", "rejected"
    notes: Optional[str] = None


# ==================== HELPER FUNCTIONS ====================

def add_audit_trail(entity: dict, action: str, user_id: str, notes: str = None) -> list:
    """Add entry to audit trail"""
    audit_trail = entity.get("audit_trail", [])
    audit_trail.append({
        "action": action,
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "notes": notes
    })
    return audit_trail


async def get_user_name(user_id: str) -> str:
    """Get user name by ID"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1, "email": 1})
    if user:
        return user.get("name") or user.get("email", "Unknown")
    return "Unknown"


async def create_notification(user_id: str, entity_type: str, entity_id: str, entity_number: str, entity_title: str, requested_by: str, message: str):
    """Create approval notification"""
    await db.approval_notifications.insert_one({
        "id": str(__import__('uuid').uuid4()),
        "user_id": user_id,
        "item_type": f"{entity_type}_approval",
        "item_id": entity_id,
        "item_number": entity_number,
        "item_title": entity_title,
        "requested_by": requested_by,
        "message": message,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })


# ==================== ENTITY CONFIGURATION ====================

ENTITY_CONFIG = {
    "contract": {
        "collection": "contracts",
        "id_field": "id",
        "number_field": "contract_number",
        "title_field": "title",
        "draft_statuses": ["draft", "pending_signature", "active"],
        "workflow_statuses": ["pending_review", "review_complete", "pending_hop_approval", "approved", "rejected"]
    },
    "po": {
        "collection": "purchase_orders",
        "id_field": "id",
        "number_field": "po_number",
        "title_field": "title",
        "draft_statuses": ["draft", "pending_approval", "approved"],
        "workflow_statuses": ["pending_review", "review_complete", "pending_hop_approval", "approved", "rejected"]
    },
    "resource": {
        "collection": "resources",
        "id_field": "id",
        "number_field": "resource_number",
        "title_field": "name",
        "draft_statuses": ["draft", "pending", "active"],
        "workflow_statuses": ["pending_review", "review_complete", "pending_hop_approval", "approved", "rejected"]
    },
    "asset": {
        "collection": "assets",
        "id_field": "id",
        "number_field": "asset_tag",
        "title_field": "name",
        "draft_statuses": ["available", "in_use", "maintenance", "retired"],
        "workflow_statuses": ["pending_review", "review_complete", "pending_hop_approval", "approved", "rejected"]
    },
    "vendor": {
        "collection": "vendors",
        "id_field": "id",
        "number_field": "vendor_number",
        "title_field": "name",
        "draft_statuses": ["pending", "active", "inactive"],
        "workflow_statuses": ["pending_review", "review_complete", "pending_hop_approval", "approved", "rejected"],
        "requires_high_risk": True  # Only high risk vendors need approval
    },
    "deliverable": {
        "collection": "deliverables",
        "id_field": "id",
        "number_field": "deliverable_number",
        "title_field": "title",
        "draft_statuses": ["draft", "submitted", "validated"],
        "workflow_statuses": ["pending_review", "review_complete", "pending_hop_approval", "approved", "rejected"]
    }
}


# ==================== GENERIC WORKFLOW ENDPOINTS ====================

@router.get("/active-users")
async def get_active_users(request: Request):
    """Get list of all active users for review/approval assignment"""
    user = await require_auth(request)
    
    if user.role not in ["procurement_officer", "procurement_manager", "admin", "hop"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    users = await db.users.find(
        {"status": {"$ne": "disabled"}},
        {"_id": 0, "id": 1, "email": 1, "name": 1, "role": 1}
    ).sort("name", 1).to_list(500)
    
    return {"users": users, "count": len(users)}


@router.post("/{entity_type}/{entity_id}/forward-for-review")
async def forward_entity_for_review(entity_type: str, entity_id: str, data: ForwardForReviewRequest, request: Request):
    """Forward any entity for review - Officer only"""
    user = await require_auth(request)
    
    if user.role not in ["procurement_officer", "procurement_manager", "admin", "hop"]:
        raise HTTPException(status_code=403, detail="Only officers can forward for review")
    
    if entity_type not in ENTITY_CONFIG:
        raise HTTPException(status_code=400, detail=f"Invalid entity type: {entity_type}")
    
    config = ENTITY_CONFIG[entity_type]
    collection = db[config["collection"]]
    
    entity = await collection.find_one({config["id_field"]: entity_id})
    if not entity:
        raise HTTPException(status_code=404, detail=f"{entity_type.capitalize()} not found")
    
    # Check if vendor needs high risk approval
    if config.get("requires_high_risk") and entity.get("risk_score", 0) < 70:
        raise HTTPException(status_code=400, detail="Only high-risk vendors require approval workflow")
    
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
    audit_trail = add_audit_trail(entity, "forwarded_for_review", user.id, f"Reviewers: {reviewer_names}. {data.notes or ''}")
    
    await collection.update_one(
        {config["id_field"]: entity_id},
        {"$set": {
            "workflow_status": "pending_review",
            "reviewers": reviewer_statuses,
            "review_requested_by": user.id,
            "review_requested_at": datetime.now(timezone.utc).isoformat(),
            "review_notes": data.notes,
            "audit_trail": audit_trail,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create notifications
    entity_number = entity.get(config["number_field"], "N/A")
    entity_title = entity.get(config["title_field"], "Untitled")
    
    for reviewer in reviewers:
        await create_notification(
            user_id=reviewer["id"],
            entity_type=entity_type,
            entity_id=entity_id,
            entity_number=entity_number,
            entity_title=entity_title,
            requested_by=user.id,
            message=f"{entity_type.capitalize()} '{entity_title}' requires your review. {data.notes or ''}"
        )
    
    return {"success": True, "message": f"Forwarded to {len(reviewers)} reviewer(s)"}


@router.post("/{entity_type}/{entity_id}/reviewer-decision")
async def entity_reviewer_decision(entity_type: str, entity_id: str, data: ReviewerDecisionRequest, request: Request):
    """Reviewer submits decision for any entity"""
    user = await require_auth(request)
    
    if entity_type not in ENTITY_CONFIG:
        raise HTTPException(status_code=400, detail=f"Invalid entity type: {entity_type}")
    
    config = ENTITY_CONFIG[entity_type]
    collection = db[config["collection"]]
    
    entity = await collection.find_one({config["id_field"]: entity_id})
    if not entity:
        raise HTTPException(status_code=404, detail=f"{entity_type.capitalize()} not found")
    
    if entity.get("workflow_status") != "pending_review":
        raise HTTPException(status_code=400, detail="This item is not pending review")
    
    # Check if user is a reviewer
    reviewers = entity.get("reviewers", [])
    user_reviewer = None
    for r in reviewers:
        if r.get("user_id") == user.id:
            user_reviewer = r
            break
    
    if not user_reviewer:
        raise HTTPException(status_code=403, detail="You are not assigned as a reviewer")
    
    if user_reviewer.get("status") != "pending":
        raise HTTPException(status_code=400, detail="You have already submitted your review")
    
    valid_decisions = ["validated", "returned"]
    if data.decision not in valid_decisions:
        raise HTTPException(status_code=400, detail=f"Invalid decision. Must be: {valid_decisions}")
    
    # Update reviewer status
    for r in reviewers:
        if r.get("user_id") == user.id:
            r["status"] = data.decision
            r["decision_at"] = datetime.now(timezone.utc).isoformat()
            r["notes"] = data.notes
            break
    
    audit_trail = add_audit_trail(entity, f"reviewer_{data.decision}", user.id, data.notes)
    
    # Check if all reviewers responded
    all_responded = all(r.get("status") != "pending" for r in reviewers)
    any_returned = any(r.get("status") == "returned" for r in reviewers)
    
    new_status = entity.get("workflow_status")
    if all_responded:
        new_status = "returned_for_revision" if any_returned else "review_complete"
    
    await collection.update_one(
        {config["id_field"]: entity_id},
        {"$set": {
            "workflow_status": new_status,
            "reviewers": reviewers,
            "audit_trail": audit_trail,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    status_message = "Review submitted"
    if all_responded:
        status_message = "Returned for revision" if any_returned else "All reviews complete - ready for HoP"
    
    return {"success": True, "message": status_message, "all_reviewed": all_responded}


@router.post("/{entity_type}/{entity_id}/forward-to-hop")
async def forward_entity_to_hop(entity_type: str, entity_id: str, data: ForwardToHoPRequest, request: Request):
    """Forward entity to HoP for final approval - can skip review"""
    user = await require_auth(request)
    
    if user.role not in ["procurement_officer", "procurement_manager", "admin", "hop"]:
        raise HTTPException(status_code=403, detail="Only officers can forward to HoP")
    
    if entity_type not in ENTITY_CONFIG:
        raise HTTPException(status_code=400, detail=f"Invalid entity type: {entity_type}")
    
    config = ENTITY_CONFIG[entity_type]
    collection = db[config["collection"]]
    
    entity = await collection.find_one({config["id_field"]: entity_id})
    if not entity:
        raise HTTPException(status_code=404, detail=f"{entity_type.capitalize()} not found")
    
    # Check if vendor needs high risk approval
    if config.get("requires_high_risk") and entity.get("risk_score", 0) < 70:
        raise HTTPException(status_code=400, detail="Only high-risk vendors require HoP approval")
    
    audit_trail = add_audit_trail(entity, "forwarded_to_hop", user.id, data.notes)
    
    await collection.update_one(
        {config["id_field"]: entity_id},
        {"$set": {
            "workflow_status": "pending_hop_approval",
            "hop_requested_by": user.id,
            "hop_requested_at": datetime.now(timezone.utc).isoformat(),
            "hop_request_notes": data.notes,
            "audit_trail": audit_trail,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify HoP users
    hop_users = await db.users.find(
        {"role": {"$in": ["procurement_manager", "hop", "admin"]}},
        {"id": 1}
    ).to_list(10)
    
    entity_number = entity.get(config["number_field"], "N/A")
    entity_title = entity.get(config["title_field"], "Untitled")
    
    for hop_user in hop_users:
        await create_notification(
            user_id=hop_user["id"],
            entity_type=entity_type,
            entity_id=entity_id,
            entity_number=entity_number,
            entity_title=entity_title,
            requested_by=user.id,
            message=f"{entity_type.capitalize()} '{entity_title}' requires HoP final approval. {data.notes or ''}"
        )
    
    return {"success": True, "message": "Forwarded to HoP for final approval"}


@router.post("/{entity_type}/{entity_id}/hop-decision")
async def entity_hop_decision(entity_type: str, entity_id: str, data: HoPDecisionRequest, request: Request):
    """HoP makes final decision on any entity"""
    user = await require_auth(request)
    
    if user.role not in ["procurement_manager", "admin", "hop"]:
        raise HTTPException(status_code=403, detail="Only HoP can make final decisions")
    
    if entity_type not in ENTITY_CONFIG:
        raise HTTPException(status_code=400, detail=f"Invalid entity type: {entity_type}")
    
    config = ENTITY_CONFIG[entity_type]
    collection = db[config["collection"]]
    
    entity = await collection.find_one({config["id_field"]: entity_id})
    if not entity:
        raise HTTPException(status_code=404, detail=f"{entity_type.capitalize()} not found")
    
    if entity.get("workflow_status") != "pending_hop_approval":
        raise HTTPException(status_code=400, detail="This item is not pending HoP approval")
    
    valid_decisions = ["approved", "rejected"]
    if data.decision not in valid_decisions:
        raise HTTPException(status_code=400, detail=f"Invalid decision. Must be: {valid_decisions}")
    
    audit_trail = add_audit_trail(entity, f"hop_{data.decision}", user.id, data.notes)
    
    # Determine final status based on entity type and decision
    final_status = data.decision
    if data.decision == "approved":
        if entity_type == "contract":
            final_status = "active"
        elif entity_type == "po":
            final_status = "approved"
        elif entity_type == "resource":
            final_status = "active"
        elif entity_type == "asset":
            final_status = "available"
        elif entity_type == "vendor":
            final_status = "active"
        elif entity_type == "deliverable":
            final_status = "approved"
    
    await collection.update_one(
        {config["id_field"]: entity_id},
        {"$set": {
            "workflow_status": data.decision,
            "status": final_status,
            "hop_decision": data.decision,
            "hop_decision_by": user.id,
            "hop_decision_at": datetime.now(timezone.utc).isoformat(),
            "hop_decision_notes": data.notes,
            "audit_trail": audit_trail,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True, 
        "message": f"{entity_type.capitalize()} {data.decision}",
        "final_status": final_status
    }


@router.get("/{entity_type}/{entity_id}/workflow-status")
async def get_entity_workflow_status(entity_type: str, entity_id: str, request: Request):
    """Get workflow status for any entity"""
    user = await require_auth(request)
    
    if entity_type not in ENTITY_CONFIG:
        raise HTTPException(status_code=400, detail=f"Invalid entity type: {entity_type}")
    
    config = ENTITY_CONFIG[entity_type]
    collection = db[config["collection"]]
    
    entity = await collection.find_one({config["id_field"]: entity_id}, {"_id": 0})
    if not entity:
        raise HTTPException(status_code=404, detail=f"{entity_type.capitalize()} not found")
    
    # Check user's role and permissions
    is_officer = user.role in ["procurement_officer", "procurement_manager", "admin", "hop"]
    is_hop = user.role in ["procurement_manager", "admin", "hop"]
    is_reviewer = any(r.get("user_id") == user.id for r in entity.get("reviewers", []))
    
    workflow_status = entity.get("workflow_status")
    
    # Determine available actions
    can_forward_for_review = is_officer and workflow_status in [None, "returned_for_revision", "review_complete"]
    can_forward_to_hop = is_officer and workflow_status in [None, "review_complete", "returned_for_revision", "pending_review"]
    can_review = is_reviewer and workflow_status == "pending_review"
    can_hop_decide = is_hop and workflow_status == "pending_hop_approval"
    
    # Check if high risk vendor requirement
    requires_workflow = True
    if config.get("requires_high_risk"):
        requires_workflow = entity.get("risk_score", 0) >= 70
    
    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "entity_number": entity.get(config["number_field"]),
        "entity_title": entity.get(config["title_field"]),
        "status": entity.get("status"),
        "workflow_status": workflow_status,
        "requires_workflow": requires_workflow,
        
        # Review info
        "reviewers": entity.get("reviewers", []),
        "review_requested_at": entity.get("review_requested_at"),
        
        # HoP info
        "hop_decision": entity.get("hop_decision"),
        "hop_decision_at": entity.get("hop_decision_at"),
        "hop_decision_notes": entity.get("hop_decision_notes"),
        
        # Available actions
        "actions": {
            "can_forward_for_review": can_forward_for_review and requires_workflow,
            "can_forward_to_hop": can_forward_to_hop and requires_workflow,
            "can_review": can_review,
            "can_hop_decide": can_hop_decide
        },
        
        # Audit trail
        "audit_trail": entity.get("audit_trail", [])
    }


# ==================== BULK WORKFLOW STATUS ====================

@router.get("/pending-approvals")
async def get_pending_approvals(request: Request):
    """Get all entities pending approval for current user"""
    user = await require_auth(request)
    
    is_hop = user.role in ["procurement_manager", "admin", "hop"]
    
    pending = {
        "pending_review": [],
        "pending_hop_approval": []
    }
    
    for entity_type, config in ENTITY_CONFIG.items():
        collection = db[config["collection"]]
        
        # Get items pending review (where user is reviewer)
        if True:  # All users can be reviewers
            review_items = await collection.find(
                {
                    "workflow_status": "pending_review",
                    "reviewers.user_id": user.id,
                    "reviewers.status": "pending"
                },
                {"_id": 0, config["id_field"]: 1, config["number_field"]: 1, config["title_field"]: 1}
            ).to_list(50)
            
            for item in review_items:
                pending["pending_review"].append({
                    "entity_type": entity_type,
                    "entity_id": item.get(config["id_field"]),
                    "entity_number": item.get(config["number_field"]),
                    "entity_title": item.get(config["title_field"])
                })
        
        # Get items pending HoP approval
        if is_hop:
            hop_items = await collection.find(
                {"workflow_status": "pending_hop_approval"},
                {"_id": 0, config["id_field"]: 1, config["number_field"]: 1, config["title_field"]: 1}
            ).to_list(50)
            
            for item in hop_items:
                pending["pending_hop_approval"].append({
                    "entity_type": entity_type,
                    "entity_id": item.get(config["id_field"]),
                    "entity_number": item.get(config["number_field"]),
                    "entity_title": item.get(config["title_field"])
                })
    
    return {
        "pending_review_count": len(pending["pending_review"]),
        "pending_hop_approval_count": len(pending["pending_hop_approval"]),
        "pending": pending
    }
