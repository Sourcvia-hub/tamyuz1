"""Main ProcureFlix API router.

This router is intended to be included from the legacy `server.py` via:

    from procureflix import router as procureflix_router
    api_router.include_router(procureflix_router, prefix="/procureflix")

Given that `api_router` already has the `/api` prefix, all ProcureFlix
endpoints will live under `/api/procureflix/...` as requested.
"""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List

from fastapi import APIRouter, HTTPException

from ..config import get_settings
from ..models import (
    Vendor,
    VendorCreateRequest,
    VendorStatus,
    Tender,
    TenderCreateRequest,
    Proposal,
    Contract,
    ContractCreateRequest,
    ContractStatus,
    PurchaseOrder,
    PurchaseOrderStatus,
    Invoice,
    InvoiceStatus,
    Resource,
    ResourceStatus,
    ServiceRequest,
    ServiceRequestStatus,
)
from ..repositories import (
    InMemoryResourceRepository,
    InMemoryServiceRequestRepository,
)
from ..repositories.factory import (
    get_vendor_repository,
    get_tender_repository,
    get_proposal_repository,
    get_contract_repository,
    get_purchase_order_repository,
    get_invoice_repository,
)
from ..services import (
    VendorService,
    TenderService,
    ContractService,
    PurchaseOrderService,
    InvoiceService,
    ResourceService,
    ServiceRequestService,
)


router = APIRouter()

# Initialize repositories using factory functions
# These will return either in-memory or SharePoint-backed implementations
# based on the PROCUREFLIX_DATA_BACKEND environment variable

_vendor_repo = get_vendor_repository()
_tender_repo = get_tender_repository()
_proposal_repo = get_proposal_repository()
_contract_repo = get_contract_repository()
_po_repo = get_purchase_order_repository()
_invoice_repo = get_invoice_repository()

# Resources and Service Requests still use in-memory for now
_seed_dir = Path(__file__).resolve().parent.parent / "seed"
_resource_seed_path = _seed_dir / "resources.json"
_service_request_seed_path = _seed_dir / "service_requests.json"
_resource_repo = InMemoryResourceRepository(seed_path=_resource_seed_path)
_sr_repo = InMemoryServiceRequestRepository(seed_path=_service_request_seed_path)

# Initialize services with repositories
_vendor_service = VendorService(repository=_vendor_repo)
_tender_service = TenderService(tender_repo=_tender_repo, proposal_repo=_proposal_repo)
_contract_service = ContractService(repository=_contract_repo)
_po_service = PurchaseOrderService(repository=_po_repo)
_invoice_service = InvoiceService(repository=_invoice_repo)
_resource_service = ResourceService(repository=_resource_repo)
_sr_service = ServiceRequestService(repository=_sr_repo)


@router.get("/health")
async def procureflix_health() -> dict:
    """Simple health endpoint for ProcureFlix namespace."""

    settings = get_settings()
    return {
        "app": settings.app_name,
        "status": "ok",
        "data_backend": settings.data_backend,
        "sharepoint_configured": bool(settings.sharepoint_site_url),
    }


@router.get("/vendors", response_model=List[Vendor])
async def list_vendors() -> List[Vendor]:
    """List all vendors from the in-memory repository."""

    return _vendor_service.list_vendors()


# ---------------------------------------------------------------------------
# Tender and proposal endpoints
# ---------------------------------------------------------------------------


@router.get("/tenders", response_model=List[Tender])
async def list_tenders() -> List[Tender]:
    return _tender_service.list_tenders()


@router.get("/tenders/{tender_id}", response_model=Tender)
async def get_tender(tender_id: str) -> Tender:
    tender = _tender_service.get_tender(tender_id)
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    return tender


@router.post("/tenders", response_model=Tender, status_code=201)
async def create_tender(request: TenderCreateRequest) -> Tender:
    """Create a new tender using simplified request model.
    
    This endpoint accepts a minimal TenderCreateRequest with essential fields.
    System fields (tender_number, status, timestamps) are auto-generated.
    
    The full Tender model is returned in the response.
    """
    return _tender_service.create_tender_from_request(request)


@router.put("/tenders/{tender_id}", response_model=Tender)
async def update_tender(tender_id: str, tender: Tender) -> Tender:
    updated = _tender_service.update_tender(tender_id, tender)
    if not updated:
        raise HTTPException(status_code=404, detail="Tender not found")
    return updated


@router.post("/tenders/{tender_id}/publish", response_model=Tender)
async def publish_tender(tender_id: str) -> Tender:
    updated = _tender_service.publish_tender(tender_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Tender not found")
    return updated


@router.post("/tenders/{tender_id}/close", response_model=Tender)
async def close_tender(tender_id: str) -> Tender:
    updated = _tender_service.close_tender(tender_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Tender not found")
    return updated


@router.get("/tenders/{tender_id}/proposals", response_model=List[Proposal])
async def list_proposals(tender_id: str) -> List[Proposal]:
    return _tender_service.list_proposals_for_tender(tender_id)


@router.post("/tenders/{tender_id}/proposals", response_model=Proposal, status_code=201)
async def submit_proposal(tender_id: str, proposal: Proposal) -> Proposal:
    created = _tender_service.submit_proposal(tender_id, proposal)
    if not created:
        raise HTTPException(status_code=404, detail="Tender not found")
    return created


@router.get("/tenders/{tender_id}/evaluation")
async def get_tender_evaluation(tender_id: str) -> Dict[str, object]:
    result = _tender_service.get_evaluation(tender_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Tender not found or no proposals")
    return result


@router.post("/tenders/{tender_id}/evaluate")
async def evaluate_tender_now(tender_id: str) -> Dict[str, object]:
    result = _tender_service.evaluate_now(tender_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Tender not found or no proposals")
    return result


@router.get("/tenders/{tender_id}/ai/summary")
async def tender_ai_summary(tender_id: str) -> Dict[str, object]:
    return await _tender_service.get_tender_summary(tender_id)


@router.post("/tenders/{tender_id}/ai/evaluation-suggestions")
async def tender_ai_evaluation_suggestions(tender_id: str) -> Dict[str, object]:
    return await _tender_service.get_evaluation_suggestions(tender_id)


# ---------------------------------------------------------------------------
# Contract endpoints
# ---------------------------------------------------------------------------


@router.get("/contracts", response_model=List[Contract])
async def list_contracts() -> List[Contract]:
    return _contract_service.list_contracts()


@router.get("/contracts/{contract_id}", response_model=Contract)
async def get_contract(contract_id: str) -> Contract:
    contract = _contract_service.get_contract(contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract


@router.post("/contracts", response_model=Contract, status_code=201)
async def create_contract(request: ContractCreateRequest) -> Contract:
    """Create a new contract using simplified request model.
    
    This endpoint accepts a minimal ContractCreateRequest with essential fields.
    System fields (contract_number, risk scores, DD/NOC flags, timestamps) are auto-generated.
    
    The full Contract model is returned in the response.
    """
    return _contract_service.create_contract_from_request(request)


@router.put("/contracts/{contract_id}", response_model=Contract)
async def update_contract(contract_id: str, contract: Contract) -> Contract:
    updated = _contract_service.update_contract(contract_id, contract)
    if not updated:
        raise HTTPException(status_code=404, detail="Contract not found")
    return updated


@router.post("/contracts/{contract_id}/status/{status}", response_model=Contract)
async def change_contract_status(contract_id: str, status: ContractStatus) -> Contract:
    updated = _contract_service.change_status(contract_id, status)
    if not updated:
        raise HTTPException(status_code=404, detail="Contract not found")
    return updated


@router.get("/contracts/{contract_id}/ai/analysis")
async def contract_ai_analysis(contract_id: str) -> Dict[str, object]:
    return await _contract_service.get_contract_analysis(contract_id)


# ---------------------------------------------------------------------------
# Purchase order endpoints
# ---------------------------------------------------------------------------


@router.get("/purchase-orders", response_model=List[PurchaseOrder])
async def list_purchase_orders() -> List[PurchaseOrder]:
    return _po_service.list_purchase_orders()


@router.get("/purchase-orders/{po_id}", response_model=PurchaseOrder)
async def get_purchase_order(po_id: str) -> PurchaseOrder:
    po = _po_service.get_purchase_order(po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return po


@router.post("/purchase-orders", response_model=PurchaseOrder, status_code=201)
async def create_purchase_order(po: PurchaseOrder) -> PurchaseOrder:
    if not po.vendor_id:
        raise HTTPException(status_code=400, detail="vendor_id is required")
    if not po.description:
        raise HTTPException(status_code=400, detail="description is required")
    return _po_service.create_purchase_order(po)


@router.put("/purchase-orders/{po_id}", response_model=PurchaseOrder)
async def update_purchase_order(po_id: str, po: PurchaseOrder) -> PurchaseOrder:
    updated = _po_service.update_purchase_order(po_id, po)
    if not updated:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return updated


@router.post("/purchase-orders/{po_id}/status/{status}", response_model=PurchaseOrder)
async def change_purchase_order_status(po_id: str, status: PurchaseOrderStatus) -> PurchaseOrder:
    updated = _po_service.change_status(po_id, status)
    if not updated:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return updated


# ---------------------------------------------------------------------------
# Invoice endpoints
# ---------------------------------------------------------------------------


@router.get("/invoices", response_model=List[Invoice])
async def list_invoices() -> List[Invoice]:
    return _invoice_service.list_invoices()


@router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str) -> Invoice:
    inv = _invoice_service.get_invoice(invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return inv


@router.post("/invoices", response_model=Invoice, status_code=201)
async def create_invoice(invoice: Invoice) -> Invoice:
    if not invoice.vendor_id:
        raise HTTPException(status_code=400, detail="vendor_id is required")
    if not invoice.amount:
        raise HTTPException(status_code=400, detail="amount is required")
    try:
        return _invoice_service.create_invoice(invoice)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/invoices/{invoice_id}", response_model=Invoice)
async def update_invoice(invoice_id: str, invoice: Invoice) -> Invoice:
    try:
        updated = _invoice_service.update_invoice(invoice_id, invoice)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not updated:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return updated


@router.post("/invoices/{invoice_id}/status/{status}", response_model=Invoice)
async def change_invoice_status(invoice_id: str, status: InvoiceStatus) -> Invoice:
    updated = _invoice_service.change_status(invoice_id, status)
    if not updated:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return updated


# ---------------------------------------------------------------------------
# Resource endpoints
# ---------------------------------------------------------------------------


@router.get("/resources", response_model=List[Resource])
async def list_resources() -> List[Resource]:
    return _resource_service.list_resources()


@router.get("/resources/{resource_id}", response_model=Resource)
async def get_resource(resource_id: str) -> Resource:
    res = _resource_service.get_resource(resource_id)
    if not res:
        raise HTTPException(status_code=404, detail="Resource not found")
    return res


@router.post("/resources", response_model=Resource, status_code=201)
async def create_resource(resource: Resource) -> Resource:
    if not resource.name:
        raise HTTPException(status_code=400, detail="name is required")
    if not resource.vendor_id:
        raise HTTPException(status_code=400, detail="vendor_id is required")
    return _resource_service.create_resource(resource)


@router.put("/resources/{resource_id}", response_model=Resource)
async def update_resource(resource_id: str, resource: Resource) -> Resource:
    updated = _resource_service.update_resource(resource_id, resource)
    if not updated:
        raise HTTPException(status_code=404, detail="Resource not found")
    return updated


@router.post("/resources/{resource_id}/status/{status}", response_model=Resource)
async def change_resource_status(resource_id: str, status: ResourceStatus) -> Resource:
    updated = _resource_service.change_status(resource_id, status)
    if not updated:
        raise HTTPException(status_code=404, detail="Resource not found")
    return updated


# ---------------------------------------------------------------------------
# Service request (OSR) endpoints
# ---------------------------------------------------------------------------


@router.get("/service-requests", response_model=List[ServiceRequest])
async def list_service_requests() -> List[ServiceRequest]:
    return _sr_service.list_service_requests()


@router.get("/service-requests/{sr_id}", response_model=ServiceRequest)
async def get_service_request(sr_id: str) -> ServiceRequest:
    sr = _sr_service.get_service_request(sr_id)
    if not sr:
        raise HTTPException(status_code=404, detail="Service request not found")
    return sr


@router.post("/service-requests", response_model=ServiceRequest, status_code=201)
async def create_service_request(sr: ServiceRequest) -> ServiceRequest:
    if not sr.title:
        raise HTTPException(status_code=400, detail="title is required")
    if not sr.vendor_id:
        raise HTTPException(status_code=400, detail="vendor_id is required")
    if not sr.requester:
        raise HTTPException(status_code=400, detail="requester is required")
    return _sr_service.create_service_request(sr)


@router.put("/service-requests/{sr_id}", response_model=ServiceRequest)
async def update_service_request(sr_id: str, sr: ServiceRequest) -> ServiceRequest:
    updated = _sr_service.update_service_request(sr_id, sr)
    if not updated:
        raise HTTPException(status_code=404, detail="Service request not found")
    return updated


@router.post("/service-requests/{sr_id}/status/{status}", response_model=ServiceRequest)
async def change_service_request_status(sr_id: str, status: ServiceRequestStatus) -> ServiceRequest:
    updated = _sr_service.change_status(sr_id, status)
    if not updated:
        raise HTTPException(status_code=404, detail="Service request not found")
    return updated


@router.get("/vendors/{vendor_id}", response_model=Vendor)
async def get_vendor(vendor_id: str) -> Vendor:
    vendor = _vendor_service.get_vendor(vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@router.post("/vendors", response_model=Vendor, status_code=201)
async def create_vendor(request: VendorCreateRequest) -> Vendor:
    """Create a new vendor using simplified request model.
    
    This endpoint accepts a minimal VendorCreateRequest with essential fields.
    System fields (vendor_number, risk_score, timestamps, etc.) are auto-generated.
    
    The full Vendor model is returned in the response.
    """
    return _vendor_service.create_vendor_from_request(request)


@router.put("/vendors/{vendor_id}", response_model=Vendor)
async def update_vendor(vendor_id: str, vendor: Vendor) -> Vendor:
    updated = _vendor_service.update_vendor(vendor_id, vendor)
    if not updated:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return updated


@router.put("/vendors/{vendor_id}/due-diligence", response_model=Vendor)
async def submit_vendor_due_diligence(vendor_id: str, dd_payload: Dict[str, object]) -> Vendor:
    """Submit or update due diligence questionnaire for a vendor."""

    updated = _vendor_service.submit_due_diligence(vendor_id, dd_payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return updated


@router.post("/vendors/{vendor_id}/status/{status}", response_model=Vendor)
async def change_vendor_status(vendor_id: str, status: VendorStatus) -> Vendor:
    updated = _vendor_service.set_status(vendor_id, status)
    if not updated:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return updated


@router.get("/vendors/{vendor_id}/ai/risk-explanation")
async def vendor_risk_explanation(vendor_id: str) -> Dict[str, object]:
    """Return an AI-backed (or stubbed) explanation of vendor risk."""

    vendor = _vendor_service.get_vendor(vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    return await _vendor_service.get_risk_explanation(vendor)
