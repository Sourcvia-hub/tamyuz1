"""
Approvals Hub Routes - Unified approval dashboard for all modules
"""
from fastapi import APIRouter, HTTPException, Request
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/approvals-hub", tags=["Approvals Hub"])

# Import dependencies
from utils.database import db
from utils.auth import require_auth


@router.get("/summary")
async def get_approvals_summary(request: Request):
    """
    Get summary counts of pending approvals across all modules
    """
    user = await require_auth(request)
    
    summary = {
        "vendors": {
            "pending_review": 0,
            "pending_dd": 0,
            "pending_approval": 0,
            "total_pending": 0
        },
        "business_requests": {
            "draft": 0,
            "pending_evaluation": 0,
            "pending_award": 0,
            "total_pending": 0
        },
        "contracts": {
            "pending_dd": 0,
            "pending_sama": 0,
            "pending_hop": 0,
            "total_pending": 0
        },
        "purchase_orders": {
            "draft": 0,
            "pending_approval": 0,
            "total_pending": 0
        },
        "deliverables": {
            "pending_review": 0,
            "pending_hop": 0,
            "total_pending": 0
        },
        "resources": {
            "pending_approval": 0,
            "expiring_soon": 0,
            "total_pending": 0
        },
        "assets": {
            "pending_maintenance": 0,
            "warranty_expiring": 0,
            "total_pending": 0
        }
    }
    
    try:
        # Vendors
        vendors_pending_review = await db.vendors.count_documents({"status": "pending_review"})
        vendors_pending_dd = await db.vendors.count_documents({"status": "pending_due_diligence"})
        vendors_pending_approval = await db.vendors.count_documents({"status": {"$in": ["reviewed", "pending"]}})
        summary["vendors"] = {
            "pending_review": vendors_pending_review,
            "pending_dd": vendors_pending_dd,
            "pending_approval": vendors_pending_approval,
            "total_pending": vendors_pending_review + vendors_pending_dd + vendors_pending_approval
        }
        
        # Business Requests (Tenders)
        br_draft = await db.tenders.count_documents({"status": "draft"})
        br_published = await db.tenders.count_documents({"status": "published"})
        br_closed = await db.tenders.count_documents({"status": "closed"})
        summary["business_requests"] = {
            "draft": br_draft,
            "pending_evaluation": br_published,
            "pending_award": br_closed,
            "total_pending": br_draft + br_published + br_closed
        }
        
        # Contracts
        contracts_pending_dd = await db.contracts.count_documents({"contract_dd_status": "pending"})
        contracts_pending_sama = await db.contracts.count_documents({"sama_noc_status": {"$in": ["pending", "submitted"]}})
        contracts_pending_hop = await db.contracts.count_documents({"status": "pending_hop_approval"})
        summary["contracts"] = {
            "pending_dd": contracts_pending_dd,
            "pending_sama": contracts_pending_sama,
            "pending_hop": contracts_pending_hop,
            "total_pending": contracts_pending_dd + contracts_pending_sama + contracts_pending_hop
        }
        
        # Purchase Orders
        po_draft = await db.purchase_orders.count_documents({"status": "draft"})
        po_pending = await db.purchase_orders.count_documents({"status": "pending_approval"})
        summary["purchase_orders"] = {
            "draft": po_draft,
            "pending_approval": po_pending,
            "total_pending": po_draft + po_pending
        }
        
        # Deliverables
        del_pending_review = await db.deliverables.count_documents({"status": {"$in": ["submitted", "under_review"]}})
        del_pending_hop = await db.deliverables.count_documents({"status": "pending_hop_approval"})
        summary["deliverables"] = {
            "pending_review": del_pending_review,
            "pending_hop": del_pending_hop,
            "total_pending": del_pending_review + del_pending_hop
        }
        
        # Resources - check for expiring soon (within 30 days)
        thirty_days_later = datetime.now(timezone.utc).replace(day=datetime.now().day + 30)
        resources_expiring = await db.resources.count_documents({
            "status": "active",
            "end_date": {"$lte": thirty_days_later.isoformat()}
        })
        summary["resources"] = {
            "pending_approval": 0,
            "expiring_soon": resources_expiring,
            "total_pending": resources_expiring
        }
        
        # Assets - check for maintenance due or warranty expiring
        assets_maintenance = await db.assets.count_documents({
            "status": "under_maintenance"
        })
        assets_warranty_expiring = await db.assets.count_documents({
            "warranty_status": "expiring_soon"
        })
        summary["assets"] = {
            "pending_maintenance": assets_maintenance,
            "warranty_expiring": assets_warranty_expiring,
            "total_pending": assets_maintenance + assets_warranty_expiring
        }
        
    except Exception as e:
        logger.error(f"Error fetching approvals summary: {e}")
    
    # Calculate grand total
    summary["total_all"] = sum(m.get("total_pending", 0) for m in summary.values() if isinstance(m, dict))
    
    return summary


@router.get("/vendors")
async def get_pending_vendors(request: Request, status: str = "pending"):
    """Get vendors by status (pending or approved)"""
    user = await require_auth(request)
    
    if status == "approved":
        vendors = await db.vendors.find(
            {"status": "approved"},
            {"_id": 0}
        ).sort("updated_at", -1).to_list(50)
    else:
        vendors = await db.vendors.find(
            {"status": {"$in": ["draft", "pending", "pending_review", "pending_due_diligence", "reviewed"]}},
            {"_id": 0}
        ).sort("updated_at", -1).to_list(50)
    
    return {"vendors": vendors, "count": len(vendors)}


@router.get("/business-requests")
async def get_pending_business_requests(request: Request, status: str = "pending"):
    """Get business requests (tenders) by status (pending or approved)"""
    user = await require_auth(request)
    
    if status == "approved":
        tenders = await db.tenders.find(
            {"status": {"$in": ["awarded", "completed"]}},
            {"_id": 0}
        ).sort("updated_at", -1).to_list(50)
    else:
        tenders = await db.tenders.find(
            {"status": {"$in": ["draft", "published", "closed"]}},
            {"_id": 0}
        ).sort("updated_at", -1).to_list(50)
    
    # Enrich with proposal counts
    enriched = []
    for tender in tenders:
        proposal_count = await db.proposals.count_documents({"tender_id": tender["id"]})
        enriched.append({
            **tender,
            "proposal_count": proposal_count
        })
    
    return {"business_requests": enriched, "count": len(enriched)}


@router.get("/contracts")
async def get_pending_contracts(request: Request, status: str = "pending"):
    """Get contracts by status (pending or approved)"""
    user = await require_auth(request)
    
    if status == "approved":
        contracts = await db.contracts.find(
            {"status": {"$in": ["active", "approved"]}},
            {"_id": 0}
        ).sort("updated_at", -1).to_list(50)
    else:
        contracts = await db.contracts.find(
            {"$or": [
                {"status": {"$in": ["draft", "under_review", "pending_due_diligence", "pending_sama_noc", "pending_hop_approval"]}},
                {"contract_dd_status": "pending"},
                {"sama_noc_status": {"$in": ["pending", "submitted"]}}
            ]},
            {"_id": 0}
        ).sort("updated_at", -1).to_list(50)
    
    # Enrich with vendor info
    enriched = []
    for contract in contracts:
        vendor = await db.vendors.find_one(
            {"id": contract.get("vendor_id")},
            {"_id": 0, "name_english": 1, "commercial_name": 1, "risk_score": 1}
        )
        enriched.append({
            **contract,
            "vendor_info": vendor
        })
    
    return {"contracts": enriched, "count": len(enriched)}


@router.get("/purchase-orders")
async def get_pending_purchase_orders(request: Request, status: str = "pending"):
    """Get purchase orders by status (pending or approved)"""
    user = await require_auth(request)
    
    if status == "approved":
        pos = await db.purchase_orders.find(
            {"$and": [
                {"status": {"$in": ["issued", "approved", "completed"]}},
                {"$or": [
                    {"workflow_status": {"$in": ["approved", None]}},
                    {"workflow_status": {"$exists": False}}
                ]},
                {"hop_decision": {"$nin": ["rejected"]}}
            ]},
            {"_id": 0}
        ).sort("updated_at", -1).to_list(50)
    else:
        # Include POs with pending workflow status
        pos = await db.purchase_orders.find(
            {"$or": [
                {"status": {"$in": ["draft", "pending_approval", "pending_hop_approval"]}},
                {"workflow_status": "pending_hop_approval"}
            ]},
            {"_id": 0}
        ).sort("updated_at", -1).to_list(50)
    
    # Enrich with vendor info
    enriched = []
    for po in pos:
        vendor = await db.vendors.find_one(
            {"id": po.get("vendor_id")},
            {"_id": 0, "name_english": 1, "commercial_name": 1}
        )
        enriched.append({
            **po,
            "vendor_info": vendor
        })
    
    return {"purchase_orders": enriched, "count": len(enriched)}


@router.get("/deliverables")
async def get_pending_deliverables(request: Request, status: str = "pending"):
    """Get deliverables by status (pending or approved)"""
    user = await require_auth(request)
    
    if status == "approved":
        deliverables = await db.deliverables.find(
            {"status": {"$in": ["approved", "paid", "exported"]}},
            {"_id": 0}
        ).sort("submitted_at", -1).to_list(50)
    else:
        deliverables = await db.deliverables.find(
            {"status": {"$in": ["submitted", "under_review", "validated", "pending_hop_approval"]}},
            {"_id": 0}
        ).sort("submitted_at", -1).to_list(50)
    
    # Enrich with vendor and contract info
    enriched = []
    for deliverable in deliverables:
        vendor = await db.vendors.find_one(
            {"id": deliverable.get("vendor_id")},
            {"_id": 0, "name_english": 1, "commercial_name": 1}
        )
        contract = await db.contracts.find_one(
            {"id": deliverable.get("contract_id")},
            {"_id": 0, "title": 1, "contract_number": 1}
        )
        po = await db.purchase_orders.find_one(
            {"id": deliverable.get("po_id")},
            {"_id": 0, "po_number": 1}
        ) if deliverable.get("po_id") else None
        enriched.append({
            **deliverable,
            "vendor_info": vendor,
            "contract_info": contract,
            "po_info": po
        })
    
    return {"deliverables": enriched, "count": len(enriched)}


@router.get("/resources")
async def get_pending_resources(request: Request):
    """Get resources needing attention (expiring soon)"""
    user = await require_auth(request)
    
    # Get resources expiring within 30 days
    from datetime import timedelta
    thirty_days = datetime.now(timezone.utc) + timedelta(days=30)
    
    resources = await db.resources.find(
        {
            "status": "active",
            "end_date": {"$lte": thirty_days.isoformat()}
        },
        {"_id": 0}
    ).sort("end_date", 1).to_list(100)
    
    # Enrich with vendor and contract info
    enriched = []
    for resource in resources:
        vendor = await db.vendors.find_one(
            {"id": resource.get("vendor_id")},
            {"_id": 0, "name_english": 1, "commercial_name": 1}
        )
        contract = await db.contracts.find_one(
            {"id": resource.get("contract_id")},
            {"_id": 0, "title": 1, "contract_number": 1}
        )
        enriched.append({
            **resource,
            "vendor_info": vendor,
            "contract_info": contract
        })
    
    return {"resources": enriched, "count": len(enriched)}


@router.get("/assets")
async def get_pending_assets(request: Request):
    """Get assets needing attention (maintenance due, warranty expiring)"""
    user = await require_auth(request)
    
    from datetime import timedelta
    thirty_days = datetime.now(timezone.utc) + timedelta(days=30)
    
    assets = await db.assets.find(
        {"$or": [
            {"status": "under_maintenance"},
            {"next_maintenance_due": {"$lte": thirty_days.isoformat()}},
            {"warranty_end_date": {"$lte": thirty_days.isoformat()}}
        ]},
        {"_id": 0}
    ).sort("next_maintenance_due", 1).to_list(100)
    
    return {"assets": assets, "count": len(assets)}
