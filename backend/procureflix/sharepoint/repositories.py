"""SharePoint-backed repository implementations for ProcureFlix.

This module provides SharePoint repository implementations that match the
IRepository interface, allowing seamless switching between in-memory and
SharePoint backends.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from ..models import (
    Contract,
    Invoice,
    Proposal,
    PurchaseOrder,
    Tender,
    Vendor,
)
from ..repositories.base import IRepository
from .client import SharePointClient, SharePointError

logger = logging.getLogger(__name__)


# =============================================================================
# Mapping Helpers
# =============================================================================


def map_vendor_to_sharepoint(vendor: Vendor) -> Dict[str, Any]:
    """Map Vendor model to SharePoint list item fields."""
    return {
        "Title": vendor.company_name,
        "ExternalId": vendor.id,
        "VendorNumber": vendor.vendor_number or "",
        "CompanyName": vendor.company_name,
        "RegistrationNumber": vendor.registration_number or "",
        "TaxNumber": vendor.tax_number or "",
        "Email": vendor.email or "",
        "Phone": vendor.phone or "",
        "Address": vendor.address or "",
        "City": vendor.city or "",
        "State": vendor.state or "",
        "Country": vendor.country or "",
        "PostalCode": vendor.postal_code or "",
        "VendorStatus": vendor.status,
        "RiskCategory": vendor.risk_category,
        "RiskScore": vendor.risk_score,
        "DueDiligenceRequired": vendor.dd_required,
        "DueDiligenceComplete": vendor.dd_complete,
    }


def map_sharepoint_to_vendor(item: Dict[str, Any]) -> Vendor:
    """Map SharePoint list item to Vendor model."""
    return Vendor(
        id=item.get("ExternalId", f"sp-{item['Id']}"),
        vendor_number=item.get("VendorNumber"),
        company_name=item.get("CompanyName", item.get("Title", "")),
        registration_number=item.get("RegistrationNumber"),
        tax_number=item.get("TaxNumber"),
        email=item.get("Email"),
        phone=item.get("Phone"),
        address=item.get("Address"),
        city=item.get("City"),
        state=item.get("State"),
        country=item.get("Country"),
        postal_code=item.get("PostalCode"),
        status=item.get("VendorStatus", "active"),
        risk_category=item.get("RiskCategory", "low"),
        risk_score=item.get("RiskScore", 0),
        dd_required=item.get("DueDiligenceRequired", False),
        dd_complete=item.get("DueDiligenceComplete", False),
        created_at=datetime.now(timezone.utc),  # Fallback
        updated_at=datetime.now(timezone.utc),
    )


def map_tender_to_sharepoint(tender: Tender) -> Dict[str, Any]:
    """Map Tender model to SharePoint list item fields."""
    return {
        "Title": tender.title,
        "ExternalId": tender.id,
        "TenderNumber": tender.tender_number or "",
        "Description": tender.description or "",
        "TenderType": tender.tender_type,
        "Budget": tender.budget,
        "Currency": tender.currency,
        "DeadlineDate": tender.deadline.isoformat() if tender.deadline else "",
        "TenderStatus": tender.status,
        "TechnicalWeight": tender.technical_weight,
        "FinancialWeight": tender.financial_weight,
    }


def map_sharepoint_to_tender(item: Dict[str, Any]) -> Tender:
    """Map SharePoint list item to Tender model."""
    deadline_str = item.get("DeadlineDate")
    deadline = datetime.fromisoformat(deadline_str) if deadline_str else None

    return Tender(
        id=item.get("ExternalId", f"sp-{item['Id']}"),
        tender_number=item.get("TenderNumber"),
        title=item.get("Title", ""),
        description=item.get("Description"),
        tender_type=item.get("TenderType", "open"),
        budget=item.get("Budget", 0.0),
        currency=item.get("Currency", "USD"),
        deadline=deadline,
        status=item.get("TenderStatus", "draft"),
        technical_weight=item.get("TechnicalWeight", 0.5),
        financial_weight=item.get("FinancialWeight", 0.5),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def map_proposal_to_sharepoint(proposal: Proposal) -> Dict[str, Any]:
    """Map Proposal model to SharePoint list item fields."""
    return {
        "Title": f"Proposal for {proposal.tender_id}",
        "ExternalId": proposal.id,
        "TenderId": proposal.tender_id,
        "VendorId": proposal.vendor_id,
        "ProposalAmount": proposal.proposed_amount,
        "Currency": proposal.currency,
        "TechnicalScore": proposal.technical_score,
        "FinancialScore": proposal.financial_score,
        "TotalScore": proposal.total_score,
        "ProposalStatus": proposal.status,
    }


def map_sharepoint_to_proposal(item: Dict[str, Any]) -> Proposal:
    """Map SharePoint list item to Proposal model."""
    return Proposal(
        id=item.get("ExternalId", f"sp-{item['Id']}"),
        tender_id=item.get("TenderId", ""),
        vendor_id=item.get("VendorId", ""),
        proposed_amount=item.get("ProposalAmount", 0.0),
        currency=item.get("Currency", "USD"),
        technical_score=item.get("TechnicalScore", 0.0),
        financial_score=item.get("FinancialScore", 0.0),
        total_score=item.get("TotalScore", 0.0),
        status=item.get("ProposalStatus", "pending"),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def map_contract_to_sharepoint(contract: Contract) -> Dict[str, Any]:
    """Map Contract model to SharePoint list item fields."""
    return {
        "Title": contract.title,
        "ExternalId": contract.id,
        "ContractNumber": contract.contract_number or "",
        "VendorId": contract.vendor_id,
        "TenderId": contract.tender_id or "",
        "Description": contract.description or "",
        "ContractType": contract.contract_type,
        "ContractValue": contract.contract_value,
        "Currency": contract.currency,
        "StartDate": contract.start_date.isoformat() if contract.start_date else "",
        "EndDate": contract.end_date.isoformat() if contract.end_date else "",
        "ContractStatus": contract.status,
        "RiskCategory": contract.risk_category,
        "RiskScore": contract.risk_score,
    }


def map_sharepoint_to_contract(item: Dict[str, Any]) -> Contract:
    """Map SharePoint list item to Contract model."""
    start_date_str = item.get("StartDate")
    end_date_str = item.get("EndDate")
    
    start_date = datetime.fromisoformat(start_date_str) if start_date_str else datetime.now(timezone.utc)
    end_date = datetime.fromisoformat(end_date_str) if end_date_str else datetime.now(timezone.utc)

    return Contract(
        id=item.get("ExternalId", f"sp-{item['Id']}"),
        contract_number=item.get("ContractNumber"),
        vendor_id=item.get("VendorId", ""),
        tender_id=item.get("TenderId"),
        title=item.get("Title", ""),
        description=item.get("Description"),
        contract_type=item.get("ContractType", "standard"),
        contract_value=item.get("ContractValue", 0.0),
        currency=item.get("Currency", "USD"),
        start_date=start_date,
        end_date=end_date,
        status=item.get("ContractStatus", "draft"),
        risk_category=item.get("RiskCategory", "low"),
        risk_score=item.get("RiskScore", 0),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def map_purchase_order_to_sharepoint(po: PurchaseOrder) -> Dict[str, Any]:
    """Map PurchaseOrder model to SharePoint list item fields."""
    return {
        "Title": po.po_number,
        "ExternalId": po.id,
        "PONumber": po.po_number,
        "VendorId": po.vendor_id,
        "ContractId": po.contract_id or "",
        "TenderId": po.tender_id or "",
        "Description": po.description or "",
        "Amount": po.amount,
        "Currency": po.currency,
        "RequestedBy": po.requested_by,
        "DeliveryLocation": po.delivery_location or "",
        "POStatus": po.status,
    }


def map_sharepoint_to_purchase_order(item: Dict[str, Any]) -> PurchaseOrder:
    """Map SharePoint list item to PurchaseOrder model."""
    return PurchaseOrder(
        id=item.get("ExternalId", f"sp-{item['Id']}"),
        po_number=item.get("PONumber", ""),
        vendor_id=item.get("VendorId", ""),
        contract_id=item.get("ContractId"),
        tender_id=item.get("TenderId"),
        description=item.get("Description"),
        amount=item.get("Amount", 0.0),
        currency=item.get("Currency", "USD"),
        requested_by=item.get("RequestedBy", ""),
        delivery_location=item.get("DeliveryLocation"),
        status=item.get("POStatus", "draft"),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def map_invoice_to_sharepoint(invoice: Invoice) -> Dict[str, Any]:
    """Map Invoice model to SharePoint list item fields."""
    return {
        "Title": invoice.invoice_number,
        "ExternalId": invoice.id,
        "InvoiceNumber": invoice.invoice_number,
        "VendorId": invoice.vendor_id,
        "ContractId": invoice.contract_id or "",
        "POId": invoice.po_id or "",
        "Amount": invoice.amount,
        "Currency": invoice.currency,
        "InvoiceDate": invoice.invoice_date.isoformat() if invoice.invoice_date else "",
        "DueDate": invoice.due_date.isoformat() if invoice.due_date else "",
        "InvoiceStatus": invoice.status,
    }


def map_sharepoint_to_invoice(item: Dict[str, Any]) -> Invoice:
    """Map SharePoint list item to Invoice model."""
    invoice_date_str = item.get("InvoiceDate")
    due_date_str = item.get("DueDate")
    
    invoice_date = datetime.fromisoformat(invoice_date_str) if invoice_date_str else datetime.now(timezone.utc)
    due_date = datetime.fromisoformat(due_date_str) if due_date_str else datetime.now(timezone.utc)

    return Invoice(
        id=item.get("ExternalId", f"sp-{item['Id']}"),
        invoice_number=item.get("InvoiceNumber", ""),
        vendor_id=item.get("VendorId", ""),
        contract_id=item.get("ContractId"),
        po_id=item.get("POId"),
        amount=item.get("Amount", 0.0),
        currency=item.get("Currency", "USD"),
        invoice_date=invoice_date,
        due_date=due_date,
        status=item.get("InvoiceStatus", "pending"),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


# =============================================================================
# SharePoint Repository Implementations
# =============================================================================


class SharePointVendorRepository(IRepository[Vendor]):
    """SharePoint-backed vendor repository."""

    LIST_NAME = "Vendors"

    def __init__(self, client: SharePointClient) -> None:
        self._client = client

    def list(self) -> List[Vendor]:
        try:
            items = self._client.get_list_items(self.LIST_NAME)
            return [map_sharepoint_to_vendor(item) for item in items]
        except SharePointError as e:
            logger.error(f"Failed to list vendors from SharePoint: {e}")
            raise

    def get(self, item_id: str) -> Optional[Vendor]:
        try:
            # Search by ExternalId field
            items = self._client.get_list_items(
                self.LIST_NAME, filter_query=f"ExternalId eq '{item_id}'"
            )
            if items:
                return map_sharepoint_to_vendor(items[0])
            return None
        except SharePointError as e:
            logger.error(f"Failed to get vendor {item_id} from SharePoint: {e}")
            return None

    def add(self, item: Vendor) -> Vendor:
        try:
            data = map_vendor_to_sharepoint(item)
            created = self._client.create_list_item(self.LIST_NAME, data)
            return map_sharepoint_to_vendor(created)
        except SharePointError as e:
            logger.error(f"Failed to add vendor to SharePoint: {e}")
            raise

    def update(self, item_id: str, item: Vendor) -> Optional[Vendor]:
        try:
            # First find the SharePoint item ID
            items = self._client.get_list_items(
                self.LIST_NAME, filter_query=f"ExternalId eq '{item_id}'"
            )
            if not items:
                return None

            sp_item_id = items[0]["Id"]
            data = map_vendor_to_sharepoint(item)
            updated = self._client.update_list_item(self.LIST_NAME, sp_item_id, data)
            return map_sharepoint_to_vendor(updated)
        except SharePointError as e:
            logger.error(f"Failed to update vendor {item_id} in SharePoint: {e}")
            return None

    def delete(self, item_id: str) -> bool:
        try:
            # First find the SharePoint item ID
            items = self._client.get_list_items(
                self.LIST_NAME, filter_query=f"ExternalId eq '{item_id}'"
            )
            if not items:
                return False

            sp_item_id = items[0]["Id"]
            return self._client.delete_list_item(self.LIST_NAME, sp_item_id)
        except SharePointError as e:
            logger.error(f"Failed to delete vendor {item_id} from SharePoint: {e}")
            return False

    def bulk_seed(self, items) -> None:
        """Bulk seed not implemented for SharePoint (use migration scripts)."""
        logger.warning("bulk_seed is not supported for SharePoint repositories")


class SharePointTenderRepository(IRepository[Tender]):
    """SharePoint-backed tender repository."""

    LIST_NAME = "Tenders"

    def __init__(self, client: SharePointClient) -> None:
        self._client = client

    def list(self) -> List[Tender]:
        try:
            items = self._client.get_list_items(self.LIST_NAME)
            return [map_sharepoint_to_tender(item) for item in items]
        except SharePointError as e:
            logger.error(f"Failed to list tenders from SharePoint: {e}")
            raise

    def get(self, item_id: str) -> Optional[Tender]:
        try:
            items = self._client.get_list_items(
                self.LIST_NAME, filter_query=f"ExternalId eq '{item_id}'"
            )
            if items:
                return map_sharepoint_to_tender(items[0])
            return None
        except SharePointError as e:
            logger.error(f"Failed to get tender {item_id} from SharePoint: {e}")
            return None

    def add(self, item: Tender) -> Tender:
        try:
            data = map_tender_to_sharepoint(item)
            created = self._client.create_list_item(self.LIST_NAME, data)
            return map_sharepoint_to_tender(created)
        except SharePointError as e:
            logger.error(f"Failed to add tender to SharePoint: {e}")
            raise

    def update(self, item_id: str, item: Tender) -> Optional[Tender]:
        try:
            items = self._client.get_list_items(
                self.LIST_NAME, filter_query=f"ExternalId eq '{item_id}'"
            )
            if not items:
                return None

            sp_item_id = items[0]["Id"]
            data = map_tender_to_sharepoint(item)
            updated = self._client.update_list_item(self.LIST_NAME, sp_item_id, data)
            return map_sharepoint_to_tender(updated)
        except SharePointError as e:
            logger.error(f"Failed to update tender {item_id} in SharePoint: {e}")
            return None

    def delete(self, item_id: str) -> bool:
        try:
            items = self._client.get_list_items(
                self.LIST_NAME, filter_query=f"ExternalId eq '{item_id}'"
            )
            if not items:
                return False

            sp_item_id = items[0]["Id"]
            return self._client.delete_list_item(self.LIST_NAME, sp_item_id)
        except SharePointError as e:
            logger.error(f"Failed to delete tender {item_id} from SharePoint: {e}")
            return False

    def bulk_seed(self, items) -> None:
        logger.warning("bulk_seed is not supported for SharePoint repositories")


class SharePointProposalRepository(IRepository[Proposal]):
    """SharePoint-backed proposal repository."""

    LIST_NAME = "TenderProposals"

    def __init__(self, client: SharePointClient) -> None:
        self._client = client

    def list(self) -> List[Proposal]:
        try:
            items = self._client.get_list_items(self.LIST_NAME)
            return [map_sharepoint_to_proposal(item) for item in items]
        except SharePointError as e:
            logger.error(f"Failed to list proposals from SharePoint: {e}")
            raise

    def get(self, item_id: str) -> Optional[Proposal]:
        try:
            items = self._client.get_list_items(
                self.LIST_NAME, filter_query=f"ExternalId eq '{item_id}'"
            )
            if items:
                return map_sharepoint_to_proposal(items[0])
            return None
        except SharePointError as e:
            logger.error(f"Failed to get proposal {item_id} from SharePoint: {e}")
            return None

    def add(self, item: Proposal) -> Proposal:
        try:
            data = map_proposal_to_sharepoint(item)
            created = self._client.create_list_item(self.LIST_NAME, data)
            return map_sharepoint_to_proposal(created)
        except SharePointError as e:
            logger.error(f"Failed to add proposal to SharePoint: {e}")
            raise

    def update(self, item_id: str, item: Proposal) -> Optional[Proposal]:
        try:
            items = self._client.get_list_items(
                self.LIST_NAME, filter_query=f"ExternalId eq '{item_id}'"
            )
            if not items:
                return None

            sp_item_id = items[0]["Id"]
            data = map_proposal_to_sharepoint(item)
            updated = self._client.update_list_item(self.LIST_NAME, sp_item_id, data)
            return map_sharepoint_to_proposal(updated)
        except SharePointError as e:
            logger.error(f"Failed to update proposal {item_id} in SharePoint: {e}")
            return None

    def delete(self, item_id: str) -> bool:
        try:
            items = self._client.get_list_items(
                self.LIST_NAME, filter_query=f"ExternalId eq '{item_id}'"
            )
            if not items:
                return False

            sp_item_id = items[0]["Id"]
            return self._client.delete_list_item(self.LIST_NAME, sp_item_id)
        except SharePointError as e:
            logger.error(f"Failed to delete proposal {item_id} from SharePoint: {e}")
            return False

    def bulk_seed(self, items) -> None:
        logger.warning("bulk_seed is not supported for SharePoint repositories")


class SharePointContractRepository(IRepository[Contract]):
    """SharePoint-backed contract repository."""

    LIST_NAME = "Contracts"

    def __init__(self, client: SharePointClient) -> None:
        self._client = client

    def list(self) -> List[Contract]:
        try:
            items = self._client.get_list_items(self.LIST_NAME)
            return [map_sharepoint_to_contract(item) for item in items]
        except SharePointError as e:
            logger.error(f"Failed to list contracts from SharePoint: {e}")
            raise

    def get(self, item_id: str) -> Optional[Contract]:
        try:
            items = self._client.get_list_items(
                self.LIST_NAME, filter_query=f"ExternalId eq '{item_id}'"
            )
            if items:
                return map_sharepoint_to_contract(items[0])
            return None
        except SharePointError as e:
            logger.error(f"Failed to get contract {item_id} from SharePoint: {e}")
            return None

    def add(self, item: Contract) -> Contract:
        try:
            data = map_contract_to_sharepoint(item)
            created = self._client.create_list_item(self.LIST_NAME, data)
            return map_sharepoint_to_contract(created)
        except SharePointError as e:
            logger.error(f"Failed to add contract to SharePoint: {e}")
            raise

    def update(self, item_id: str, item: Contract) -> Optional[Contract]:
        try:
            items = self._client.get_list_items(
                self.LIST_NAME, filter_query=f"ExternalId eq '{item_id}'"
            )
            if not items:
                return None

            sp_item_id = items[0]["Id"]
            data = map_contract_to_sharepoint(item)
            updated = self._client.update_list_item(self.LIST_NAME, sp_item_id, data)
            return map_sharepoint_to_contract(updated)
        except SharePointError as e:
            logger.error(f"Failed to update contract {item_id} in SharePoint: {e}")
            return None

    def delete(self, item_id: str) -> bool:
        try:
            items = self._client.get_list_items(
                self.LIST_NAME, filter_query=f"ExternalId eq '{item_id}'"
            )
            if not items:
                return False

            sp_item_id = items[0]["Id"]
            return self._client.delete_list_item(self.LIST_NAME, sp_item_id)
        except SharePointError as e:
            logger.error(f"Failed to delete contract {item_id} from SharePoint: {e}")
            return False

    def bulk_seed(self, items) -> None:
        logger.warning("bulk_seed is not supported for SharePoint repositories")


class SharePointPurchaseOrderRepository(IRepository[PurchaseOrder]):
    """SharePoint-backed purchase order repository."""

    LIST_NAME = "PurchaseOrders"

    def __init__(self, client: SharePointClient) -> None:
        self._client = client

    def list(self) -> List[PurchaseOrder]:
        try:
            items = self._client.get_list_items(self.LIST_NAME)
            return [map_sharepoint_to_purchase_order(item) for item in items]
        except SharePointError as e:
            logger.error(f"Failed to list purchase orders from SharePoint: {e}")
            raise

    def get(self, item_id: str) -> Optional[PurchaseOrder]:
        try:
            items = self._client.get_list_items(
                self.LIST_NAME, filter_query=f"ExternalId eq '{item_id}'"
            )
            if items:
                return map_sharepoint_to_purchase_order(items[0])
            return None
        except SharePointError as e:
            logger.error(f"Failed to get PO {item_id} from SharePoint: {e}")
            return None

    def add(self, item: PurchaseOrder) -> PurchaseOrder:
        try:
            data = map_purchase_order_to_sharepoint(item)
            created = self._client.create_list_item(self.LIST_NAME, data)
            return map_sharepoint_to_purchase_order(created)
        except SharePointError as e:
            logger.error(f"Failed to add PO to SharePoint: {e}")
            raise

    def update(self, item_id: str, item: PurchaseOrder) -> Optional[PurchaseOrder]:
        try:
            items = self._client.get_list_items(
                self.LIST_NAME, filter_query=f"ExternalId eq '{item_id}'"
            )
            if not items:
                return None

            sp_item_id = items[0]["Id"]
            data = map_purchase_order_to_sharepoint(item)
            updated = self._client.update_list_item(self.LIST_NAME, sp_item_id, data)
            return map_sharepoint_to_purchase_order(updated)
        except SharePointError as e:
            logger.error(f"Failed to update PO {item_id} in SharePoint: {e}")
            return None

    def delete(self, item_id: str) -> bool:
        try:
            items = self._client.get_list_items(
                self.LIST_NAME, filter_query=f"ExternalId eq '{item_id}'"
            )
            if not items:
                return False

            sp_item_id = items[0]["Id"]
            return self._client.delete_list_item(self.LIST_NAME, sp_item_id)
        except SharePointError as e:
            logger.error(f"Failed to delete PO {item_id} from SharePoint: {e}")
            return False

    def bulk_seed(self, items) -> None:
        logger.warning("bulk_seed is not supported for SharePoint repositories")


class SharePointInvoiceRepository(IRepository[Invoice]):
    """SharePoint-backed invoice repository."""

    LIST_NAME = "Invoices"

    def __init__(self, client: SharePointClient) -> None:
        self._client = client

    def list(self) -> List[Invoice]:
        try:
            items = self._client.get_list_items(self.LIST_NAME)
            return [map_sharepoint_to_invoice(item) for item in items]
        except SharePointError as e:
            logger.error(f"Failed to list invoices from SharePoint: {e}")
            raise

    def get(self, item_id: str) -> Optional[Invoice]:
        try:
            items = self._client.get_list_items(
                self.LIST_NAME, filter_query=f"ExternalId eq '{item_id}'"
            )
            if items:
                return map_sharepoint_to_invoice(items[0])
            return None
        except SharePointError as e:
            logger.error(f"Failed to get invoice {item_id} from SharePoint: {e}")
            return None

    def add(self, item: Invoice) -> Invoice:
        try:
            data = map_invoice_to_sharepoint(item)
            created = self._client.create_list_item(self.LIST_NAME, data)
            return map_sharepoint_to_invoice(created)
        except SharePointError as e:
            logger.error(f"Failed to add invoice to SharePoint: {e}")
            raise

    def update(self, item_id: str, item: Invoice) -> Optional[Invoice]:
        try:
            items = self._client.get_list_items(
                self.LIST_NAME, filter_query=f"ExternalId eq '{item_id}'"
            )
            if not items:
                return None

            sp_item_id = items[0]["Id"]
            data = map_invoice_to_sharepoint(item)
            updated = self._client.update_list_item(self.LIST_NAME, sp_item_id, data)
            return map_sharepoint_to_invoice(updated)
        except SharePointError as e:
            logger.error(f"Failed to update invoice {item_id} in SharePoint: {e}")
            return None

    def delete(self, item_id: str) -> bool:
        try:
            items = self._client.get_list_items(
                self.LIST_NAME, filter_query=f"ExternalId eq '{item_id}'"
            )
            if not items:
                return False

            sp_item_id = items[0]["Id"]
            return self._client.delete_list_item(self.LIST_NAME, sp_item_id)
        except SharePointError as e:
            logger.error(f"Failed to delete invoice {item_id} from SharePoint: {e}")
            return False

    def bulk_seed(self, items) -> None:
        logger.warning("bulk_seed is not supported for SharePoint repositories")
