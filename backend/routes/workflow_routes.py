"""
Generic workflow API endpoints for all request modules
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from utils.auth import get_current_user
from utils.workflow import WorkflowManager
from models.workflow import WorkflowStatus
import os

# MongoDB setup - using existing connection from server
from motor.motor_asyncio import AsyncIOMotorClient
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017/procureflix")
client = AsyncIOMotorClient(MONGO_URL)
db_name = MONGO_URL.split("/")[-1].split("?")[0]
db = client[db_name]


# Request models
class SubmitRequest(BaseModel):
    """Submit request for review"""
    pass


class ReviewRequest(BaseModel):
    """Review and assign approvers"""
    assigned_approvers: List[str]
    comment: Optional[str] = None


class ApprovalRequest(BaseModel):
    """Approve a request"""
    comment: Optional[str] = None


class RejectionRequest(BaseModel):
    """Reject a request"""
    reason: str


class ReturnRequest(BaseModel):
    """Return for clarification"""
    reason: str


class ReopenRequest(BaseModel):
    """Reopen a completed request"""
    reason: str


class WorkflowRoutes:
    """Factory for creating workflow routes for a module"""
    
    def __init__(self, module_name: str, collection_name: str, module_permission: str):
        self.module_name = module_name
        self.collection_name = collection_name
        self.module_permission = module_permission
        self.router = APIRouter(prefix=f"/{collection_name}", tags=[f"{module_name} Workflow"])
    
    def get_collection(self):
        """Get MongoDB collection"""
        return db[self.collection_name]
    
    async def get_item(self, item_id: str):
        """Get item by ID"""
        collection = self.get_collection()
        item = await collection.find_one({"id": item_id})
        if not item:
            raise HTTPException(status_code=404, detail=f"{self.module_name} not found")
        return item
    
    async def update_item(self, item_id: str, update_data: dict):
        """Update item"""
        collection = self.get_collection()
        result = await collection.update_one(
            {"id": item_id},
            {"$set": update_data}
        )
        return result
    
    def create_routes(self):
        """Create all workflow routes"""
        
        @self.router.post("/{item_id}/submit")
        async def submit_for_review(
            item_id: str,
            request: Request,
            current_user: dict = Depends(get_current_user)
        ):
            """Submit request for review (User role)"""
            # Check permissions
            if current_user["role"] != "user":
                raise HTTPException(status_code=403, detail="Only users can submit requests")
            
            # Get item
            item = await self.get_item(item_id)
            
            # Check if user owns this request
            if item.get("created_by") != current_user["id"]:
                raise HTTPException(status_code=403, detail="You can only submit your own requests")
            
            # Check current status
            if item.get("status") not in [WorkflowStatus.DRAFT, WorkflowStatus.RETURNED_FOR_CLARIFICATION]:
                raise HTTPException(status_code=400, detail="Request cannot be submitted in current status")
            
            # Update workflow
            workflow = item.get("workflow", {})
            workflow = WorkflowManager.submit_for_review(
                workflow,
                current_user["id"],
                current_user["name"]
            )
            
            # Update status
            new_status = WorkflowStatus.PENDING_REVIEW
            
            await self.update_item(item_id, {
                "status": new_status,
                "workflow": workflow,
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            
            return {
                "message": "Request submitted for review",
                "status": new_status,
                "workflow": workflow
            }
        
        @self.router.post("/{item_id}/review")
        async def review_and_assign(
            item_id: str,
            review_req: ReviewRequest,
            request: Request,
            current_user: dict = Depends(get_current_user)
        ):
            """Review request and assign approvers (Procurement Officer)"""
            # Check permissions
            if current_user["role"] not in ["procurement_officer", "procurement_manager"]:
                raise HTTPException(status_code=403, detail="Only procurement officers can review requests")
            
            # Get item
            item = await self.get_item(item_id)
            
            # Check current status
            if item.get("status") != WorkflowStatus.PENDING_REVIEW:
                raise HTTPException(status_code=400, detail="Request must be in pending_review status")
            
            # Get approver names
            approver_names = []
            for approver_id in review_req.assigned_approvers:
                user = await db.users.find_one({"id": approver_id})
                if not user:
                    raise HTTPException(status_code=404, detail=f"Approver {approver_id} not found")
                if user.get("role") != "senior_manager":
                    raise HTTPException(status_code=400, detail=f"User {user.get('name')} is not an approver")
                approver_names.append(user.get("name"))
            
            # Update workflow
            workflow = item.get("workflow", {})
            workflow = WorkflowManager.review_and_assign(
                workflow,
                current_user["id"],
                current_user["name"],
                review_req.assigned_approvers,
                approver_names,
                review_req.comment
            )
            
            # Update status
            new_status = WorkflowStatus.REVIEWED
            
            await self.update_item(item_id, {
                "status": new_status,
                "workflow": workflow,
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            
            return {
                "message": f"Request reviewed and assigned to {len(review_req.assigned_approvers)} approver(s)",
                "status": new_status,
                "workflow": workflow
            }
        
        @self.router.post("/{item_id}/approve")
        async def approve_request(
            item_id: str,
            approval_req: ApprovalRequest,
            request: Request,
            current_user: dict = Depends(get_current_user)
        ):
            """Approve request (Approver role)"""
            # Check permissions
            if current_user["role"] != "senior_manager":
                raise HTTPException(status_code=403, detail="Only approvers can approve requests")
            
            # Get item
            item = await self.get_item(item_id)
            
            # Check current status
            if item.get("status") != WorkflowStatus.REVIEWED:
                raise HTTPException(status_code=400, detail="Request must be in reviewed status")
            
            # Check if user is assigned as approver
            workflow = item.get("workflow", {})
            if current_user["id"] not in workflow.get("assigned_approvers", []):
                raise HTTPException(status_code=403, detail="You are not assigned as an approver for this request")
            
            # Update workflow
            workflow, all_approved = WorkflowManager.approve(
                workflow,
                current_user["id"],
                current_user["name"],
                approval_req.comment
            )
            
            # Update status if all approved
            new_status = WorkflowStatus.APPROVED_BY_APPROVER if all_approved else WorkflowStatus.REVIEWED
            
            await self.update_item(item_id, {
                "status": new_status,
                "workflow": workflow,
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            
            approval_status = workflow.get("get_approval_status", lambda: {})()
            
            return {
                "message": "Approval recorded" if not all_approved else "All approvers have approved",
                "status": new_status,
                "workflow": workflow,
                "approval_status": approval_status
            }
        
        @self.router.post("/{item_id}/reject")
        async def reject_request(
            item_id: str,
            rejection_req: RejectionRequest,
            request: Request,
            current_user: dict = Depends(get_current_user)
        ):
            """Reject request (Approver or Procurement Manager)"""
            # Check permissions
            if current_user["role"] not in ["senior_manager", "procurement_manager"]:
                raise HTTPException(status_code=403, detail="Only approvers or procurement managers can reject")
            
            # Get item
            item = await self.get_item(item_id)
            
            # Update workflow
            workflow = item.get("workflow", {})
            workflow = WorkflowManager.reject(
                workflow,
                current_user["id"],
                current_user["name"],
                rejection_req.reason
            )
            
            # Only procurement manager can change status to rejected
            if current_user["role"] == "procurement_manager":
                new_status = WorkflowStatus.REJECTED
            else:
                # Approver rejection is just recorded, status unchanged
                new_status = item.get("status")
            
            await self.update_item(item_id, {
                "status": new_status,
                "workflow": workflow,
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            
            return {
                "message": "Rejection recorded" if current_user["role"] != "procurement_manager" else "Request rejected",
                "status": new_status,
                "workflow": workflow
            }
        
        @self.router.post("/{item_id}/return")
        async def return_for_clarification(
            item_id: str,
            return_req: ReturnRequest,
            request: Request,
            current_user: dict = Depends(get_current_user)
        ):
            """Return request for clarification"""
            # Check permissions
            if current_user["role"] not in ["procurement_officer", "senior_manager", "procurement_manager"]:
                raise HTTPException(status_code=403, detail="Insufficient permissions")
            
            # Get item
            item = await self.get_item(item_id)
            
            # Update workflow
            workflow = item.get("workflow", {})
            workflow = WorkflowManager.return_for_clarification(
                workflow,
                current_user["id"],
                current_user["name"],
                return_req.reason
            )
            
            # Update status
            new_status = WorkflowStatus.RETURNED_FOR_CLARIFICATION
            
            await self.update_item(item_id, {
                "status": new_status,
                "workflow": workflow,
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            
            return {
                "message": "Request returned for clarification",
                "status": new_status,
                "workflow": workflow
            }
        
        @self.router.post("/{item_id}/final-approve")
        async def final_approve_request(
            item_id: str,
            approval_req: ApprovalRequest,
            request: Request,
            current_user: dict = Depends(get_current_user)
        ):
            """Final approval (Procurement Manager only)"""
            # Check permissions
            if current_user["role"] != "procurement_manager":
                raise HTTPException(status_code=403, detail="Only procurement managers can grant final approval")
            
            # Get item
            item = await self.get_item(item_id)
            
            # Check current status
            if item.get("status") != WorkflowStatus.APPROVED_BY_APPROVER:
                raise HTTPException(status_code=400, detail="Request must be approved by all approvers first")
            
            # Update workflow
            workflow = item.get("workflow", {})
            workflow = WorkflowManager.final_approve(
                workflow,
                current_user["id"],
                current_user["name"],
                approval_req.comment
            )
            
            # Update status
            new_status = WorkflowStatus.FINAL_APPROVED
            
            await self.update_item(item_id, {
                "status": new_status,
                "workflow": workflow,
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            
            return {
                "message": "Request final approved",
                "status": new_status,
                "workflow": workflow
            }
        
        @self.router.post("/{item_id}/reopen")
        async def reopen_request(
            item_id: str,
            reopen_req: ReopenRequest,
            request: Request,
            current_user: dict = Depends(get_current_user)
        ):
            """Reopen a completed request (Procurement Manager only)"""
            # Check permissions
            if current_user["role"] != "procurement_manager":
                raise HTTPException(status_code=403, detail="Only procurement managers can reopen requests")
            
            # Get item
            item = await self.get_item(item_id)
            
            # Update workflow
            workflow = item.get("workflow", {})
            workflow = WorkflowManager.reopen(
                workflow,
                current_user["id"],
                current_user["name"],
                reopen_req.reason
            )
            
            # Set status back to reviewed so it can go through approval again
            new_status = WorkflowStatus.REVIEWED
            
            await self.update_item(item_id, {
                "status": new_status,
                "workflow": workflow,
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            
            return {
                "message": "Request reopened",
                "status": new_status,
                "workflow": workflow
            }
        
        @self.router.get("/{item_id}/workflow-history")
        async def get_workflow_history(
            item_id: str,
            request: Request,
            current_user: dict = Depends(get_current_user)
        ):
            """Get complete workflow history"""
            # Get item
            item = await self.get_item(item_id)
            
            workflow = item.get("workflow", {})
            
            return {
                "item_id": item_id,
                "current_status": item.get("status"),
                "workflow": workflow,
                "approval_status": workflow.get("get_approval_status", lambda: {})() if hasattr(workflow, 'get_approval_status') else {}
            }
        
        return self.router


def create_workflow_router(module_name: str, collection_name: str, module_permission: str):
    """Factory function to create workflow router for a module"""
    routes = WorkflowRoutes(module_name, collection_name, module_permission)
    return routes.create_routes()
