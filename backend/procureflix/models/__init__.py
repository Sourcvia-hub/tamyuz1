"""Domain models for ProcureFlix.

These Pydantic models define the core business entities for ProcureFlix
and are intentionally storage-agnostic.
"""

from .vendor import Vendor, VendorCreateRequest, VendorStatus, RiskCategory, VendorType
from .tender import (
    Tender,
    Proposal,
    TenderStatus,
    ProposalStatus,
    EvaluationMethod,
)
from .contract import Contract, ContractType, ContractStatus, CriticalityLevel
from .purchase_order import PurchaseOrder, PurchaseOrderStatus
from .invoice import Invoice, InvoiceStatus
from .resource import Resource, ResourceStatus
from .service_request import (
    ServiceRequest,
    ServiceRequestStatus,
    ServiceRequestPriority,
)

__all__ = [
    "Vendor",
    "VendorStatus",
    "RiskCategory",
    "VendorType",
    "Tender",
    "Proposal",
    "TenderStatus",
    "ProposalStatus",
    "EvaluationMethod",
    "Contract",
    "ContractType",
    "ContractStatus",
    "CriticalityLevel",
    "PurchaseOrder",
    "PurchaseOrderStatus",
    "Invoice",
    "InvoiceStatus",
    "Resource",
    "ResourceStatus",
    "ServiceRequest",
    "ServiceRequestStatus",
    "ServiceRequestPriority",
]
