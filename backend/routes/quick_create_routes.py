"""
Quick Create Routes - Simplified DTOs for faster PO and Invoice creation
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from uuid import uuid4

from utils.database import db
from utils.auth import require_create_permission, require_permission
from utils.permissions import Permission
from models import POStatus, InvoiceStatus

router = APIRouter(prefix="/quick", tags=["Quick Create"])


# ============== SIMPLIFIED DTOs ==============

class QuickPOItem(BaseModel):
    """Simplified PO item - just name, quantity, and price"""
    name: str
    quantity: int = 1
    price: float

class QuickPOCreate(BaseModel):
    """Simplified PO creation - minimal required fields"""
    vendor_id: str
    tender_id: Optional[str] = None
    items: List[QuickPOItem]
    delivery_days: int = 30  # Default 30 days
    notes: Optional[str] = None

class QuickInvoiceCreate(BaseModel):
    """Simplified Invoice creation - minimal required fields"""
    vendor_id: str
    contract_id: Optional[str] = None
    po_id: Optional[str] = None
    invoice_number: str
    amount: float
    description: Optional[str] = None


# ============== QUICK PO CREATION ==============

@router.post("/purchase-order")
async def quick_create_po(data: QuickPOCreate, request: Request):
    """
    Quick create a Purchase Order with minimal input.
    Automatically:
    - Generates PO number
    - Calculates totals
    - Sets default delivery time
    - Issues PO if no contract required
    """
    user = await require_create_permission(request, "purchase_orders")
    
    # Validate vendor exists
    vendor = await db.vendors.find_one({"id": data.vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Validate vendor is approved
    if vendor.get("status") != "approved":
        raise HTTPException(status_code=400, detail="Vendor must be approved to create PO")
    
    # Calculate item totals
    items = []
    total_amount = 0
    for item in data.items:
        item_total = item.quantity * item.price
        total_amount += item_total
        items.append({
            "name": item.name,
            "description": "",
            "quantity": item.quantity,
            "price": item.price,
            "total": item_total
        })
    
    # Generate PO number
    year = datetime.now(timezone.utc).strftime('%y')
    count = await db.purchase_orders.count_documents({}) + 1
    po_number = f"PO-{year}-{count:04d}"
    
    # Check if amount > 1,000,000 SAR (requires contract)
    amount_over_million = total_amount > 1000000
    
    # For quick PO, assume no special requirements (no contract needed unless amount > 1M)
    requires_contract = amount_over_million
    
    # Determine status - auto-issue if no contract required
    status = "draft" if requires_contract else "issued"
    
    # Create PO document
    po_doc = {
        "id": str(uuid4()),
        "po_number": po_number,
        "tender_id": data.tender_id,
        "vendor_id": data.vendor_id,
        "items": items,
        "total_amount": total_amount,
        "delivery_time": f"{data.delivery_days} days",
        "status": status,
        "notes": data.notes,
        "requires_contract": requires_contract,
        "amount_over_million": amount_over_million,
        "has_data_access": False,
        "has_onsite_presence": False,
        "has_implementation": False,
        "duration_more_than_year": False,
        "risk_level": vendor.get("risk_category", "low"),
        "created_by": user.id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.purchase_orders.insert_one(po_doc)
    
    return {
        "success": True,
        "message": f"Purchase Order {po_number} created successfully",
        "po_id": po_doc["id"],
        "po_number": po_number,
        "total_amount": total_amount,
        "status": status,
        "requires_contract": requires_contract
    }


# ============== QUICK INVOICE CREATION ==============

@router.post("/invoice")
async def quick_create_invoice(data: QuickInvoiceCreate, request: Request):
    """
    Quick create an Invoice with minimal input.
    Automatically:
    - Generates invoice reference
    - Links to contract/PO if provided
    - Sets initial status as pending
    """
    user = await require_create_permission(request, "invoices")
    
    # Validate vendor exists
    vendor = await db.vendors.find_one({"id": data.vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Check for duplicate invoice number for same vendor
    existing = await db.invoices.find_one({
        "invoice_number": data.invoice_number,
        "vendor_id": data.vendor_id
    })
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Invoice {data.invoice_number} already exists for this vendor"
        )
    
    # Validate contract if provided
    contract = None
    if data.contract_id:
        contract = await db.contracts.find_one({"id": data.contract_id})
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
    
    # Validate PO if provided
    po = None
    if data.po_id:
        po = await db.purchase_orders.find_one({"id": data.po_id})
        if not po:
            raise HTTPException(status_code=404, detail="Purchase Order not found")
    
    # Generate invoice reference
    year = datetime.now(timezone.utc).strftime('%y')
    month = datetime.now(timezone.utc).strftime('%m')
    count = await db.invoices.count_documents({}) + 1
    invoice_ref = f"INV-{year}{month}-{count:04d}"
    
    # Create invoice document
    invoice_doc = {
        "id": str(uuid4()),
        "invoice_number": data.invoice_number,
        "invoice_reference": invoice_ref,
        "vendor_id": data.vendor_id,
        "contract_id": data.contract_id,
        "po_id": data.po_id,
        "amount": data.amount,
        "description": data.description or f"Invoice from {vendor.get('name_english', 'Vendor')}",
        "status": "pending",
        "currency": "SAR",
        "matching_result": None,
        "verified_by": None,
        "verified_at": None,
        "approved_by": None,
        "approved_at": None,
        "created_by": user.id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.invoices.insert_one(invoice_doc)
    
    return {
        "success": True,
        "message": f"Invoice {data.invoice_number} created successfully",
        "invoice_id": invoice_doc["id"],
        "invoice_reference": invoice_ref,
        "invoice_number": data.invoice_number,
        "amount": data.amount,
        "status": "pending"
    }


# ============== BULK ITEM ADDITION TO PO ==============

class BulkPOItems(BaseModel):
    """Add multiple items to existing PO at once"""
    items: List[QuickPOItem]

@router.post("/purchase-order/{po_id}/add-items")
async def bulk_add_po_items(po_id: str, data: BulkPOItems, request: Request):
    """Add multiple items to an existing PO in one call"""
    from utils.auth import require_edit_permission
    user = await require_edit_permission(request, "purchase_orders")
    
    po = await db.purchase_orders.find_one({"id": po_id})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    
    if po.get("status") not in ["draft", "pending"]:
        raise HTTPException(status_code=400, detail="Can only add items to draft or pending POs")
    
    existing_items = po.get("items", [])
    
    # Add new items
    for item in data.items:
        item_total = item.quantity * item.price
        existing_items.append({
            "name": item.name,
            "description": "",
            "quantity": item.quantity,
            "price": item.price,
            "total": item_total
        })
    
    # Recalculate total
    new_total = sum(i.get("total", 0) for i in existing_items)
    
    # Check if contract now required
    requires_contract = new_total > 1000000 or po.get("requires_contract", False)
    
    await db.purchase_orders.update_one(
        {"id": po_id},
        {"$set": {
            "items": existing_items,
            "total_amount": new_total,
            "amount_over_million": new_total > 1000000,
            "requires_contract": requires_contract,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"Added {len(data.items)} items to PO",
        "total_items": len(existing_items),
        "new_total_amount": new_total,
        "requires_contract": requires_contract
    }


# ============== GET SUMMARY STATS ==============

@router.get("/stats")
async def get_quick_stats(request: Request):
    """Get quick summary stats for POs and Invoices"""
    await require_permission(request, "purchase_orders", Permission.VIEWER)
    
    # PO stats
    total_pos = await db.purchase_orders.count_documents({})
    issued_pos = await db.purchase_orders.count_documents({"status": "issued"})
    draft_pos = await db.purchase_orders.count_documents({"status": "draft"})
    
    # Invoice stats
    total_invoices = await db.invoices.count_documents({})
    pending_invoices = await db.invoices.count_documents({"status": "pending"})
    approved_invoices = await db.invoices.count_documents({"status": "approved"})
    
    # Calculate total amounts
    po_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}]
    po_total = await db.purchase_orders.aggregate(po_pipeline).to_list(1)
    
    inv_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    inv_total = await db.invoices.aggregate(inv_pipeline).to_list(1)
    
    return {
        "purchase_orders": {
            "total": total_pos,
            "issued": issued_pos,
            "draft": draft_pos,
            "total_amount": po_total[0]["total"] if po_total else 0
        },
        "invoices": {
            "total": total_invoices,
            "pending": pending_invoices,
            "approved": approved_invoices,
            "total_amount": inv_total[0]["total"] if inv_total else 0
        }
    }
