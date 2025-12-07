"""
AI Helper Functions - Legacy Sourcevia AI helpers
Note: ProcureFlix uses its own AI client (procureflix/ai/client.py)
These are kept for legacy Sourcevia compatibility
"""
import json
import re

def extract_json_from_response(response: str) -> dict:
    """
    Extract JSON from LLM response, handling markdown code blocks
    """
    # Try to extract JSON from markdown code blocks
    json_match = re.search(r'```json\s*(.*?)\s*```', response, re.DOTALL)
    if json_match:
        json_str = json_match.group(1)
    else:
        # Try to find JSON without markdown
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
        else:
            json_str = response
    
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        return {"error": "Failed to parse JSON", "raw_response": response}

# Legacy AI functions - disabled (use ProcureFlix AI client instead)
async def analyze_vendor_scoring(vendor_data: dict) -> dict:
    return {"ai_enabled": False, "reason": "Legacy AI disabled. Use ProcureFlix AI endpoints."}

async def analyze_tender_proposal(tender_data: dict, proposal_data: dict) -> dict:
    return {"ai_enabled": False, "reason": "Legacy AI disabled. Use ProcureFlix AI endpoints."}

async def analyze_contract_classification(contract_description: str, contract_title: str) -> dict:
    return {"ai_enabled": False, "reason": "Legacy AI disabled. Use ProcureFlix AI endpoints."}

async def analyze_po_items(item_description: str) -> dict:
    return {"ai_enabled": False, "reason": "Legacy AI disabled. Use ProcureFlix AI endpoints."}

async def match_invoice_to_milestone(invoice_description: str, milestones: list) -> dict:
    return {"ai_enabled": False, "reason": "Legacy AI disabled. Use ProcureFlix AI endpoints."}
