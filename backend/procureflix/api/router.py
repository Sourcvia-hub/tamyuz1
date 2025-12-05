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
    VendorStatus,
    Tender,
    Proposal,
)
from ..repositories import (
    InMemoryVendorRepository,
    InMemoryTenderRepository,
    InMemoryProposalRepository,
)
from ..services import VendorService, TenderService


router = APIRouter()

# For the current phase we wire a full vertical slice around vendors to
# validate the architecture. Other modules will follow the same pattern.

_seed_dir = Path(__file__).resolve().parent.parent / "seed"
_vendor_seed_path = _seed_dir / "vendors.json"
_vendor_repo = InMemoryVendorRepository(seed_path=_vendor_seed_path)
_vendor_service = VendorService(repository=_vendor_repo)


@router.get("/health")
async def procureflix_health() -> dict:
    """Simple health endpoint for ProcureFlix namespace."""

    settings = get_settings()
    return {
        "app": settings.app_name,
        "status": "ok",
        "sharepoint_configured": bool(settings.sharepoint_site_url),
    }


@router.get("/vendors", response_model=List[Vendor])
async def list_vendors() -> List[Vendor]:
    """List all vendors from the in-memory repository."""

    return _vendor_service.list_vendors()


@router.get("/vendors/{vendor_id}", response_model=Vendor)
async def get_vendor(vendor_id: str) -> Vendor:
    vendor = _vendor_service.get_vendor(vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@router.post("/vendors", response_model=Vendor, status_code=201)
async def create_vendor(vendor: Vendor) -> Vendor:
    """Create a new vendor.

    Validation of required business fields will be tightened as we
    connect the ProcureFlix frontend; for now we enforce only minimal
    checks.
    """

    if not vendor.name_english:
        raise HTTPException(status_code=400, detail="name_english is required")
    if not vendor.commercial_name:
        raise HTTPException(status_code=400, detail="commercial_name is required")

    return _vendor_service.create_vendor(vendor)


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
