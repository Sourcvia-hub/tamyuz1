#!/usr/bin/env python3
"""
Simple file upload test to debug the issue
"""

import requests
import tempfile
import os

BASE_URL = "https://procurement-app-1.preview.emergentagent.com/api"
TEST_USER = {"email": "procurement@test.com", "password": "password"}

def test_simple_upload():
    # Create session and login
    session = requests.Session()
    
    # Login
    login_data = {"email": TEST_USER["email"], "password": TEST_USER["password"]}
    login_response = session.post(f"{BASE_URL}/auth/login", json=login_data)
    print(f"Login Status: {login_response.status_code}")
    
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.text}")
        return
    
    # Create a test vendor
    vendor_data = {
        "name_english": "Simple Test Vendor",
        "commercial_name": "SimpleTest Co",
        "vendor_type": "local",
        "entity_type": "LLC",
        "vat_number": "300123456789999",
        "cr_number": "1010123999",
        "cr_expiry_date": "2025-12-31T00:00:00Z",
        "cr_country_city": "Riyadh, Saudi Arabia",
        "activity_description": "Testing Services",
        "number_of_employees": 5,
        "street": "Test Street",
        "building_no": "1",
        "city": "Riyadh",
        "district": "Test",
        "country": "Saudi Arabia",
        "mobile": "+966501111111",
        "email": "test@simple.com",
        "representative_name": "Test Rep",
        "representative_designation": "Manager",
        "representative_id_type": "National ID",
        "representative_id_number": "1111111111",
        "representative_nationality": "Saudi",
        "representative_mobile": "+966501111111",
        "representative_email": "rep@simple.com",
        "bank_account_name": "Simple Test Vendor",
        "bank_name": "Test Bank",
        "bank_branch": "Test Branch",
        "bank_country": "Saudi Arabia",
        "iban": "SA0310000000111111111111",
        "currency": "SAR",
        "swift_code": "TESTBANK"
    }
    
    vendor_response = session.post(f"{BASE_URL}/vendors", json=vendor_data)
    print(f"Create Vendor Status: {vendor_response.status_code}")
    
    if vendor_response.status_code != 200:
        print(f"Vendor creation failed: {vendor_response.text}")
        return
    
    vendor = vendor_response.json()
    vendor_id = vendor.get('id')
    print(f"Vendor created: {vendor_id}")
    
    # Create a simple test file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write("This is a test file for upload")
        test_file_path = f.name
    
    try:
        # Test 1: Try with single file in files list
        print("\n--- Test 1: Single file upload ---")
        with open(test_file_path, 'rb') as f:
            files = {'files': ('test.txt', f, 'text/plain')}
            data = {'file_type': 'supporting_documents'}
            
            response = session.post(
                f"{BASE_URL}/upload/vendor/{vendor_id}",
                files=files,
                data=data
            )
            print(f"Upload Status: {response.status_code}")
            print(f"Response: {response.text}")
        
        # Test 2: Try with multiple files parameter
        print("\n--- Test 2: Multiple files parameter ---")
        with open(test_file_path, 'rb') as f:
            files = [('files', ('test.txt', f, 'text/plain'))]
            data = {'file_type': 'supporting_documents'}
            
            response = session.post(
                f"{BASE_URL}/upload/vendor/{vendor_id}",
                files=files,
                data=data
            )
            print(f"Upload Status: {response.status_code}")
            print(f"Response: {response.text}")
            
    finally:
        # Clean up
        os.unlink(test_file_path)

if __name__ == "__main__":
    test_simple_upload()