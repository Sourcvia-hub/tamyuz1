#!/usr/bin/env python3
"""
Comprehensive file attachment test covering all requirements from the review request
"""

import requests
import tempfile
import os
import subprocess
from datetime import datetime, timedelta, timezone

BASE_URL = "https://assetrack.preview.emergentagent.com/api"
TEST_USER = {"email": "procurement@test.com", "password": "password"}

def test_comprehensive_file_attachment():
    print("=" * 80)
    print("COMPREHENSIVE FILE ATTACHMENT TESTING")
    print("=" * 80)
    
    # Create session and login
    session = requests.Session()
    
    # Login
    login_data = {"email": TEST_USER["email"], "password": TEST_USER["password"]}
    login_response = session.post(f"{BASE_URL}/auth/login", json=login_data)
    print(f"Login Status: {login_response.status_code}")
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.text}")
        return False
    
    print(f"✅ Login successful")
    
    # Create test files
    test_files = create_test_files()
    
    try:
        # Test 1: Create a test vendor and upload files
        print(f"\n{'='*60}")
        print("TEST 1: VENDOR FILE UPLOAD")
        print(f"{'='*60}")
        
        vendor_id = create_test_vendor(session)
        if not vendor_id:
            return False
        
        # Upload PDF file
        pdf_result = upload_file_to_vendor(session, vendor_id, test_files['pdf'], 'test_document.pdf')
        if not pdf_result:
            return False
        
        # Upload PNG file  
        png_result = upload_file_to_vendor(session, vendor_id, test_files['png'], 'test_image.png')
        if not png_result:
            return False
        
        # Verify file storage
        if not verify_file_storage(vendor_id, 'vendors', [pdf_result['stored_filename'], png_result['stored_filename']]):
            return False
        
        # Verify metadata in MongoDB
        if not verify_metadata_in_db(session, 'vendors', vendor_id, 2):
            return False
        
        # Test file download
        if not test_file_download(session, 'vendors', vendor_id, pdf_result['stored_filename'], test_files['pdf']['content']):
            return False
        
        # Test 2: Create tender and upload file
        print(f"\n{'='*60}")
        print("TEST 2: TENDER FILE UPLOAD")
        print(f"{'='*60}")
        
        tender_id = create_test_tender(session)
        if not tender_id:
            return False
        
        tender_result = upload_file_to_tender(session, tender_id, test_files['pdf'], 'tender_requirements.pdf')
        if not tender_result:
            return False
        
        if not verify_file_storage(tender_id, 'tenders', [tender_result['stored_filename']]):
            return False
        
        # Test 3: Create contract and upload file
        print(f"\n{'='*60}")
        print("TEST 3: CONTRACT FILE UPLOAD")
        print(f"{'='*60}")
        
        contract_id = create_test_contract(session, tender_id, vendor_id)
        if not contract_id:
            return False
        
        contract_result = upload_file_to_contract(session, contract_id, test_files['png'], 'contract_diagram.png')
        if not contract_result:
            return False
        
        if not verify_file_storage(contract_id, 'contracts', [contract_result['stored_filename']]):
            return False
        
        # Test 4: Test different file types
        print(f"\n{'='*60}")
        print("TEST 4: DIFFERENT FILE TYPES")
        print(f"{'='*60}")
        
        # Test with PDF (already done above)
        print("✅ PDF file type tested successfully")
        
        # Test with PNG (already done above)  
        print("✅ PNG file type tested successfully")
        
        # Test 5: Test multiple modules (already done - vendors, tenders, contracts)
        print(f"\n{'='*60}")
        print("TEST 5: MULTIPLE MODULES TESTED")
        print(f"{'='*60}")
        print("✅ Vendors module tested")
        print("✅ Tenders module tested") 
        print("✅ Contracts module tested")
        
        print(f"\n{'='*80}")
        print("ALL TESTS PASSED SUCCESSFULLY!")
        print(f"{'='*80}")
        print("✅ File upload endpoints working for all tested modules")
        print("✅ Files stored correctly in /app/backend/uploads/{module}/{id}/")
        print("✅ Metadata stored in MongoDB")
        print("✅ File download functionality working")
        print("✅ Different file types (PDF, PNG) supported")
        print("✅ Multiple modules (Vendors, Tenders, Contracts) tested")
        
        return True
        
    finally:
        # Clean up test files
        cleanup_test_files(test_files)

def create_test_files():
    """Create test files for upload"""
    test_files = {}
    
    # Create a PDF test file
    pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
>>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000074 00000 n 
0000000120 00000 n 
trailer
<<
/Size 4
/Root 1 0 R
>>
startxref
179
%%EOF"""
    
    # Create a PNG test file (1x1 pixel)
    png_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82'
    
    # Create temporary files
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as pdf_file:
        pdf_file.write(pdf_content)
        test_files['pdf'] = {'path': pdf_file.name, 'content': pdf_content}
        
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as png_file:
        png_file.write(png_content)
        test_files['png'] = {'path': png_file.name, 'content': png_content}
    
    return test_files

def cleanup_test_files(test_files):
    """Clean up temporary test files"""
    for file_info in test_files.values():
        try:
            os.unlink(file_info['path'])
        except:
            pass

def create_test_vendor(session):
    """Create a test vendor"""
    vendor_data = {
        "name_english": "Comprehensive Test Vendor",
        "commercial_name": "CompTest Co",
        "vendor_type": "local",
        "entity_type": "LLC",
        "vat_number": "300123456789888",
        "cr_number": "1010123888",
        "cr_expiry_date": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
        "cr_country_city": "Riyadh, Saudi Arabia",
        "activity_description": "Comprehensive Testing Services",
        "number_of_employees": 10,
        "street": "Test Street",
        "building_no": "888",
        "city": "Riyadh",
        "district": "Test District",
        "country": "Saudi Arabia",
        "mobile": "+966501234888",
        "email": "contact@comptest.com",
        "representative_name": "Test Representative",
        "representative_designation": "Manager",
        "representative_id_type": "National ID",
        "representative_id_number": "8888888888",
        "representative_nationality": "Saudi",
        "representative_mobile": "+966501234888",
        "representative_email": "rep@comptest.com",
        "bank_account_name": "Comprehensive Test Vendor",
        "bank_name": "Test Bank",
        "bank_branch": "Test Branch",
        "bank_country": "Saudi Arabia",
        "iban": "SA0310000000123456789888",
        "currency": "SAR",
        "swift_code": "TESTBANK"
    }
    
    response = session.post(f"{BASE_URL}/vendors", json=vendor_data)
    print(f"Create Vendor Status: {response.status_code}")
    
    if response.status_code == 200:
        vendor = response.json()
        vendor_id = vendor.get('id')
        print(f"✅ Test vendor created: {vendor.get('name_english')} (ID: {vendor_id})")
        return vendor_id
    else:
        print(f"❌ Failed to create vendor: {response.text}")
        return None

def create_test_tender(session):
    """Create a test tender"""
    tender_data = {
        "title": "Comprehensive Test Tender",
        "description": "Tender for comprehensive file upload testing",
        "project_name": "Comprehensive File Test Project",
        "requirements": "Must support comprehensive file attachments",
        "budget": 200000.0,
        "deadline": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "invited_vendors": []
    }
    
    response = session.post(f"{BASE_URL}/tenders", json=tender_data)
    print(f"Create Tender Status: {response.status_code}")
    
    if response.status_code == 200:
        tender = response.json()
        tender_id = tender.get('id')
        print(f"✅ Test tender created: {tender.get('title')} (ID: {tender_id})")
        return tender_id
    else:
        print(f"❌ Failed to create tender: {response.text}")
        return None

def create_test_contract(session, tender_id, vendor_id):
    """Create a test contract"""
    contract_data = {
        "tender_id": tender_id,
        "vendor_id": vendor_id,
        "title": "Comprehensive Test Contract",
        "sow": "Contract for comprehensive file upload testing",
        "sla": "Standard SLA with comprehensive file attachment support",
        "value": 150000.0,
        "start_date": datetime.now(timezone.utc).isoformat(),
        "end_date": (datetime.now(timezone.utc) + timedelta(days=180)).isoformat(),
        "milestones": []
    }
    
    response = session.post(f"{BASE_URL}/contracts", json=contract_data)
    print(f"Create Contract Status: {response.status_code}")
    
    if response.status_code == 200:
        contract = response.json()
        contract_id = contract.get('id')
        print(f"✅ Test contract created: {contract.get('title')} (ID: {contract_id})")
        return contract_id
    else:
        print(f"❌ Failed to create contract: {response.text}")
        return None

def upload_file_to_vendor(session, vendor_id, file_info, filename):
    """Upload file to vendor"""
    print(f"\n--- Uploading {filename} to vendor ---")
    
    with open(file_info['path'], 'rb') as f:
        files = {'files': (filename, f, 'application/pdf' if filename.endswith('.pdf') else 'image/png')}
        data = {'file_type': 'supporting_documents'}
        
        response = session.post(
            f"{BASE_URL}/upload/vendor/{vendor_id}",
            files=files,
            data=data
        )
    
    print(f"Upload Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ {filename} uploaded successfully: {result.get('message')}")
        uploaded_files = result.get('files', [])
        if uploaded_files:
            return uploaded_files[0]
        else:
            print("❌ No file information returned")
            return None
    else:
        print(f"❌ Failed to upload {filename}: {response.text}")
        return None

def upload_file_to_tender(session, tender_id, file_info, filename):
    """Upload file to tender"""
    print(f"\n--- Uploading {filename} to tender ---")
    
    with open(file_info['path'], 'rb') as f:
        files = {'files': (filename, f, 'application/pdf')}
        
        response = session.post(
            f"{BASE_URL}/upload/tender/{tender_id}",
            files=files
        )
    
    print(f"Upload Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ {filename} uploaded successfully: {result.get('message')}")
        uploaded_files = result.get('files', [])
        if uploaded_files:
            return uploaded_files[0]
        else:
            print("❌ No file information returned")
            return None
    else:
        print(f"❌ Failed to upload {filename}: {response.text}")
        return None

def upload_file_to_contract(session, contract_id, file_info, filename):
    """Upload file to contract"""
    print(f"\n--- Uploading {filename} to contract ---")
    
    with open(file_info['path'], 'rb') as f:
        files = {'files': (filename, f, 'image/png')}
        
        response = session.post(
            f"{BASE_URL}/upload/contract/{contract_id}",
            files=files
        )
    
    print(f"Upload Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ {filename} uploaded successfully: {result.get('message')}")
        uploaded_files = result.get('files', [])
        if uploaded_files:
            return uploaded_files[0]
        else:
            print("❌ No file information returned")
            return None
    else:
        print(f"❌ Failed to upload {filename}: {response.text}")
        return None

def verify_file_storage(entity_id, module, filenames):
    """Verify files are stored in correct directory"""
    print(f"\n--- Verifying file storage ---")
    
    dir_check = subprocess.run(
        ['ls', '-la', f'/app/backend/uploads/{module}/{entity_id}/'],
        capture_output=True, text=True
    )
    
    if dir_check.returncode == 0:
        print(f"✅ {module.title()} upload directory exists")
        print(f"Directory contents:\n{dir_check.stdout}")
        
        # Check if all files exist
        all_found = True
        for filename in filenames:
            if filename not in dir_check.stdout:
                print(f"❌ File {filename} not found in directory")
                all_found = False
        
        if all_found:
            print(f"✅ All files stored correctly in /app/backend/uploads/{module}/{entity_id}/")
            return True
        else:
            return False
    else:
        print(f"❌ {module.title()} upload directory not found: {dir_check.stderr}")
        return False

def verify_metadata_in_db(session, module, entity_id, expected_count):
    """Verify metadata is stored in MongoDB"""
    print(f"\n--- Verifying metadata in MongoDB ---")
    
    response = session.get(f"{BASE_URL}/{module}/{entity_id}")
    
    if response.status_code == 200:
        entity = response.json()
        attachments = entity.get('attachments', [])
        
        if len(attachments) >= expected_count:
            print(f"✅ Metadata stored in MongoDB: {len(attachments)} attachments found")
            for attachment in attachments:
                print(f"  - {attachment.get('filename')} ({attachment.get('size')} bytes)")
            return True
        else:
            print(f"❌ Expected {expected_count} attachments, found {len(attachments)}")
            return False
    else:
        print(f"❌ Failed to retrieve {module} for metadata check: {response.text}")
        return False

def test_file_download(session, module, entity_id, filename, expected_content):
    """Test file download functionality"""
    print(f"\n--- Testing file download ---")
    
    response = session.get(f"{BASE_URL}/download/{module}/{entity_id}/{filename}")
    print(f"Download Status: {response.status_code}")
    
    if response.status_code == 200:
        print(f"✅ File downloaded successfully ({len(response.content)} bytes)")
        
        # Verify content matches
        if response.content == expected_content:
            print(f"✅ Downloaded content matches original file")
            return True
        else:
            print(f"❌ Downloaded content doesn't match original")
            return False
    else:
        print(f"❌ Failed to download file: {response.text}")
        return False

if __name__ == "__main__":
    success = test_comprehensive_file_attachment()
    exit(0 if success else 1)