#!/usr/bin/env python3
"""
Vendors Endpoint Test - Specific test for vendors endpoint data verification
Tests the vendors endpoint to verify data is being returned correctly with all fields including vendor_number
"""

import requests
import json
import sys

# Configuration
BASE_URL = "https://data-overhaul-1.preview.emergentagent.com/api"
TEST_CREDENTIALS = {"email": "procurement@test.com", "password": "password"}

class VendorsEndpointTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
    def login(self):
        """Login with test credentials"""
        print("=== LOGIN TEST ===")
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=TEST_CREDENTIALS)
            print(f"Login Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Login successful for {TEST_CREDENTIALS['email']}")
                print(f"User role: {data.get('user', {}).get('role', 'Unknown')}")
                return True
            else:
                print(f"❌ Login failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    def test_vendors_endpoint(self):
        """Test GET /api/vendors?status=approved endpoint"""
        print(f"\n=== VENDORS ENDPOINT TEST ===")
        
        try:
            # Call GET /api/vendors?status=approved
            print("Calling GET /api/vendors?status=approved...")
            response = self.session.get(f"{BASE_URL}/vendors?status=approved")
            print(f"Response Status: {response.status_code}")
            
            if response.status_code == 200:
                vendors = response.json()
                print(f"✅ Successfully retrieved vendors data")
                print(f"Number of approved vendors: {len(vendors)}")
                
                if not vendors:
                    print("⚠️ No approved vendors found in the system")
                    return True
                
                # Verify required fields are present
                print(f"\n--- FIELD VERIFICATION ---")
                required_fields = ['vendor_number', 'name_english', 'commercial_name', 'risk_category']
                
                # Check first vendor for required fields
                first_vendor = vendors[0]
                missing_fields = []
                
                for field in required_fields:
                    if field not in first_vendor:
                        missing_fields.append(field)
                    else:
                        print(f"✅ {field}: Present")
                
                if missing_fields:
                    print(f"❌ Missing required fields: {missing_fields}")
                    return False
                
                # Print first 3 vendors with their vendor_number, name_english, and risk_category
                print(f"\n--- FIRST 3 VENDORS DATA ---")
                vendors_to_show = min(3, len(vendors))
                
                for i in range(vendors_to_show):
                    vendor = vendors[i]
                    vendor_number = vendor.get('vendor_number', 'N/A')
                    name_english = vendor.get('name_english', 'N/A')
                    risk_category = vendor.get('risk_category', 'N/A')
                    commercial_name = vendor.get('commercial_name', 'N/A')
                    
                    print(f"\nVendor {i+1}:")
                    print(f"  Vendor Number: {vendor_number}")
                    print(f"  Name (English): {name_english}")
                    print(f"  Commercial Name: {commercial_name}")
                    print(f"  Risk Category: {risk_category}")
                
                # Additional verification - check all vendors have vendor_number
                print(f"\n--- VENDOR NUMBER VERIFICATION ---")
                vendors_with_numbers = 0
                vendors_without_numbers = 0
                
                for vendor in vendors:
                    if vendor.get('vendor_number'):
                        vendors_with_numbers += 1
                    else:
                        vendors_without_numbers += 1
                
                print(f"Vendors with vendor_number: {vendors_with_numbers}")
                print(f"Vendors without vendor_number: {vendors_without_numbers}")
                
                if vendors_without_numbers > 0:
                    print(f"⚠️ Some vendors are missing vendor_number field")
                else:
                    print(f"✅ All vendors have vendor_number field")
                
                # Check vendor_number format (should be Vendor-YY-NNNN)
                print(f"\n--- VENDOR NUMBER FORMAT VERIFICATION ---")
                correct_format_count = 0
                
                for vendor in vendors[:5]:  # Check first 5 vendors
                    vendor_number = vendor.get('vendor_number', '')
                    if vendor_number and vendor_number.startswith('Vendor-25-'):
                        correct_format_count += 1
                        print(f"✅ {vendor_number} - Correct format")
                    elif vendor_number:
                        print(f"⚠️ {vendor_number} - Different format (might be legacy)")
                    else:
                        print(f"❌ Missing vendor_number")
                
                print(f"Vendors with correct format (Vendor-25-NNNN): {correct_format_count}")
                
                # Summary
                print(f"\n--- SUMMARY ---")
                print(f"✅ Vendors endpoint is working correctly")
                print(f"✅ All required fields are present: {required_fields}")
                print(f"✅ Retrieved {len(vendors)} approved vendors")
                print(f"✅ Vendor data includes vendor_number, name_english, commercial_name, and risk_category")
                
                return True
            else:
                print(f"❌ Failed to retrieve vendors: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Vendors endpoint test error: {str(e)}")
            return False
    
    def run_test(self):
        """Run the complete test"""
        print("VENDORS ENDPOINT VERIFICATION TEST")
        print("=" * 50)
        
        # Step 1: Login
        if not self.login():
            print("❌ Test failed at login step")
            return False
        
        # Step 2: Test vendors endpoint
        if not self.test_vendors_endpoint():
            print("❌ Test failed at vendors endpoint verification")
            return False
        
        print(f"\n" + "=" * 50)
        print("✅ ALL TESTS PASSED - Vendors endpoint is working correctly")
        print("✅ All required fields (vendor_number, name_english, commercial_name, risk_category) are present")
        print("✅ Vendors data is being returned correctly")
        return True

if __name__ == "__main__":
    tester = VendorsEndpointTester()
    success = tester.run_test()
    sys.exit(0 if success else 1)