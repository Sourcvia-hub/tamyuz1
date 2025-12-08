"""Configuration for ProcureFlix backend.

This module defines a dedicated settings object for ProcureFlix so we can
cleanly manage environment variables (including SharePoint integration
and AI settings) without interfering with legacy Sourcevia configuration.
"""

from functools import lru_cache
import os
from dataclasses import dataclass
from typing import Optional, Literal


@dataclass
class ProcureFlixSettings:
    """ProcureFlix-specific settings.

    These settings control the data backend (memory vs SharePoint),
    SharePoint authentication, and AI feature flags.
    """

    # Application metadata
    app_name: str = "Sourcevia"

    # Data backend selection: 'memory' or 'sharepoint'
    data_backend: Literal["memory", "sharepoint"] = "memory"

    # SharePoint integration settings
    sharepoint_site_url: Optional[str] = None
    sharepoint_tenant_id: Optional[str] = None
    sharepoint_client_id: Optional[str] = None
    sharepoint_client_secret: Optional[str] = None

    # AI / LLM configuration
    enable_ai: bool = True
    ai_provider: str = "openai"
    ai_model: str = "gpt-4o"
    emergent_llm_key: Optional[str] = None


@lru_cache(maxsize=1)
def get_settings() -> ProcureFlixSettings:
    """Return cached ProcureFlix settings instance.

    Using lru_cache ensures we only parse environment variables once.
    """

    # Support both EMERGENT_LLM_KEY (for emergentintegrations) and OPENAI_API_KEY (for standard OpenAI SDK)
    api_key = os.getenv("EMERGENT_LLM_KEY") or os.getenv("OPENAI_API_KEY")
    
    return ProcureFlixSettings(
        data_backend=os.getenv("PROCUREFLIX_DATA_BACKEND", "memory").lower(),  # type: ignore
        sharepoint_site_url=os.getenv("SHAREPOINT_SITE_URL"),
        sharepoint_tenant_id=os.getenv("SHAREPOINT_TENANT_ID"),
        sharepoint_client_id=os.getenv("SHAREPOINT_CLIENT_ID"),
        sharepoint_client_secret=os.getenv("SHAREPOINT_CLIENT_SECRET"),
        enable_ai=os.getenv("PROCUREFLIX_AI_ENABLED", "true").lower() == "true",
        ai_provider=os.getenv("PROCUREFLIX_AI_PROVIDER", "openai"),
        ai_model=os.getenv("PROCUREFLIX_AI_MODEL", "gpt-4o"),
        emergent_llm_key=api_key,
    )
