from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request, status
from fastapi.responses import JSONResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import aiohttp
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from io import BytesIO

# Import AI helpers
from ai_helpers import (
    analyze_vendor_scoring,
    analyze_tender_proposal,
    analyze_contract_classification,
    analyze_po_items,
    match_invoice_to_milestone
)

# Import all models from the models package
from models import (
    User, UserSession, UserRole,
    Vendor, VendorType, VendorStatus, RiskCategory,
    Tender, TenderStatus, EvaluationCriteria, Proposal, ProposalStatus,
    Contract, ContractStatus,
    Invoice, InvoiceStatus,
    PurchaseOrder, POItem, POStatus,
    Resource, ResourceStatus, WorkType, Relative,
    Asset, AssetStatus, AssetCondition, Building, Floor, AssetCategory,
    OSR, OSRType, OSRCategory, OSRStatus, OSRPriority,
    Notification, AuditLog
)

# Import utilities
from utils.database import db, client
from utils.auth import hash_password, verify_password, get_current_user, require_auth, require_role
from utils.helpers import generate_number, determine_outsourcing_classification, determine_noc_requirement

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

