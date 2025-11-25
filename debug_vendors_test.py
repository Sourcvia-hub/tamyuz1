#!/usr/bin/env python3
"""
Debug Vendors Test - Investigate vendor_number field issue
"""

import requests
import json
import sys

# Configuration
BASE_URL = "https://assetrack.preview.emergentagent.com/api"
TEST_CREDENTIALS = {"email": "procurement@test.com", "password": "password"}

class DebugVendorsTest:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
    def login(self):
        """Login with test credentials"""
        print("=== LOGIN ===")
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=TEST_CREDENTIALS)
            if response.status_code == 200:
                print(f"✅ Login successful")
                return True
            else:
                print(f"❌ Login failed: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    def debug_vendors(self):
        """Debug vendors endpoint to understand vendor_number field"""
        print(f"\n=== DEBUG VENDORS ENDPOINT ===")
        
        try:
            # Get all vendors (no filter)
            print("1. Getting ALL vendors...")
            response = self.session.get(f"{BASE_URL}/vendors")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                all_vendors = response.json()
                print(f"Total vendors: {len(all_vendors)}")
                
                # Check first few vendors for vendor_number
                print(f"\n2. Checking first 5 vendors for vendor_number field...")
                for i, vendor in enumerate(all_vendors[:5]):
                    vendor_id = vendor.get('id', 'N/A')
                    vendor_number = vendor.get('vendor_number', 'MISSING')
                    name = vendor.get('name_english', 'N/A')
                    status = vendor.get('status', 'N/A')
                    
                    print(f"Vendor {i+1}:")
                    print(f"  ID: {vendor_id}")
                    print(f"  Name: {name}")
                    print(f"  Status: {status}")
                    print(f"  Vendor Number: {vendor_number}")
                    print(f"  All fields: {list(vendor.keys())}")
                    print()
                
                # Count vendors with and without vendor_number
                with_number = 0
                without_number = 0
                
                for vendor in all_vendors:
                    if vendor.get('vendor_number'):
                        with_number += 1
                    else:
                        without_number += 1
                
                print(f"3. Vendor number statistics:")
                print(f"  With vendor_number: {with_number}")
                print(f"  Without vendor_number: {without_number}")
                
                # Get approved vendors specifically
                print(f"\n4. Getting APPROVED vendors...")
                approved_response = self.session.get(f"{BASE_URL}/vendors?status=approved")
                print(f"Status: {approved_response.status_code}")
                
                if approved_response.status_code == 200:
                    approved_vendors = approved_response.json()
                    print(f"Approved vendors: {len(approved_vendors)}")
                    
                    # Check approved vendors for vendor_number
                    approved_with_number = 0
                    approved_without_number = 0
                    
                    for vendor in approved_vendors:
                        if vendor.get('vendor_number'):
                            approved_with_number += 1
                        else:
                            approved_without_number += 1
                    
                    print(f"  Approved with vendor_number: {approved_with_number}")
                    print(f"  Approved without vendor_number: {approved_without_number}")
                    
                    # Show first 3 approved vendors with all their data
                    print(f"\n5. First 3 approved vendors (detailed):")
                    for i, vendor in enumerate(approved_vendors[:3]):
                        print(f"\nApproved Vendor {i+1}:")
                        print(f"  vendor_number: {vendor.get('vendor_number', 'MISSING')}")
                        print(f"  name_english: {vendor.get('name_english', 'MISSING')}")
                        print(f"  commercial_name: {vendor.get('commercial_name', 'MISSING')}")
                        print(f"  risk_category: {vendor.get('risk_category', 'MISSING')}")
                        print(f"  status: {vendor.get('status', 'MISSING')}")
                        print(f"  id: {vendor.get('id', 'MISSING')}")
                
                # Try to create a new vendor to see if vendor_number gets generated
                print(f"\n6. Testing vendor creation to check vendor_number generation...")
                test_vendor = {
                    "name_english": "Test Vendor Debug",
                    "commercial_name": "Test Debug Co",
                    "vendor_type": "local",
                    "entity_type": "LLC",
                    "vat_number": "300123456789999",
                    "cr_number": "1010123999",
                    "cr_expiry_date": "2025-12-31T00:00:00Z",
                    "cr_country_city": "Riyadh, Saudi Arabia",
                    "activity_description": "Testing Services",
                    "number_of_employees": 5,
                    "street": "Test Street",
                    "building_no": "999",
                    "city": "Riyadh",
                    "district": "Test District",
                    "country": "Saudi Arabia",
                    "mobile": "+966501234999",
                    "email": "test@debug.com",
                    "representative_name": "Test Rep",
                    "representative_designation": "Manager",
                    "representative_id_type": "National ID",
                    "representative_id_number": "9999999999",
                    "representative_nationality": "Saudi",
                    "representative_mobile": "+966501234999",
                    "representative_email": "rep@debug.com",
                    "bank_account_name": "Test Vendor Debug",
                    "bank_name": "Test Bank",
                    "bank_branch": "Test Branch",
                    "bank_country": "Saudi Arabia",
                    "iban": "SA0310000000123456789999",
                    "currency": "SAR",
                    "swift_code": "TESTCODE"
                }
                
                create_response = self.session.post(f"{BASE_URL}/vendors", json=test_vendor)
                print(f"Create vendor status: {create_response.status_code}")
                
                if create_response.status_code == 200:
                    new_vendor = create_response.json()
                    print(f"✅ New vendor created successfully")
                    print(f"  vendor_number: {new_vendor.get('vendor_number', 'MISSING')}")
                    print(f"  name_english: {new_vendor.get('name_english', 'MISSING')}")
                    print(f"  status: {new_vendor.get('status', 'MISSING')}")
                else:
                    print(f"❌ Failed to create vendor: {create_response.text}")
                
                return True
            else:
                print(f"❌ Failed to get vendors: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Debug test error: {str(e)}")
            return False
    
    def run_debug(self):
        """Run the debug test"""
        print("VENDORS DEBUG TEST")
        print("=" * 50)
        
        if not self.login():
            return False
        
        if not self.debug_vendors():
            return False
        
        print(f"\n" + "=" * 50)
        print("DEBUG TEST COMPLETED")
        return True

if __name__ == "__main__":
    tester = DebugVendorsTest()
    success = tester.run_debug()
    sys.exit(0 if success else 1)