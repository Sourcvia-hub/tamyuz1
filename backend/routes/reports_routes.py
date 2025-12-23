"""
Reports and Analytics Routes - Comprehensive reporting and dashboard data
Includes:
- Standard Reports: Shows only ACTIVE models/items
- Expert Reports: Shows EVERYTHING (all statuses)
"""
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from io import BytesIO
import json

from utils.database import db
from utils.auth import require_permission
from utils.permissions import Permission

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])


# ============== STANDARD REPORT (ACTIVE ONLY) ==============

@router.get("/procurement-overview")
async def get_procurement_overview(request: Request):
    """Get procurement overview - ACTIVE ITEMS ONLY"""
    await require_permission(request, "dashboard", Permission.VIEWER)
    
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    
    # Vendor stats - ACTIVE ONLY
    active_vendors = await db.vendors.count_documents({"status": {"$in": ["active", "approved"]}})
    active_vendors_30d = await db.vendors.count_documents({
        "status": {"$in": ["active", "approved"]},
        "updated_at": {"$gte": thirty_days_ago.isoformat()}
    })
    
    # Contract stats - ACTIVE ONLY
    active_contracts = await db.contracts.count_documents({"status": "active"})
    expiring_soon = await db.contracts.count_documents({
        "status": "active",
        "end_date": {
            "$gte": now.isoformat(),
            "$lte": (now + timedelta(days=30)).isoformat()
        }
    })
    
    # Contract value - ACTIVE ONLY
    contract_value_pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {"_id": None, "total_value": {"$sum": "$value"}}}
    ]
    contract_value = await db.contracts.aggregate(contract_value_pipeline).to_list(1)
    total_contract_value = contract_value[0]["total_value"] if contract_value else 0
    
    # PO stats - ISSUED/ACTIVE ONLY
    active_pos = await db.purchase_orders.count_documents({"status": {"$in": ["issued", "active", "approved"]}})
    
    po_value_pipeline = [
        {"$match": {"status": {"$in": ["issued", "active", "approved"]}}},
        {"$group": {"_id": None, "total_value": {"$sum": "$total_amount"}}}
    ]
    po_value = await db.purchase_orders.aggregate(po_value_pipeline).to_list(1)
    total_po_value = po_value[0]["total_value"] if po_value else 0
    
    # Deliverables stats - APPROVED ONLY
    approved_deliverables = await db.deliverables.count_documents({"status": {"$in": ["approved", "paid"]}})
    
    deliverable_value_pipeline = [
        {"$match": {"status": {"$in": ["approved", "paid"]}}},
        {"$group": {"_id": None, "total_value": {"$sum": "$amount"}}}
    ]
    deliverable_value = await db.deliverables.aggregate(deliverable_value_pipeline).to_list(1)
    total_deliverable_value = deliverable_value[0]["total_value"] if deliverable_value else 0
    
    # Business Request stats - AWARDED ONLY
    awarded_brs = await db.tenders.count_documents({"status": "awarded"})
    
    # Resource stats - ACTIVE ONLY
    active_resources = await db.resources.count_documents({"status": {"$in": ["active", "approved"]}})
    
    # Asset stats - ACTIVE/IN_USE ONLY
    active_assets = await db.assets.count_documents({"status": {"$in": ["available", "in_use"]}})
    
    return {
        "report_type": "standard",
        "filter": "active_only",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_active_spend": total_contract_value + total_po_value,
            "active_contracts": active_contracts,
            "active_vendors": active_vendors
        },
        "vendors": {
            "active": active_vendors,
            "active_30d": active_vendors_30d
        },
        "contracts": {
            "active": active_contracts,
            "expiring_soon": expiring_soon,
            "total_value": total_contract_value
        },
        "purchase_orders": {
            "active": active_pos,
            "total_value": total_po_value
        },
        "deliverables": {
            "approved": approved_deliverables,
            "total_value": total_deliverable_value
        },
        "business_requests": {
            "awarded": awarded_brs
        },
        "resources": {
            "active": active_resources
        },
        "assets": {
            "active": active_assets
        }
    }


# ============== EXPERT REPORT (EVERYTHING) ==============

@router.get("/expert-overview")
async def get_expert_overview(request: Request):
    """Get comprehensive procurement overview - ALL ITEMS (Expert Report)"""
    await require_permission(request, "dashboard", Permission.VIEWER)
    
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    
    # Vendor stats - ALL
    total_vendors = await db.vendors.count_documents({})
    approved_vendors = await db.vendors.count_documents({"status": {"$in": ["active", "approved"]}})
    pending_vendors = await db.vendors.count_documents({"status": "pending"})
    inactive_vendors = await db.vendors.count_documents({"status": "inactive"})
    high_risk_vendors = await db.vendors.count_documents({"risk_score": {"$gte": 70}})
    
    # Contract stats - ALL
    total_contracts = await db.contracts.count_documents({})
    active_contracts = await db.contracts.count_documents({"status": "active"})
    draft_contracts = await db.contracts.count_documents({"status": "draft"})
    pending_contracts = await db.contracts.count_documents({"status": {"$in": ["pending_signature", "pending_approval", "pending_review", "pending_hop_approval"]}})
    expired_contracts = await db.contracts.count_documents({"status": "expired"})
    expiring_soon = await db.contracts.count_documents({
        "status": "active",
        "end_date": {"$gte": now.isoformat(), "$lte": (now + timedelta(days=30)).isoformat()}
    })
    
    # Contract value - ALL
    contract_value_pipeline = [
        {"$group": {"_id": None, "total_value": {"$sum": "$value"}}}
    ]
    contract_value = await db.contracts.aggregate(contract_value_pipeline).to_list(1)
    total_contract_value = contract_value[0]["total_value"] if contract_value else 0
    
    # PO stats - ALL
    total_pos = await db.purchase_orders.count_documents({})
    issued_pos = await db.purchase_orders.count_documents({"status": "issued"})
    draft_pos = await db.purchase_orders.count_documents({"status": "draft"})
    pending_pos = await db.purchase_orders.count_documents({"status": {"$in": ["pending_approval", "pending_review", "pending_hop_approval"]}})
    
    po_value_pipeline = [
        {"$group": {"_id": None, "total_value": {"$sum": "$total_amount"}}}
    ]
    po_value = await db.purchase_orders.aggregate(po_value_pipeline).to_list(1)
    total_po_value = po_value[0]["total_value"] if po_value else 0
    
    # Deliverables stats - ALL
    total_deliverables = await db.deliverables.count_documents({})
    draft_deliverables = await db.deliverables.count_documents({"status": "draft"})
    pending_deliverables = await db.deliverables.count_documents({"status": {"$in": ["submitted", "under_review", "validated", "pending_hop_approval"]}})
    approved_deliverables = await db.deliverables.count_documents({"status": {"$in": ["approved", "paid"]}})
    rejected_deliverables = await db.deliverables.count_documents({"status": "rejected"})
    
    deliverable_value_pipeline = [
        {"$group": {"_id": None, "total_value": {"$sum": "$amount"}}}
    ]
    deliverable_value = await db.deliverables.aggregate(deliverable_value_pipeline).to_list(1)
    total_deliverable_value = deliverable_value[0]["total_value"] if deliverable_value else 0
    
    # Business Request stats - ALL
    total_brs = await db.tenders.count_documents({})
    draft_brs = await db.tenders.count_documents({"status": "draft"})
    published_brs = await db.tenders.count_documents({"status": "published"})
    pending_brs = await db.tenders.count_documents({"status": {"$in": ["pending_evaluation", "pending_review", "pending_approval", "pending_hop_approval"]}})
    awarded_brs = await db.tenders.count_documents({"status": "awarded"})
    rejected_brs = await db.tenders.count_documents({"status": "rejected"})
    
    # Resource stats - ALL
    total_resources = await db.resources.count_documents({})
    active_resources = await db.resources.count_documents({"status": {"$in": ["active", "approved"]}})
    pending_resources = await db.resources.count_documents({"status": {"$in": ["pending", "pending_review", "pending_hop_approval"]}})
    
    # Asset stats - ALL
    total_assets = await db.assets.count_documents({})
    available_assets = await db.assets.count_documents({"status": "available"})
    in_use_assets = await db.assets.count_documents({"status": "in_use"})
    maintenance_assets = await db.assets.count_documents({"status": "maintenance"})
    retired_assets = await db.assets.count_documents({"status": "retired"})
    
    return {
        "report_type": "expert",
        "filter": "all_items",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_spend": total_contract_value + total_po_value,
            "pending_payments": await db.deliverables.count_documents({"status": {"$in": ["submitted", "validated", "pending_hop_approval"]}}),
            "total_contracts": total_contracts,
            "total_vendors": total_vendors,
            "total_pos": total_pos,
            "total_deliverables": total_deliverables,
            "total_brs": total_brs,
            "total_resources": total_resources,
            "total_assets": total_assets
        },
        "vendors": {
            "total": total_vendors,
            "active": approved_vendors,
            "pending": pending_vendors,
            "inactive": inactive_vendors,
            "high_risk": high_risk_vendors,
            "approval_rate": round((approved_vendors / total_vendors * 100), 1) if total_vendors > 0 else 0
        },
        "contracts": {
            "total": total_contracts,
            "active": active_contracts,
            "draft": draft_contracts,
            "pending_approval": pending_contracts,
            "expired": expired_contracts,
            "expiring_soon": expiring_soon,
            "total_value": total_contract_value
        },
        "purchase_orders": {
            "total": total_pos,
            "issued": issued_pos,
            "draft": draft_pos,
            "pending_approval": pending_pos,
            "total_value": total_po_value
        },
        "deliverables": {
            "total": total_deliverables,
            "draft": draft_deliverables,
            "pending": pending_deliverables,
            "approved": approved_deliverables,
            "rejected": rejected_deliverables,
            "total_value": total_deliverable_value
        },
        "business_requests": {
            "total": total_brs,
            "draft": draft_brs,
            "published": published_brs,
            "pending_approval": pending_brs,
            "awarded": awarded_brs,
            "rejected": rejected_brs,
            "conversion_rate": round((awarded_brs / total_brs * 100), 1) if total_brs > 0 else 0
        },
        "resources": {
            "total": total_resources,
            "active": active_resources,
            "pending_approval": pending_resources
        },
        "assets": {
            "total": total_assets,
            "available": available_assets,
            "in_use": in_use_assets,
            "maintenance": maintenance_assets,
            "retired": retired_assets
        }
    }


# ============== SPEND ANALYSIS ==============

@router.get("/spend-analysis")
async def get_spend_analysis(
    request: Request,
    period: str = Query("monthly", description="daily, weekly, monthly, quarterly, yearly")
):
    """Get spend analysis with breakdown by period and category"""
    await require_permission(request, "dashboard", Permission.VIEWER)
    
    now = datetime.now(timezone.utc)
    
    # Determine date range based on period
    if period == "daily":
        start_date = now - timedelta(days=30)
        date_format = "%Y-%m-%d"
    elif period == "weekly":
        start_date = now - timedelta(weeks=12)
        date_format = "%Y-W%W"
    elif period == "monthly":
        start_date = now - timedelta(days=365)
        date_format = "%Y-%m"
    elif period == "quarterly":
        start_date = now - timedelta(days=730)
        date_format = "%Y-Q"
    else:  # yearly
        start_date = now - timedelta(days=1825)
        date_format = "%Y"
    
    # Aggregate PO spend by period
    po_spend_pipeline = [
        {"$match": {"created_at": {"$gte": start_date.isoformat()}}},
        {"$addFields": {
            "date_parsed": {"$dateFromString": {"dateString": "$created_at"}}
        }},
        {"$group": {
            "_id": {"$dateToString": {"format": date_format, "date": "$date_parsed"}},
            "total": {"$sum": "$total_amount"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    po_spend = await db.purchase_orders.aggregate(po_spend_pipeline).to_list(100)
    
    # Aggregate deliverables spend by period (replaced invoices)
    del_spend_pipeline = [
        {"$match": {"created_at": {"$gte": start_date.isoformat()}}},
        {"$addFields": {
            "date_parsed": {"$dateFromString": {"dateString": "$created_at"}}
        }},
        {"$group": {
            "_id": {"$dateToString": {"format": date_format, "date": "$date_parsed"}},
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    del_spend = await db.deliverables.aggregate(del_spend_pipeline).to_list(100)
    
    # Spend by vendor (top 10)
    vendor_spend_pipeline = [
        {"$group": {
            "_id": "$vendor_id",
            "total_spend": {"$sum": "$total_amount"},
            "order_count": {"$sum": 1}
        }},
        {"$sort": {"total_spend": -1}},
        {"$limit": 10}
    ]
    
    vendor_spend = await db.purchase_orders.aggregate(vendor_spend_pipeline).to_list(10)
    
    # Enrich vendor names
    for vs in vendor_spend:
        vendor = await db.vendors.find_one({"id": vs["_id"]}, {"name_english": 1, "commercial_name": 1})
        vs["vendor_name"] = vendor.get("name_english") or vendor.get("commercial_name", "Unknown") if vendor else "Unknown"
    
    return {
        "period": period,
        "po_spend_trend": [{"period": s["_id"], "amount": s["total"], "count": s["count"]} for s in po_spend],
        "deliverable_spend_trend": [{"period": s["_id"], "amount": s["total"], "count": s["count"]} for s in del_spend],
        "top_vendors_by_spend": [
            {"vendor_id": vs["_id"], "vendor_name": vs["vendor_name"], "total_spend": vs["total_spend"], "order_count": vs["order_count"]}
            for vs in vendor_spend
        ]
    }


# ============== VENDOR PERFORMANCE ==============

@router.get("/vendor-performance")
async def get_vendor_performance(request: Request):
    """Get vendor performance metrics"""
    await require_permission(request, "vendors", Permission.VIEWER)
    
    # Vendor risk distribution
    risk_pipeline = [
        {"$group": {
            "_id": "$risk_category",
            "count": {"$sum": 1}
        }}
    ]
    risk_dist = await db.vendors.aggregate(risk_pipeline).to_list(10)
    
    # Vendor status distribution
    status_pipeline = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    status_dist = await db.vendors.aggregate(status_pipeline).to_list(10)
    
    # Vendors with most contracts
    contract_count_pipeline = [
        {"$group": {
            "_id": "$vendor_id",
            "contract_count": {"$sum": 1},
            "total_value": {"$sum": "$value"}
        }},
        {"$sort": {"contract_count": -1}},
        {"$limit": 10}
    ]
    top_vendors = await db.contracts.aggregate(contract_count_pipeline).to_list(10)
    
    # Enrich with vendor names
    for tv in top_vendors:
        vendor = await db.vendors.find_one({"id": tv["_id"]}, {"name_english": 1, "commercial_name": 1})
        tv["vendor_name"] = vendor.get("name_english") or vendor.get("commercial_name", "Unknown") if vendor else "Unknown"
    
    # DD completion rate
    total_dd_required = await db.vendors.count_documents({"dd_required": True})
    dd_completed = await db.vendors.count_documents({"dd_required": True, "dd_completed": True})
    
    return {
        "risk_distribution": {r["_id"] or "unknown": r["count"] for r in risk_dist},
        "status_distribution": {s["_id"] or "unknown": s["count"] for s in status_dist},
        "top_vendors_by_contracts": [
            {
                "vendor_id": tv["_id"],
                "vendor_name": tv["vendor_name"],
                "contract_count": tv["contract_count"],
                "total_value": tv["total_value"]
            }
            for tv in top_vendors
        ],
        "due_diligence": {
            "total_required": total_dd_required,
            "completed": dd_completed,
            "completion_rate": round((dd_completed / total_dd_required * 100), 1) if total_dd_required > 0 else 0
        }
    }


# ============== CONTRACT ANALYTICS ==============

@router.get("/contract-analytics")
async def get_contract_analytics(request: Request):
    """Get contract analytics and insights"""
    await require_permission(request, "contracts", Permission.VIEWER)
    
    now = datetime.now(timezone.utc)
    
    # Contract status distribution
    status_pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}, "total_value": {"$sum": "$value"}}}
    ]
    status_dist = await db.contracts.aggregate(status_pipeline).to_list(10)
    
    # Contracts expiring in next 30/60/90 days
    contracts_expiring_30 = await db.contracts.count_documents({
        "status": "active",
        "end_date": {"$gte": now.isoformat(), "$lte": (now + timedelta(days=30)).isoformat()}
    })
    contracts_expiring_60 = await db.contracts.count_documents({
        "status": "active",
        "end_date": {"$gte": now.isoformat(), "$lte": (now + timedelta(days=60)).isoformat()}
    })
    contracts_expiring_90 = await db.contracts.count_documents({
        "status": "active",
        "end_date": {"$gte": now.isoformat(), "$lte": (now + timedelta(days=90)).isoformat()}
    })
    
    # Average contract value
    avg_pipeline = [
        {"$group": {"_id": None, "avg_value": {"$avg": "$value"}, "max_value": {"$max": "$value"}, "min_value": {"$min": "$value"}}}
    ]
    avg_stats = await db.contracts.aggregate(avg_pipeline).to_list(1)
    
    # Outsourcing classification distribution
    outsourcing_pipeline = [
        {"$match": {"is_outsourcing": True}},
        {"$group": {"_id": "$outsourcing_classification", "count": {"$sum": 1}}}
    ]
    outsourcing_dist = await db.contracts.aggregate(outsourcing_pipeline).to_list(10)
    
    return {
        "status_distribution": [
            {"status": s["_id"], "count": s["count"], "total_value": s["total_value"]}
            for s in status_dist
        ],
        "expiration_alerts": {
            "expiring_30_days": contracts_expiring_30,
            "expiring_60_days": contracts_expiring_60,
            "expiring_90_days": contracts_expiring_90
        },
        "value_stats": {
            "average": avg_stats[0]["avg_value"] if avg_stats else 0,
            "maximum": avg_stats[0]["max_value"] if avg_stats else 0,
            "minimum": avg_stats[0]["min_value"] if avg_stats else 0
        },
        "outsourcing_distribution": {o["_id"] or "not_classified": o["count"] for o in outsourcing_dist}
    }


# ============== APPROVAL METRICS ==============

@router.get("/approval-metrics")
async def get_approval_metrics(request: Request):
    """Get approval workflow metrics across all modules"""
    await require_permission(request, "dashboard", Permission.VIEWER)
    
    # Pending approvals by module
    pending_vendors = await db.vendors.count_documents({"status": "pending"})
    pending_contracts = await db.contracts.count_documents({"status": "pending_approval"})
    pending_deliverables = await db.deliverables.count_documents({"status": {"$in": ["submitted", "validated", "pending_hop_approval"]}})
    pending_brs = await db.tenders.count_documents({"status": {"$in": ["published", "closed"]}})
    
    # Approval workflow status
    workflow_pipeline = [
        {"$group": {"_id": "$current_state", "count": {"$sum": 1}}}
    ]
    vendor_workflow = await db.vendors.aggregate(workflow_pipeline).to_list(10)
    
    return {
        "pending_approvals": {
            "vendors": pending_vendors,
            "contracts": pending_contracts,
            "deliverables": pending_deliverables,
            "business_requests": pending_brs,
            "total": pending_vendors + pending_contracts + pending_deliverables + pending_brs
        },
        "vendor_workflow_states": {w["_id"] or "unknown": w["count"] for w in vendor_workflow}
    }


# ============== EXPORT REPORT ==============

@router.get("/export")
async def export_report(
    request: Request,
    report_type: str = Query(..., description="Type: procurement-overview, spend-analysis, vendor-performance, contract-analytics")
):
    """Export report data as JSON for external analysis"""
    await require_permission(request, "dashboard", Permission.VIEWER)
    
    if report_type == "procurement-overview":
        data = await get_procurement_overview(request)
    elif report_type == "spend-analysis":
        data = await get_spend_analysis(request)
    elif report_type == "vendor-performance":
        data = await get_vendor_performance(request)
    elif report_type == "contract-analytics":
        data = await get_contract_analytics(request)
    else:
        raise HTTPException(status_code=400, detail="Invalid report type")
    
    # Add metadata
    export_data = {
        "report_type": report_type,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "data": data
    }
    
    # Return as downloadable JSON
    json_bytes = json.dumps(export_data, indent=2, default=str).encode('utf-8')
    
    return StreamingResponse(
        BytesIO(json_bytes),
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=report_{report_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        }
    )
