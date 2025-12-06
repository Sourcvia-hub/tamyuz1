#!/usr/bin/env python3
"""
File Attachment Feature Testing Script
Tests file upload functionality across all modules (Vendors, Tenders, Contracts, Purchase Orders, Invoices, Resources)
"""

import requests
import json
import tempfile
import os
import subprocess
from datetime import datetime, timedelta, timezone
import sys

# Configuration
BASE_URL = "https://procure-hub-14.preview.emergentagent.com/api"
TEST_USER = {"email": "procurement@test.com", "password": "password"}

class FileAttachmentTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/json'
        })
        self.created_entities = {
            'vendors': [],
            'tenders': [],
            'contracts': [],
            'purchase_orders': [],
            'invoices': [],
            'resources': []
        }
        
    def login(self):
        """Login with test user"""
        print(f"\n=== LOGIN TEST ===")
        
        login_data = {
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        }
        
        try:
            # Set content type for login
            self.session.headers.update({'Content-Type': 'application/json'})
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            print(f"Login Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Login successful for {TEST_USER['email']}")
                print(f"User role: {data.get('user', {}).get('role', 'Unknown')}")
                return True
            else:
                print(f"❌ Login failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    def create_test_files(self):
        """Create temporary test files for upload"""
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
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test PDF Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000074 00000 n 
0000000120 00000 n 
0000000179 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
274
%%EOF"""
        
        # Create a simple PNG test file (1x1 pixel)
        png_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82'
        
        # Create temporary files
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as pdf_file:
            pdf_file.write(pdf_content)
            test_files['pdf'] = {'path': pdf_file.name, 'content': pdf_content}
            
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as png_file:
            png_file.write(png_content)
            test_files['png'] = {'path': png_file.name, 'content': png_content}
        
        return test_files
    
    def cleanup_test_files(self, test_files):
        """Clean up temporary test files"""
        for file_info in test_files.values():
            try:
                os.unlink(file_info['path'])
            except:
                pass
    
    def test_vendor_file_upload(self, test_files):
        """Test file upload for vendors"""
        print(f"\n=== VENDOR FILE UPLOAD TEST ===")
        
        # Create a test vendor
        vendor_data = {
            "name_english": "File Test Vendor",
            "commercial_name": "FileTest Co",
            "vendor_type": "local",
            "entity_type": "LLC",
            "vat_number": "300123456789100",
            "cr_number": "1010123500",
            "cr_expiry_date": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
            "cr_country_city": "Riyadh, Saudi Arabia",
            "activity_description": "File Testing Services",
            "number_of_employees": 10,
            "street": "Test Street",
            "building_no": "100",
            "city": "Riyadh",
            "district": "Test District",
            "country": "Saudi Arabia",
            "mobile": "+966501234599",
            "email": "contact@filetest.com",
            "representative_name": "Test Representative",
            "representative_designation": "Manager",
            "representative_id_type": "National ID",
            "representative_id_number": "9999999999",
            "representative_nationality": "Saudi",
            "representative_mobile": "+966501234599",
            "representative_email": "rep@filetest.com",
            "bank_account_name": "File Test Vendor",
            "bank_name": "Test Bank",
            "bank_branch": "Test Branch",
            "bank_country": "Saudi Arabia",
            "iban": "SA0310000000123456789099",
            "currency": "SAR",
            "swift_code": "TESTBANK"
        }
        
        try:
            # Create vendor
            self.session.headers.update({'Content-Type': 'application/json'})
            vendor_response = self.session.post(f"{BASE_URL}/vendors", json=vendor_data)
            print(f"Create Test Vendor Status: {vendor_response.status_code}")
            
            if vendor_response.status_code != 200:
                print(f"❌ Failed to create test vendor: {vendor_response.text}")
                return False
            
            vendor = vendor_response.json()
            vendor_id = vendor.get('id')
            print(f"✅ Test vendor created: {vendor.get('name_english')} (ID: {vendor_id})")
            self.created_entities['vendors'].append(vendor_id)
            
            # Upload PDF file to vendor
            print(f"\n--- Uploading PDF file to vendor ---")
            with open(test_files['pdf']['path'], 'rb') as pdf_file:
                files = {'files': ('test_document.pdf', pdf_file, 'application/pdf')}
                data = {'file_type': 'supporting_documents'}
                
                # Remove Content-Type header for multipart upload
                headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
                
                upload_response = self.session.post(
                    f"{BASE_URL}/upload/vendor/{vendor_id}",
                    files=files,
                    data=data,
                    headers=headers
                )
                
            print(f"Upload PDF to Vendor Status: {upload_response.status_code}")
            
            if upload_response.status_code == 200:
                upload_result = upload_response.json()
                print(f"✅ PDF uploaded successfully: {upload_result.get('message')}")
                uploaded_files = upload_result.get('files', [])
                if uploaded_files:
                    pdf_filename = uploaded_files[0].get('stored_filename')
                    print(f"Stored filename: {pdf_filename}")
                else:
                    print("❌ No file information returned")
                    return False
            else:
                print(f"❌ Failed to upload PDF: {upload_response.text}")
                return False
            
            # Upload PNG file to vendor
            print(f"\n--- Uploading PNG file to vendor ---")
            with open(test_files['png']['path'], 'rb') as png_file:
                files = {'files': ('test_image.png', png_file, 'image/png')}
                data = {'file_type': 'supporting_documents'}
                
                upload_response2 = self.session.post(
                    f"{BASE_URL}/upload/vendor/{vendor_id}",
                    files=files,
                    data=data,
                    headers=headers
                )
                
            print(f"Upload PNG to Vendor Status: {upload_response2.status_code}")
            
            if upload_response2.status_code == 200:
                upload_result2 = upload_response2.json()
                print(f"✅ PNG uploaded successfully: {upload_result2.get('message')}")
                uploaded_files2 = upload_result2.get('files', [])
                if uploaded_files2:
                    png_filename = uploaded_files2[0].get('stored_filename')
                    print(f"Stored filename: {png_filename}")
                else:
                    print("❌ No file information returned")
                    return False
            else:
                print(f"❌ Failed to upload PNG: {upload_response2.text}")
                return False
            
            # Verify files are stored in correct directory
            print(f"\n--- Verifying file storage ---")
            vendor_dir_check = subprocess.run(
                ['ls', '-la', f'/app/backend/uploads/vendors/{vendor_id}/'],
                capture_output=True, text=True
            )
            
            if vendor_dir_check.returncode == 0:
                print(f"✅ Vendor upload directory exists")
                print(f"Directory contents:\n{vendor_dir_check.stdout}")
                
                # Check if files exist
                if pdf_filename in vendor_dir_check.stdout and png_filename in vendor_dir_check.stdout:
                    print(f"✅ Both files stored correctly in /app/backend/uploads/vendors/{vendor_id}/")
                else:
                    print(f"❌ Files not found in directory")
                    return False
            else:
                print(f"❌ Vendor upload directory not found: {vendor_dir_check.stderr}")
                return False
            
            # Verify metadata is stored in MongoDB
            print(f"\n--- Verifying metadata in MongoDB ---")
            self.session.headers.update({'Content-Type': 'application/json'})
            vendor_check = self.session.get(f"{BASE_URL}/vendors/{vendor_id}")
            
            if vendor_check.status_code == 200:
                updated_vendor = vendor_check.json()
                attachments = updated_vendor.get('attachments', [])
                
                if len(attachments) >= 2:
                    print(f"✅ Metadata stored in MongoDB: {len(attachments)} attachments found")
                    for attachment in attachments:
                        print(f"  - {attachment.get('filename')} ({attachment.get('size')} bytes)")
                else:
                    print(f"❌ Expected 2 attachments, found {len(attachments)}")
                    return False
            else:
                print(f"❌ Failed to retrieve vendor for metadata check: {vendor_check.text}")
                return False
            
            # Test file download
            print(f"\n--- Testing file download ---")
            download_response = self.session.get(f"{BASE_URL}/download/vendors/{vendor_id}/{pdf_filename}")
            print(f"Download PDF Status: {download_response.status_code}")
            
            if download_response.status_code == 200:
                print(f"✅ PDF file downloaded successfully ({len(download_response.content)} bytes)")
                
                # Verify content matches
                if download_response.content == test_files['pdf']['content']:
                    print(f"✅ Downloaded content matches original file")
                else:
                    print(f"❌ Downloaded content doesn't match original")
                    return False
            else:
                print(f"❌ Failed to download PDF: {download_response.text}")
                return False
            
            return True
            
        except Exception as e:
            print(f"❌ Vendor file upload test error: {str(e)}")
            return False
    
    def test_tender_file_upload(self, test_files):
        """Test file upload for tenders"""
        print(f"\n=== TENDER FILE UPLOAD TEST ===")
        
        tender_data = {
            "title": "File Test Tender",
            "description": "Tender for testing file uploads",
            "project_name": "File Upload Test Project",
            "requirements": "Must support file attachments",
            "budget": 100000.0,
            "deadline": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            "invited_vendors": []
        }
        
        try:
            # Create tender
            self.session.headers.update({'Content-Type': 'application/json'})
            tender_response = self.session.post(f"{BASE_URL}/tenders", json=tender_data)
            print(f"Create Test Tender Status: {tender_response.status_code}")
            
            if tender_response.status_code != 200:
                print(f"❌ Failed to create test tender: {tender_response.text}")
                return False
            
            tender = tender_response.json()
            tender_id = tender.get('id')
            print(f"✅ Test tender created: {tender.get('title')} (ID: {tender_id})")
            self.created_entities['tenders'].append(tender_id)
            
            # Upload file to tender
            with open(test_files['pdf']['path'], 'rb') as pdf_file:
                files = {'files': ('tender_requirements.pdf', pdf_file, 'application/pdf')}
                
                # Remove Content-Type header for multipart upload
                headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
                
                upload_response = self.session.post(
                    f"{BASE_URL}/upload/tender/{tender_id}",
                    files=files,
                    headers=headers
                )
                
            print(f"Upload PDF to Tender Status: {upload_response.status_code}")
            
            if upload_response.status_code == 200:
                upload_result = upload_response.json()
                print(f"✅ PDF uploaded to tender successfully: {upload_result.get('message')}")
                
                # Verify file storage
                tender_dir_check = subprocess.run(
                    ['ls', '-la', f'/app/backend/uploads/tenders/{tender_id}/'],
                    capture_output=True, text=True
                )
                
                if tender_dir_check.returncode == 0:
                    print(f"✅ Tender upload directory exists")
                    print(f"Directory contents:\n{tender_dir_check.stdout}")
                else:
                    print(f"❌ Tender upload directory not found: {tender_dir_check.stderr}")
                    return False
                
                return True
            else:
                print(f"❌ Failed to upload PDF to tender: {upload_response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Tender file upload test error: {str(e)}")
            return False
    
    def test_contract_file_upload(self, test_files):
        """Test file upload for contracts"""
        print(f"\n=== CONTRACT FILE UPLOAD TEST ===")
        
        # Need vendor and tender for contract creation
        if not self.created_entities['vendors'] or not self.created_entities['tenders']:
            print(f"❌ Need vendors and tenders for contract testing")
            return False
        
        vendor_id = self.created_entities['vendors'][0]
        tender_id = self.created_entities['tenders'][0]
        
        contract_data = {
            "tender_id": tender_id,
            "vendor_id": vendor_id,
            "title": "File Test Contract",
            "sow": "Contract for testing file uploads",
            "sla": "Standard SLA with file attachment support",
            "value": 80000.0,
            "start_date": datetime.now(timezone.utc).isoformat(),
            "end_date": (datetime.now(timezone.utc) + timedelta(days=180)).isoformat(),
            "milestones": []
        }
        
        try:
            # Create contract
            self.session.headers.update({'Content-Type': 'application/json'})
            contract_response = self.session.post(f"{BASE_URL}/contracts", json=contract_data)
            print(f"Create Test Contract Status: {contract_response.status_code}")
            
            if contract_response.status_code != 200:
                print(f"❌ Failed to create test contract: {contract_response.text}")
                return False
            
            contract = contract_response.json()
            contract_id = contract.get('id')
            print(f"✅ Test contract created: {contract.get('title')} (ID: {contract_id})")
            self.created_entities['contracts'].append(contract_id)
            
            # Upload file to contract
            with open(test_files['png']['path'], 'rb') as png_file:
                files = {'files': ('contract_diagram.png', png_file, 'image/png')}
                
                # Remove Content-Type header for multipart upload
                headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
                
                upload_response = self.session.post(
                    f"{BASE_URL}/upload/contract/{contract_id}",
                    files=files,
                    headers=headers
                )
                
            print(f"Upload PNG to Contract Status: {upload_response.status_code}")
            
            if upload_response.status_code == 200:
                upload_result = upload_response.json()
                print(f"✅ PNG uploaded to contract successfully: {upload_result.get('message')}")
                
                # Verify file storage
                contract_dir_check = subprocess.run(
                    ['ls', '-la', f'/app/backend/uploads/contracts/{contract_id}/'],
                    capture_output=True, text=True
                )
                
                if contract_dir_check.returncode == 0:
                    print(f"✅ Contract upload directory exists")
                    print(f"Directory contents:\n{contract_dir_check.stdout}")
                else:
                    print(f"❌ Contract upload directory not found: {contract_dir_check.stderr}")
                    return False
                
                return True
            else:
                print(f"❌ Failed to upload PNG to contract: {upload_response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Contract file upload test error: {str(e)}")
            return False
    
    def test_purchase_order_file_upload(self, test_files):
        """Test file upload for purchase orders"""
        print(f"\n=== PURCHASE ORDER FILE UPLOAD TEST ===")
        
        # Need vendor for PO creation
        if not self.created_entities['vendors']:
            print(f"❌ Need vendors for purchase order testing")
            return False
        
        vendor_id = self.created_entities['vendors'][0]
        
        po_data = {
            "vendor_id": vendor_id,
            "items": [
                {
                    "name": "Test Item",
                    "description": "Test item for file upload",
                    "quantity": 1,
                    "price": 1000.0,
                    "total": 1000.0
                }
            ],
            "total_amount": 1000.0,
            "delivery_time": "30 days",
            "risk_level": "low",
            "has_data_access": False,
            "has_onsite_presence": False,
            "has_implementation": False,
            "duration_more_than_year": False,
            "amount_over_million": False,
            "requires_contract": False
        }
        
        try:
            # Create purchase order
            self.session.headers.update({'Content-Type': 'application/json'})
            po_response = self.session.post(f"{BASE_URL}/purchase-orders", json=po_data)
            print(f"Create Test Purchase Order Status: {po_response.status_code}")
            
            if po_response.status_code != 200:
                print(f"❌ Failed to create test purchase order: {po_response.text}")
                return False
            
            po = po_response.json()
            po_id = po.get('id')
            print(f"✅ Test purchase order created: {po.get('po_number')} (ID: {po_id})")
            self.created_entities['purchase_orders'].append(po_id)
            
            # Upload file to purchase order
            with open(test_files['pdf']['path'], 'rb') as pdf_file:
                files = {'files': ('po_specifications.pdf', pdf_file, 'application/pdf')}
                
                # Remove Content-Type header for multipart upload
                headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
                
                upload_response = self.session.post(
                    f"{BASE_URL}/upload/purchase-order/{po_id}",
                    files=files,
                    headers=headers
                )
                
            print(f"Upload PDF to Purchase Order Status: {upload_response.status_code}")
            
            if upload_response.status_code == 200:
                upload_result = upload_response.json()
                print(f"✅ PDF uploaded to purchase order successfully: {upload_result.get('message')}")
                
                # Verify file storage
                po_dir_check = subprocess.run(
                    ['ls', '-la', f'/app/backend/uploads/purchase_orders/{po_id}/'],
                    capture_output=True, text=True
                )
                
                if po_dir_check.returncode == 0:
                    print(f"✅ Purchase order upload directory exists")
                    print(f"Directory contents:\n{po_dir_check.stdout}")
                else:
                    print(f"❌ Purchase order upload directory not found: {po_dir_check.stderr}")
                    return False
                
                return True
            else:
                print(f"❌ Failed to upload PDF to purchase order: {upload_response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Purchase order file upload test error: {str(e)}")
            return False
    
    def test_invoice_file_upload(self, test_files):
        """Test file upload for invoices"""
        print(f"\n=== INVOICE FILE UPLOAD TEST ===")
        
        # Need contract and vendor for invoice creation
        if not self.created_entities['contracts'] or not self.created_entities['vendors']:
            print(f"❌ Need contracts and vendors for invoice testing")
            return False
        
        contract_id = self.created_entities['contracts'][0]
        vendor_id = self.created_entities['vendors'][0]
        
        invoice_data = {
            "contract_id": contract_id,
            "vendor_id": vendor_id,
            "amount": 25000.0,
            "description": "Test invoice for file upload",
            "milestone_reference": "Test milestone"
        }
        
        try:
            # Create invoice
            self.session.headers.update({'Content-Type': 'application/json'})
            invoice_response = self.session.post(f"{BASE_URL}/invoices", json=invoice_data)
            print(f"Create Test Invoice Status: {invoice_response.status_code}")
            
            if invoice_response.status_code != 200:
                print(f"❌ Failed to create test invoice: {invoice_response.text}")
                return False
            
            invoice = invoice_response.json()
            invoice_id = invoice.get('id')
            print(f"✅ Test invoice created: {invoice.get('invoice_number')} (ID: {invoice_id})")
            self.created_entities['invoices'].append(invoice_id)
            
            # Upload file to invoice
            with open(test_files['pdf']['path'], 'rb') as pdf_file:
                files = {'files': ('invoice_receipt.pdf', pdf_file, 'application/pdf')}
                
                # Remove Content-Type header for multipart upload
                headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
                
                upload_response = self.session.post(
                    f"{BASE_URL}/upload/invoice/{invoice_id}",
                    files=files,
                    headers=headers
                )
                
            print(f"Upload PDF to Invoice Status: {upload_response.status_code}")
            
            if upload_response.status_code == 200:
                upload_result = upload_response.json()
                print(f"✅ PDF uploaded to invoice successfully: {upload_result.get('message')}")
                
                # Verify file storage
                invoice_dir_check = subprocess.run(
                    ['ls', '-la', f'/app/backend/uploads/invoices/{invoice_id}/'],
                    capture_output=True, text=True
                )
                
                if invoice_dir_check.returncode == 0:
                    print(f"✅ Invoice upload directory exists")
                    print(f"Directory contents:\n{invoice_dir_check.stdout}")
                else:
                    print(f"❌ Invoice upload directory not found: {invoice_dir_check.stderr}")
                    return False
                
                return True
            else:
                print(f"❌ Failed to upload PDF to invoice: {upload_response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Invoice file upload test error: {str(e)}")
            return False
    
    def test_resource_file_upload(self, test_files):
        """Test file upload for resources"""
        print(f"\n=== RESOURCE FILE UPLOAD TEST ===")
        
        # Need contract and vendor for resource creation
        if not self.created_entities['contracts'] or not self.created_entities['vendors']:
            print(f"❌ Need contracts and vendors for resource testing")
            return False
        
        contract_id = self.created_entities['contracts'][0]
        vendor_id = self.created_entities['vendors'][0]
        
        resource_data = {
            "contract_id": contract_id,
            "vendor_id": vendor_id,
            "name": "Test Resource",
            "nationality": "Saudi",
            "id_number": "1234567890",
            "education_qualification": "Bachelor's Degree",
            "years_of_experience": 5.0,
            "work_type": "on_premises",
            "start_date": datetime.now(timezone.utc).isoformat(),
            "end_date": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
            "access_development": True,
            "access_production": False,
            "access_uat": True,
            "scope_of_work": "Software development and testing",
            "has_relatives": False,
            "relatives": []
        }
        
        try:
            # Create resource
            self.session.headers.update({'Content-Type': 'application/json'})
            resource_response = self.session.post(f"{BASE_URL}/resources", json=resource_data)
            print(f"Create Test Resource Status: {resource_response.status_code}")
            
            if resource_response.status_code != 200:
                print(f"❌ Failed to create test resource: {resource_response.text}")
                return False
            
            resource = resource_response.json()
            resource_id = resource.get('id')
            print(f"✅ Test resource created: {resource.get('name')} (ID: {resource_id})")
            self.created_entities['resources'].append(resource_id)
            
            # Upload file to resource
            with open(test_files['png']['path'], 'rb') as png_file:
                files = {'files': ('resource_photo.png', png_file, 'image/png')}
                
                # Remove Content-Type header for multipart upload
                headers = {k: v for k, v in self.session.headers.items() if k.lower() != 'content-type'}
                
                upload_response = self.session.post(
                    f"{BASE_URL}/upload/resource/{resource_id}",
                    files=files,
                    headers=headers
                )
                
            print(f"Upload PNG to Resource Status: {upload_response.status_code}")
            
            if upload_response.status_code == 200:
                upload_result = upload_response.json()
                print(f"✅ PNG uploaded to resource successfully: {upload_result.get('message')}")
                
                # Verify file storage
                resource_dir_check = subprocess.run(
                    ['ls', '-la', f'/app/backend/uploads/resources/{resource_id}/'],
                    capture_output=True, text=True
                )
                
                if resource_dir_check.returncode == 0:
                    print(f"✅ Resource upload directory exists")
                    print(f"Directory contents:\n{resource_dir_check.stdout}")
                else:
                    print(f"❌ Resource upload directory not found: {resource_dir_check.stderr}")
                    return False
                
                return True
            else:
                print(f"❌ Failed to upload PNG to resource: {upload_response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Resource file upload test error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all file attachment tests"""
        print("=" * 80)
        print("FILE ATTACHMENT FEATURE TESTING")
        print("=" * 80)
        
        # Login first
        if not self.login():
            print("❌ Login failed - cannot proceed with tests")
            return False
        
        # Create test files
        test_files = self.create_test_files()
        
        try:
            # Run all tests
            tests = [
                ("Vendor File Upload", self.test_vendor_file_upload),
                ("Tender File Upload", self.test_tender_file_upload),
                ("Contract File Upload", self.test_contract_file_upload),
                ("Purchase Order File Upload", self.test_purchase_order_file_upload),
                ("Invoice File Upload", self.test_invoice_file_upload),
                ("Resource File Upload", self.test_resource_file_upload)
            ]
            
            results = {}
            passed = 0
            total = len(tests)
            
            for test_name, test_func in tests:
                print(f"\n{'='*60}")
                print(f"RUNNING: {test_name}")
                print(f"{'='*60}")
                
                try:
                    result = test_func(test_files)
                    results[test_name] = result
                    if result:
                        passed += 1
                        print(f"✅ {test_name}: PASSED")
                    else:
                        print(f"❌ {test_name}: FAILED")
                except Exception as e:
                    print(f"❌ {test_name}: ERROR - {str(e)}")
                    results[test_name] = False
            
            # Print summary
            print(f"\n{'='*80}")
            print("FILE ATTACHMENT TEST SUMMARY")
            print(f"{'='*80}")
            print(f"Total Tests: {total}")
            print(f"Passed: {passed}")
            print(f"Failed: {total - passed}")
            print(f"Success Rate: {(passed/total)*100:.1f}%")
            
            print(f"\nDETAILED RESULTS:")
            for test_name, result in results.items():
                status = "✅ PASSED" if result else "❌ FAILED"
                print(f"  {test_name}: {status}")
            
            print(f"\nCREATED ENTITIES:")
            for entity_type, entities in self.created_entities.items():
                print(f"  {entity_type}: {len(entities)} created")
            
            return passed == total
            
        finally:
            # Clean up test files
            self.cleanup_test_files(test_files)

if __name__ == "__main__":
    tester = FileAttachmentTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)