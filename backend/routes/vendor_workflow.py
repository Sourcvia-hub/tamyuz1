"""
Special workflow routes for Vendor module
Vendors have unique rules:
- Procurement Officer can directly approve (no multi-level workflow)
- Draft vendors can be used in PR (Purchase Request) module
- Only approved vendors can be used in Contract and PO modules
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from utils.auth import get_current_user
from utils.workflow import WorkflowManager
from models.workflow import WorkflowStatus, WorkflowAction
import os

# MongoDB setup
from motor.motor_asyncio import AsyncIOMotorClient
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017/procureflix")
client = AsyncIOMotorClient(MONGO_URL)
db_name = MONGO_URL.split("/")[-1].split("?")[0]
db = client[db_name]

router = APIRouter(prefix="/vendors", tags=["Vendor Special Workflow"])


class DirectApprovalRequest(BaseModel):
    """Direct approval by Procurement Officer"""
    comment: Optional[str] = None


@router.post("/{vendor_id}/direct-approve")
async def direct_approve_vendor(
    vendor_id: str,
    approval_req: DirectApprovalRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Direct approval of vendor by Procurement Officer
    Vendors don't need multi-level approval workflow
    """
    # Check permissions - only procurement officers and managers
    if current_user["role"] not in ["procurement_officer", "procurement_manager"]:
        raise HTTPException(
            status_code=403, 
            detail="Only procurement officers can approve vendors"
        )
    
    # Get vendor
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Check current status - can only approve draft vendors
    if vendor.get("status") != WorkflowStatus.DRAFT:
        raise HTTPException(
            status_code=400, 
            detail=f"Vendor must be in draft status. Current status: {vendor.get('status')}"
        )
    
    # Update workflow
    workflow = vendor.get("workflow", {})
    
    # Add history entry for direct approval
    if "history" not in workflow:
        workflow["history"] = []
    
    workflow["history"].append({
        "action": WorkflowAction.FINAL_APPROVED,
        "by": current_user["id"],
        "by_name": current_user["name"],
        "at": datetime.now(timezone.utc).isoformat(),
        "comment": approval_req.comment or "Direct approval by procurement officer"
    })
    
    workflow["final_approved_by"] = current_user["id"]
    workflow["final_approved_by_name"] = current_user["name"]
    workflow["final_approved_at"] = datetime.now(timezone.utc).isoformat()
    
    # Update vendor status to approved
    await db.vendors.update_one(
        {"id": vendor_id},
        {
            "$set": {
                "status": "approved",
                "workflow": workflow,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "message": "Vendor approved successfully",
        "status": "approved",
        "vendor_id": vendor_id
    }


@router.get("/usable-in-pr")
async def get_vendors_usable_in_pr(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Get vendors that can be used in Purchase Requests
    Includes both draft and approved vendors
    """
    vendors = await db.vendors.find(
        {"status": {"$in": ["draft", "approved"]}},
        {"_id": 0}
    ).to_list(1000)
    
    return {
        "vendors": vendors,
        "count": len(vendors)
    }


@router.get("/usable-in-contracts")
async def get_vendors_usable_in_contracts(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Get vendors that can be used in Contracts
    Only approved vendors
    """
    vendors = await db.vendors.find(
        {"status": "approved"},
        {"_id": 0}
    ).to_list(1000)
    
    return {
        "vendors": vendors,
        "count": len(vendors)
    }


@router.get("/usable-in-po")
async def get_vendors_usable_in_po(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Get vendors that can be used in Purchase Orders
    Only approved vendors
    """
    vendors = await db.vendors.find(
        {"status": "approved"},
        {"_id": 0}
    ).to_list(1000)
    
    return {
        "vendors": vendors,
        "count": len(vendors)
    }


@router.patch("/{vendor_id}/edit-draft")
async def edit_draft_vendor(
    vendor_id: str,
    vendor_update: dict,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Edit draft vendor (Procurement Officer only)
    Users cannot edit vendors after creation
    """
    # Check permissions - only procurement officers and managers
    if current_user["role"] not in ["procurement_officer", "procurement_manager"]:
        raise HTTPException(
            status_code=403, 
            detail="Only procurement officers can edit draft vendors"
        )
    
    # Get vendor
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Check status - can only edit draft vendors
    if vendor.get("status") != WorkflowStatus.DRAFT:
        raise HTTPException(
            status_code=400, 
            detail="Only draft vendors can be edited"
        )
    
    # Update vendor
    vendor_update["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Add history entry
    workflow = vendor.get("workflow", {})
    if "history" not in workflow:
        workflow["history"] = []
    
    workflow["history"].append({
        "action": "edited",
        "by": current_user["id"],
        "by_name": current_user["name"],
        "at": datetime.now(timezone.utc).isoformat(),
        "comment": "Draft vendor edited by procurement officer"
    })
    
    vendor_update["workflow"] = workflow
    
    await db.vendors.update_one(
        {"id": vendor_id},
        {"$set": vendor_update}
    )
    
    return {
        "message": "Draft vendor updated successfully",
        "vendor_id": vendor_id
    }
