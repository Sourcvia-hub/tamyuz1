"""
AI Helper Functions using OpenAI GPT-4o
"""
import json
import uuid
import re
import os

# Try to import OpenAI (standard SDK)
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# API Key - Load from environment
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

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
        # If all parsing fails, return None
        return None

async def analyze_vendor_scoring(vendor_data: dict) -> dict:
    """
    AI analyzes vendor data and suggests risk scores with reasoning
    """
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"vendor-analysis-{uuid.uuid4()}",
        system_message="You are an expert procurement risk analyst. Analyze vendor data and provide risk assessment."
    ).with_model("openai", "gpt-4o")
    
    prompt = f"""Analyze this vendor data and provide a risk assessment:

Vendor Information:
- Name: {vendor_data.get('name_english', 'N/A')}
- VAT Number: {vendor_data.get('vat_number', 'N/A')}
- CR Number: {vendor_data.get('cr_number', 'N/A')}
- Activity: {vendor_data.get('activity_description', 'N/A')}
- Employees: {vendor_data.get('number_of_employees', 'N/A')}
- Countries Operating: {vendor_data.get('country_list', 'N/A')}

Respond in JSON format:
{{
    "risk_category": "low|medium|high|very_high",
    "risk_score": <number 0-100>,
    "reasoning": "Brief explanation of risk assessment",
    "red_flags": ["flag1", "flag2"],
    "recommendations": ["rec1", "rec2"]
}}"""
    
    user_message = UserMessage(text=prompt)
    response = await chat.send_message(user_message)
    
    # Extract JSON from response (handles markdown code blocks)
    result = extract_json_from_response(response)
    
    if result:
        return result
    else:
        # Fallback if JSON parsing fails
        return {
            "risk_category": "medium",
            "risk_score": 50,
            "reasoning": response[:200] if response else "AI analysis failed",
            "red_flags": [],
            "recommendations": []
        }

async def analyze_tender_proposal(tender_data: dict, proposal_data: dict) -> dict:
    """
    AI analyzes tender proposal and suggests evaluation scores
    """
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"tender-eval-{uuid.uuid4()}",
        system_message="You are an expert procurement evaluator. Analyze proposals and suggest fair evaluation scores."
    ).with_model("openai", "gpt-4o")
    
    prompt = f"""Analyze this tender proposal and suggest evaluation scores:

Tender: {tender_data.get('title', 'N/A')}
Requirements: {tender_data.get('requirements', 'N/A')}
Budget: {tender_data.get('budget', 'N/A')}

Vendor Proposal:
- Vendor: {proposal_data.get('vendor_name', 'N/A')}
- Proposed Price: {proposal_data.get('proposed_price', 'N/A')}
- Technical Approach: {proposal_data.get('technical_approach', 'N/A')}
- Timeline: {proposal_data.get('timeline', 'N/A')}

Respond in JSON format:
{{
    "technical_score": <number 0-100>,
    "financial_score": <number 0-100>,
    "overall_score": <number 0-100>,
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "recommendation": "Award|Reject|Further Review"
}}"""
    
    user_message = UserMessage(text=prompt)
    response = await chat.send_message(user_message)
    
    # Extract JSON from response (handles markdown code blocks)
    result = extract_json_from_response(response)
    
    if result:
        return result
    else:
        return {
            "technical_score": 70,
            "financial_score": 70,
            "overall_score": 70,
            "strengths": [],
            "weaknesses": [],
            "recommendation": "Further Review"
        }

async def analyze_contract_classification(contract_description: str, contract_title: str) -> dict:
    """
    AI analyzes contract and auto-classifies type (outsourcing, cloud, NOC)
    """
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"contract-classify-{uuid.uuid4()}",
        system_message="You are an expert contract classifier. Analyze contracts and determine their classification."
    ).with_model("openai", "gpt-4o")
    
    prompt = f"""Analyze this contract and determine its classification:

Title: {contract_title}
Description: {contract_description}

Determine:
1. Is this an outsourcing contract? (vendor provides services/labor)
2. Is this a cloud computing contract? (SaaS, IaaS, PaaS, cloud services)
3. Does it require NOC (No Objection Certificate)?
   IMPORTANT RULES:
   - Cloud computing contracts (SaaS, IaaS, PaaS, AWS, Azure, Google Cloud) ALWAYS require NOC
   - International vendor contracts ALWAYS require NOC
   - Contracts involving cross-border data transfer ALWAYS require NOC
4. Does it involve data access/processing?
5. Does it involve third-party subcontracting?

Respond in JSON format:
{{
    "outsourcing_classification": "none|outsourcing|cloud_computing",
    "is_noc_required": true|false,
    "involves_data_access": true|false,
    "involves_subcontracting": true|false,
    "reasoning": "Brief explanation",
    "confidence": <number 0-100>
}}"""
    
    user_message = UserMessage(text=prompt)
    response = await chat.send_message(user_message)
    
    # Extract JSON from response (handles markdown code blocks)
    result = extract_json_from_response(response)
    
    if result:
        return result
    else:
        return {
            "outsourcing_classification": "none",
            "is_noc_required": False,
            "involves_data_access": False,
            "involves_subcontracting": False,
            "reasoning": "Unable to classify",
            "confidence": 0
        }

async def analyze_po_items(item_description: str) -> dict:
    """
    AI analyzes PO item description and suggests checkbox selections
    """
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"po-item-{uuid.uuid4()}",
        system_message="You are an expert procurement analyst. Analyze purchase order items and determine their requirements."
    ).with_model("openai", "gpt-4o")
    
    prompt = f"""Analyze this purchase order item description:

Item: {item_description}

Determine:
1. Does this item require a contract? (high value, ongoing service, critical item)
2. Does it involve data processing or access?
3. Is it a service or product?
4. Does it require technical specifications?
5. Does it need quality inspection?
6. Risk level (low/medium/high)

Respond in JSON format:
{{
    "requires_contract": true|false,
    "involves_data": true|false,
    "item_type": "product|service|software|equipment",
    "requires_specs": true|false,
    "requires_inspection": true|false,
    "risk_level": "low|medium|high",
    "suggested_category": "IT|Office|Services|Equipment|Other",
    "reasoning": "Brief explanation"
}}"""
    
    user_message = UserMessage(text=prompt)
    response = await chat.send_message(user_message)
    
    # Extract JSON from response (handles markdown code blocks)
    result = extract_json_from_response(response)
    
    if result:
        return result
    else:
        return {
            "requires_contract": False,
            "involves_data": False,
            "item_type": "product",
            "requires_specs": False,
            "requires_inspection": False,
            "risk_level": "low",
            "suggested_category": "Other",
            "reasoning": "Unable to analyze"
        }

async def match_invoice_to_milestone(invoice_description: str, milestones: list) -> dict:
    """
    AI matches invoice description to contract milestones
    """
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"invoice-match-{uuid.uuid4()}",
        system_message="You are an expert at matching invoices to contract milestones."
    ).with_model("openai", "gpt-4o")
    
    milestones_text = "\n".join([f"- {m.get('name', 'N/A')} (Amount: {m.get('amount', 0)}, Date: {m.get('date', 'N/A')})" for m in milestones])
    
    prompt = f"""Match this invoice to the most appropriate milestone:

Invoice Description: {invoice_description}

Available Milestones:
{milestones_text}

Respond in JSON format:
{{
    "matched_milestone_name": "milestone name or null",
    "confidence": <number 0-100>,
    "reasoning": "Brief explanation of match",
    "alternative_matches": ["milestone1", "milestone2"]
}}"""
    
    user_message = UserMessage(text=prompt)
    response = await chat.send_message(user_message)
    
    # Extract JSON from response (handles markdown code blocks)
    result = extract_json_from_response(response)
    
    if result:
        return result
    else:
        return {
            "matched_milestone_name": None,
            "confidence": 0,
            "reasoning": "Unable to match",
            "alternative_matches": []
        }
