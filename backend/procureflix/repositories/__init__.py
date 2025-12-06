"""Repository abstractions and implementations for ProcureFlix.

Repositories encapsulate data access so we can start with in-memory
+ JSON seed data and later swap in SharePoint-backed implementations
without touching the business logic.
"""

from .base import IRepository
from .vendor_repository import InMemoryVendorRepository
from .tender_repository import InMemoryTenderRepository, InMemoryProposalRepository
from .contract_repository import InMemoryContractRepository

__all__ = [
    "IRepository",
    "InMemoryVendorRepository",
    "InMemoryTenderRepository",
    "InMemoryProposalRepository",
    "InMemoryContractRepository",
]
