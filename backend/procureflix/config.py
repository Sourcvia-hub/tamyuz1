"""Configuration for ProcureFlix backend.

This module defines a dedicated settings object for ProcureFlix so we can
cleanly manage environment variables (including future SharePoint
integration and AI settings) without interfering with legacy Sourcevia
configuration.
"""

from functools import lru_cache
import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class ProcureFlixSettings:
    """ProcureFlix-specific settings.

    These are intentionally minimal for Phase 1 and will be extended as we
    wire more modules and integrate SharePoint.

    We deliberately avoid pydantic's BaseSettings here to keep the
    dependency surface small and compatible with the existing
    environment.
    """

    # Application metadata
    app_name: str = "ProcureFlix"

    # SharePoint integration placeholders (Phase 4 target)
    sharepoint_site_url: Optional[str] = None
    sharepoint_tenant_id: Optional[str] = None
    sharepoint_client_id: Optional[str] = None
    sharepoint_client_secret: Optional[str] = None

    # AI / LLM configuration (for later phases)
    enable_ai: bool = True


@lru_cache(maxsize=1)
def get_settings() -> ProcureFlixSettings:
    """Return cached ProcureFlix settings instance.

    Using lru_cache ensures we only parse environment variables once.
    """

    return ProcureFlixSettings(
        sharepoint_site_url=os.getenv("SHAREPOINT_SITE_URL"),
        sharepoint_tenant_id=os.getenv("TENANT_ID"),
        sharepoint_client_id=os.getenv("CLIENT_ID"),
        sharepoint_client_secret=os.getenv("CLIENT_SECRET"),
        enable_ai=os.getenv("PROCUREFLIX_ENABLE_AI", "true").lower() == "true",
    )
