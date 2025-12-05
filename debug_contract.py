#!/usr/bin/env python3
"""
Debug contract status after DD completion
"""

import requests
import json

# Configuration
BASE_URL = "https://data-overhaul-1.preview.emergentagent.com/api"
TEST_USER = {"email": "procurement@test.com", "password": "password"}

def login():
    session = requests.Session()
    session.headers.update({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    })
    
    login_data = {
        "email": TEST_USER["email"],
        "password": TEST_USER["password"]
    }
    
    response = session.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code == 200:
        print("✅ Login successful")
        return session
    else:
        print(f"❌ Login failed: {response.text}")
        return None

def get_contracts(session):
    """Get all contracts to see their status"""
    response = session.get(f"{BASE_URL}/contracts")
    if response.status_code == 200:
        contracts = response.json()
        print(f"\n=== ALL CONTRACTS ===")
        for contract in contracts[-5:]:  # Show last 5 contracts
            print(f"Contract: {contract.get('contract_number')} - Status: {contract.get('status')} - Vendor: {contract.get('vendor_id')}")
        return contracts
    else:
        print(f"❌ Failed to get contracts: {response.text}")
        return []

def get_vendors(session):
    """Get all vendors to see their DD status"""
    response = session.get(f"{BASE_URL}/vendors")
    if response.status_code == 200:
        vendors = response.json()
        print(f"\n=== RECENT VENDORS ===")
        for vendor in vendors[-5:]:  # Show last 5 vendors
            print(f"Vendor: {vendor.get('name_english')} - Status: {vendor.get('status')} - DD Completed: {vendor.get('dd_completed')}")
        return vendors
    else:
        print(f"❌ Failed to get vendors: {response.text}")
        return []

if __name__ == "__main__":
    session = login()
    if session:
        contracts = get_contracts(session)
        vendors = get_vendors(session)