"""AI client abstraction for ProcureFlix.

This module provides AI-powered analysis for vendors, contracts, and tenders
using the Emergent LLM integration. All AI features are read-only and advisory.
"""

from __future__ import annotations

import logging
import json
from typing import Any, Dict, Optional
from uuid import uuid4

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    EMERGENT_AVAILABLE = True
except ImportError:
    EMERGENT_AVAILABLE = False
    # Fallback to OpenAI SDK
    try:
        from openai import OpenAI
        OPENAI_AVAILABLE = True
    except ImportError:
        OPENAI_AVAILABLE = False

from ..config import get_settings

logger = logging.getLogger(__name__)


class ProcureFlixAIClient:
    """High-level AI facade for ProcureFlix.
    
    Provides AI-powered analysis using Emergent LLM integration:
    - Vendor risk analysis and explanations
    - Contract analysis and recommendations
    - Tender evaluation suggestions
    
    All AI features are read-only and do not modify data.
    """

    def __init__(self, enabled: bool = False, api_key: Optional[str] = None, model: str = "gpt-5"):
        self.enabled = enabled
        self.api_key = api_key
        self.model = model

    def _create_chat(self, system_message: str):
        """Create a new LLM chat session."""
        if not self.enabled or not self.api_key:
            return None
        
        try:
            # Try Emergent integration first
            if EMERGENT_AVAILABLE:
                chat = LlmChat(
                    api_key=self.api_key,
                    session_id=f"procureflix-{uuid4()}",
                    system_message=system_message
                )
                chat.with_model("openai", self.model)
                return {'type': 'emergent', 'chat': chat}
            # Fallback to OpenAI SDK
            elif OPENAI_AVAILABLE:
                return {
                    'type': 'openai',
                    'client': OpenAI(api_key=self.api_key),
                    'system_message': system_message,
                    'model': self.model
                }
            else:
                logger.error("No LLM client available (neither emergentintegrations nor openai installed)")
                return None
        except Exception as e:
            logger.error(f"Failed to create AI chat: {e}")
            return None
    
    async def _send_message(self, chat_obj, prompt: str) -> str:
        """Send message to AI and get response (supports both Emergent and OpenAI)."""
        if not chat_obj:
            raise ValueError("No chat object provided")
        
        try:
            if chat_obj['type'] == 'emergent':
                response = await chat_obj['chat'].send_message(UserMessage(text=prompt))
                return response
            elif chat_obj['type'] == 'openai':
                response = chat_obj['client'].chat.completions.create(
                    model=chat_obj['model'],
                    messages=[
                        {"role": "system", "content": chat_obj['system_message']},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=1000
                )
                return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Failed to send message to AI: {e}")
            raise

    # ------------------------------------------------------------------
    # Vendor Risk Analysis
    # ------------------------------------------------------------------

    async def analyse_vendor(self, vendor_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Analyse vendor and provide risk explanation.
        
        Returns:
            - risk_explanation: Why this vendor has the assigned risk category
            - key_factors: Main factors contributing to risk
            - recommendations: Suggested additional DD checks if needed
        """
        if not self.enabled:
            return {
                "ai_enabled": False,
                "reason": "AI is disabled in configuration"
            }

        system_message = """You are an expert procurement risk analyst. 
Analyze vendor information and provide clear, actionable risk assessments.
Be concise and focus on key risk factors. Always respond in valid JSON format."""

        # Extract vendor info - handle both ProcureFlix and Sourcevia models
        company_name = vendor_payload.get('company_name') or vendor_payload.get('name_english') or vendor_payload.get('commercial_name')
        risk_category = vendor_payload.get('risk_category', 'medium')
        risk_score = vendor_payload.get('risk_score', 50)
        status = vendor_payload.get('status', 'active')
        dd_required = vendor_payload.get('dd_required', False)
        dd_complete = vendor_payload.get('dd_complete', False)

        prompt = f"""Analyze this vendor and explain their risk assessment:

Vendor Information:
- Company: {company_name}
- Risk Category: {risk_category}
- Risk Score: {risk_score}/100
- Status: {status}
- Due Diligence Required: {dd_required}
- Due Diligence Complete: {dd_complete}

Provide a JSON response with:
1. "risk_explanation": Brief explanation of why this risk category was assigned (2-3 sentences)
2. "key_factors": Array of 2-4 main risk factors
3. "recommendations": Array of 2-3 suggested actions if risk is medium/high/very_high, empty array if low risk

Keep responses clear, professional, and actionable."""

        try:
            chat = self._create_chat(system_message)
            if not chat:
                return {
                    "ai_enabled": False,
                    "reason": "Failed to initialize AI client"
                }

            response = await chat.send_message(UserMessage(text=prompt))
            
            # Try to parse JSON response
            try:
                result = json.loads(response)
                result["ai_enabled"] = True
                return result
            except json.JSONDecodeError:
                # If not JSON, wrap in standard format
                return {
                    "ai_enabled": True,
                    "risk_explanation": response,
                    "key_factors": [],
                    "recommendations": []
                }

        except Exception as e:
            logger.error(f"Vendor AI analysis failed: {e}")
            return {
                "ai_enabled": False,
                "reason": f"AI analysis error: {str(e)}"
            }

    # ------------------------------------------------------------------
    # Contract Analysis
    # ------------------------------------------------------------------

    async def analyse_contract(self, contract_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Analyse contract and provide risk assessment and recommendations.
        
        Returns:
            - summary: Brief contract summary
            - risk_points: Key risk areas identified
            - recommendations: Suggested actions (NOC, additional clauses, etc.)
        """
        if not self.enabled:
            return {
                "ai_enabled": False,
                "reason": "AI is disabled in configuration"
            }

        system_message = """You are an expert contract analyst specializing in procurement and vendor management.
Analyze contracts for risk factors, compliance needs, and provide actionable recommendations.
Always respond in valid JSON format."""

        prompt = f"""Analyze this contract and provide risk assessment:

Contract Information:
- Title: {contract_payload.get('title')}
- Type: {contract_payload.get('contract_type')}
- Value: {contract_payload.get('contract_value')} {contract_payload.get('currency')}
- Risk Category: {contract_payload.get('risk_category')}
- Risk Score: {contract_payload.get('risk_score')}
- Has Data Access: {contract_payload.get('has_data_access')}
- Has Onsite Presence: {contract_payload.get('has_onsite_presence')}
- Has Implementation: {contract_payload.get('has_implementation')}
- Criticality: {contract_payload.get('criticality_level')}
- NOC Required: {contract_payload.get('noc_required')}
- DD Required: {contract_payload.get('dd_required')}

Provide a JSON response with:
1. "summary": 2-3 sentence overview of the contract
2. "risk_points": Array of 3-5 specific risk areas (data security, regulatory, outsourcing, cloud, etc.)
3. "recommendations": Array of 3-5 actionable suggestions (e.g., "NOC recommended for data access", "Add specific data privacy clauses", "Require vendor DD before signing")

Keep responses professional, specific, and focused on risk mitigation."""

        try:
            chat = self._create_chat(system_message)
            if not chat:
                return {
                    "ai_enabled": False,
                    "reason": "Failed to initialize AI client"
                }

            response = await chat.send_message(UserMessage(text=prompt))
            
            try:
                result = json.loads(response)
                result["ai_enabled"] = True
                return result
            except json.JSONDecodeError:
                return {
                    "ai_enabled": True,
                    "summary": response,
                    "risk_points": [],
                    "recommendations": []
                }

        except Exception as e:
            logger.error(f"Contract AI analysis failed: {e}")
            return {
                "ai_enabled": False,
                "reason": f"AI analysis error: {str(e)}"
            }

    # ------------------------------------------------------------------
    # Tender Evaluation
    # ------------------------------------------------------------------

    async def analyse_tender(self, tender_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Analyse tender and provide summary."""
        if not self.enabled:
            return {
                "ai_enabled": False,
                "reason": "AI is disabled in configuration"
            }

        system_message = """You are an expert procurement tender analyst.
Provide clear summaries of tender requirements and evaluation criteria.
Always respond in valid JSON format."""

        prompt = f"""Summarize this tender:

Tender Information:
- Title: {tender_payload.get('title')}
- Type: {tender_payload.get('tender_type')}
- Budget: {tender_payload.get('budget')} {tender_payload.get('currency')}
- Status: {tender_payload.get('status')}
- Technical Weight: {tender_payload.get('technical_weight')}
- Financial Weight: {tender_payload.get('financial_weight')}
- Description: {tender_payload.get('description')}

Provide a JSON response with:
1. "summary": 2-3 sentence overview of the tender
2. "key_requirements": Array of 3-4 main requirements
3. "evaluation_focus": Brief note on the evaluation approach based on weights

Keep it concise and professional."""

        try:
            chat = self._create_chat(system_message)
            if not chat:
                return {
                    "ai_enabled": False,
                    "reason": "Failed to initialize AI client"
                }

            response = await chat.send_message(UserMessage(text=prompt))
            
            try:
                result = json.loads(response)
                result["ai_enabled"] = True
                return result
            except json.JSONDecodeError:
                return {
                    "ai_enabled": True,
                    "summary": response,
                    "key_requirements": [],
                    "evaluation_focus": ""
                }

        except Exception as e:
            logger.error(f"Tender AI analysis failed: {e}")
            return {
                "ai_enabled": False,
                "reason": f"AI analysis error: {str(e)}"
            }

    async def analyse_tender_proposals(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Analyse tender proposals and provide evaluation suggestions.
        
        Payload should include:
        - tender: Tender data
        - proposals: List of proposals with scores
        - recommended_vendor: Top-ranked vendor
        """
        if not self.enabled:
            return {
                "ai_enabled": False,
                "reason": "AI is disabled in configuration"
            }

        system_message = """You are an expert procurement evaluation committee advisor.
Analyze tender proposals and provide guidance on vendor selection decisions.
Focus on explaining rankings, highlighting trade-offs, and suggesting what the committee should review.
Always respond in valid JSON format. DO NOT make final decisions - only provide guidance."""

        tender = payload.get('tender', {})
        proposals = payload.get('proposals', [])
        recommended = payload.get('recommended_vendor')

        proposal_summary = "\n".join([
            f"- Vendor {p.get('vendor_id')}: Technical {p.get('technical_score')}, Financial {p.get('financial_score')}, Total {p.get('total_score')}"
            for p in proposals
        ])

        prompt = f"""Analyze these tender proposals and provide evaluation guidance:

Tender: {tender.get('title')}
Budget: {tender.get('budget')} {tender.get('currency')}
Weights: Technical {tender.get('technical_weight')} / Financial {tender.get('financial_weight')}

Proposals:
{proposal_summary}

Recommended Vendor: {recommended}

Provide a JSON response with:
1. "ranking_explanation": Why the recommended vendor ranks #1 (2-3 sentences)
2. "trade_offs": Array of 2-3 key trade-offs between proposals (e.g., "Vendor A stronger technically but more expensive")
3. "committee_focus": Array of 2-3 specific points the evaluation committee should review carefully
4. "risk_considerations": Array of 1-2 risk factors to consider

Remember: This is advisory only. The committee makes the final decision."""

        try:
            chat = self._create_chat(system_message)
            if not chat:
                return {
                    "ai_enabled": False,
                    "reason": "Failed to initialize AI client"
                }

            response = await chat.send_message(UserMessage(text=prompt))
            
            try:
                result = json.loads(response)
                result["ai_enabled"] = True
                return result
            except json.JSONDecodeError:
                return {
                    "ai_enabled": True,
                    "ranking_explanation": response,
                    "trade_offs": [],
                    "committee_focus": [],
                    "risk_considerations": []
                }

        except Exception as e:
            logger.error(f"Tender proposals AI analysis failed: {e}")
            return {
                "ai_enabled": False,
                "reason": f"AI analysis error: {str(e)}"
            }


_ai_client: Optional[ProcureFlixAIClient] = None


def get_ai_client() -> ProcureFlixAIClient:
    """Get or create the singleton AI client instance."""
    global _ai_client
    if _ai_client is None:
        settings = get_settings()
        _ai_client = ProcureFlixAIClient(
            enabled=settings.enable_ai,
            api_key=settings.emergent_llm_key,
            model=settings.ai_model
        )
        logger.info(f"AI Client initialized: enabled={settings.enable_ai}, model={settings.ai_model}")
    return _ai_client
