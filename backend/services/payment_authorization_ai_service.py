"""
Payment Authorization AI Service
Validates deliverables for payment authorization readiness
"""
import os
import json
import re
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


PAYMENT_AUTHORIZATION_VALIDATION_PROMPT = """You are a Deliverable & Payment Authorization Validation Assistant.
Your role is to support Procurement by validating whether an Accepted Deliverable is suitable for Payment Authorization generation.

You do NOT:
- Approve payments
- Execute financial transactions

Your output is advisory only and is included as a reference inside the Payment Authorization Form.

INPUTS PROVIDED:
- Accepted Deliverable details
- Linked Contract or PO
- Linked PR / Project
- Deliverable amount and period
- Supporting documents (if any)

TASK:
- Confirm deliverable alignment with:
  - Contract / PO scope
  - PR scope
- Highlight:
  - Amount anomalies
  - Missing clarification
  - Inconsistencies requiring finance attention

OUTPUT FORMAT (STRICT JSON):
{
    "payment_readiness": "Ready | Ready with Clarifications | Not Ready",
    "key_observations": ["observation 1", "observation 2", "observation 3"],
    "required_clarifications": ["clarification 1 if any"],
    "advisory_summary": "Short professional note for Finance",
    "confidence": "High | Medium | Low"
}
"""


class PaymentAuthorizationAIService:
    """AI Service for Payment Authorization validation"""
    
    def __init__(self):
        """Initialize with OpenAI API key"""
        self.openai_key = os.environ.get("OPENAI_API_KEY")
        if not self.openai_key:
            logger.warning("No OPENAI_API_KEY provided. AI features will use rule-based validation.")
        self.client = None
        if self.openai_key:
            from openai import OpenAI
            self.client = OpenAI(api_key=self.openai_key)
    
    async def validate_deliverable_for_payment(
        self,
        deliverable: Dict[str, Any],
        contract: Optional[Dict[str, Any]] = None,
        po: Optional[Dict[str, Any]] = None,
        tender: Optional[Dict[str, Any]] = None,
        vendor: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Validate a deliverable for payment authorization readiness
        Returns AI assessment with readiness status and observations
        """
        
        # Build context
        context = self._build_validation_context(deliverable, contract, po, tender, vendor)
        
        # Try AI validation first
        if self.client:
            try:
                return await self._ai_validate(context)
            except Exception as e:
                logger.error(f"AI validation failed: {e}")
        
        # Fallback to rule-based validation
        return self._rule_based_validate(deliverable, contract, po)
    
    def _build_validation_context(
        self,
        deliverable: Dict[str, Any],
        contract: Optional[Dict[str, Any]],
        po: Optional[Dict[str, Any]],
        tender: Optional[Dict[str, Any]],
        vendor: Optional[Dict[str, Any]]
    ) -> str:
        """Build context string for AI validation"""
        
        context_parts = []
        
        # Deliverable info
        context_parts.append(f"""
DELIVERABLE INFORMATION:
- Title: {deliverable.get('title', 'N/A')}
- Description: {deliverable.get('description', 'N/A')}
- Type: {deliverable.get('deliverable_type', 'N/A')}
- Amount: {deliverable.get('currency', 'SAR')} {deliverable.get('amount', 0):,.2f}
- Status: {deliverable.get('status', 'N/A')}
- Period: {deliverable.get('period_start', 'N/A')} to {deliverable.get('period_end', 'N/A')}
- Due Date: {deliverable.get('due_date', 'N/A')}
- Supporting Documents: {len(deliverable.get('documents', []))} documents
""")
        
        # Contract info
        if contract:
            context_parts.append(f"""
LINKED CONTRACT:
- Contract Number: {contract.get('contract_number', 'N/A')}
- Title: {contract.get('title', 'N/A')}
- Total Value: {contract.get('value', 0):,.2f}
- SOW Summary: {contract.get('sow', 'N/A')[:500]}...
- Status: {contract.get('status', 'N/A')}
""")
        
        # PO info
        if po:
            context_parts.append(f"""
LINKED PURCHASE ORDER:
- PO Number: {po.get('po_number', 'N/A')}
- Total Amount: {po.get('total_amount', 0):,.2f}
- Status: {po.get('status', 'N/A')}
""")
        
        # Tender/PR info
        if tender:
            context_parts.append(f"""
LINKED BUSINESS REQUEST (PR):
- PR Number: {tender.get('tender_number', 'N/A')}
- Project: {tender.get('project_name', 'N/A')}
- Budget: {tender.get('budget', 0):,.2f}
- Requirements: {tender.get('requirements', 'N/A')[:500]}...
""")
        
        # Vendor info
        if vendor:
            context_parts.append(f"""
VENDOR INFORMATION:
- Name: {vendor.get('name_english') or vendor.get('commercial_name', 'N/A')}
- Risk Category: {vendor.get('risk_category', 'N/A')}
- Status: {vendor.get('status', 'N/A')}
""")
        
        return "\n".join(context_parts)
    
    async def _ai_validate(self, context: str) -> Dict[str, Any]:
        """Perform AI-powered validation"""
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        chat = LlmChat(
            api_key=self.emergent_key,
            session_id=f"paf-validate-{datetime.now().timestamp()}",
            system_message=PAYMENT_AUTHORIZATION_VALIDATION_PROMPT
        ).with_model("openai", "gpt-4o")
        
        user_message = UserMessage(
            text=f"Please validate this deliverable for payment authorization:\n\n{context}"
        )
        
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        try:
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                data = json.loads(json_match.group())
                return {
                    "payment_readiness": data.get("payment_readiness", "Ready with Clarifications"),
                    "key_observations": data.get("key_observations", [])[:3],
                    "required_clarifications": data.get("required_clarifications", []),
                    "advisory_summary": data.get("advisory_summary", ""),
                    "confidence": data.get("confidence", "Medium"),
                    "validated_by": "ai",
                    "validated_at": datetime.now(timezone.utc).isoformat()
                }
        except json.JSONDecodeError:
            pass
        
        # Return default if parsing fails
        return self._rule_based_validate({}, None, None)
    
    def _rule_based_validate(
        self,
        deliverable: Dict[str, Any],
        contract: Optional[Dict[str, Any]],
        po: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Rule-based validation fallback"""
        
        observations = []
        clarifications = []
        readiness = "Ready"
        confidence = "Medium"
        
        # Check deliverable status
        if deliverable.get("status") != "accepted":
            readiness = "Not Ready"
            observations.append(f"Deliverable status is '{deliverable.get('status')}', expected 'accepted'")
        
        # Check amount
        amount = deliverable.get("amount", 0)
        if amount <= 0:
            readiness = "Not Ready"
            observations.append("Deliverable amount is zero or negative")
        
        # Check contract alignment
        if contract:
            contract_value = contract.get("value", 0)
            if contract_value > 0 and amount > contract_value:
                readiness = "Ready with Clarifications"
                observations.append(f"Deliverable amount ({amount:,.2f}) exceeds contract value ({contract_value:,.2f})")
                clarifications.append("Verify if this is cumulative or if contract amendment is needed")
        
        # Check PO alignment
        if po:
            po_amount = po.get("total_amount", 0)
            if po_amount > 0 and amount > po_amount:
                readiness = "Ready with Clarifications"
                observations.append(f"Deliverable amount ({amount:,.2f}) exceeds PO amount ({po_amount:,.2f})")
                clarifications.append("Verify PO coverage for this deliverable")
        
        # Check supporting documents
        if len(deliverable.get("documents", [])) == 0:
            if readiness == "Ready":
                readiness = "Ready with Clarifications"
            observations.append("No supporting documents attached")
            clarifications.append("Consider attaching delivery confirmation or acceptance documents")
        
        # Generate advisory summary
        if readiness == "Ready":
            summary = "Deliverable appears aligned with contract/PO scope. Recommended for payment processing."
            confidence = "High"
        elif readiness == "Ready with Clarifications":
            summary = "Deliverable can proceed with payment authorization after addressing the clarifications noted."
            confidence = "Medium"
        else:
            summary = "Deliverable requires resolution of issues before payment authorization can be generated."
            confidence = "Low"
        
        return {
            "payment_readiness": readiness,
            "key_observations": observations[:3],
            "required_clarifications": clarifications,
            "advisory_summary": summary,
            "confidence": confidence,
            "validated_by": "rule_based",
            "validated_at": datetime.now(timezone.utc).isoformat()
        }


# Singleton instance
_ai_service: Optional[PaymentAuthorizationAIService] = None


def get_payment_authorization_ai_service() -> PaymentAuthorizationAIService:
    """Get or create the AI service singleton"""
    global _ai_service
    if _ai_service is None:
        _ai_service = PaymentAuthorizationAIService()
    return _ai_service
