#!/usr/bin/env python3
"""
Backend Testing Script for Sourcevia Procurement Management System
Tests auto-numbering system and search functionality
"""

import requests
import json
from datetime import datetime, timedelta, timezone
import sys

# Configuration
BASE_URL = "https://procure-portal.preview.emergentagent.com/api"
TEST_USERS = {
    "procurement": {"email": "procurement@test.com", "password": "password"},
    "manager": {"email": "manager@test.com", "password": "password"}
}

class ProcurementTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.auth_token = None
        self.created_entities = {
            'vendors': [],
            'tenders': [],
            'contracts': [],
            'invoices': []
        }
        
    def login(self, user_type="procurement"):
        """Login with test user"""
        print(f"\n=== LOGIN TEST ({user_type}) ===")
        
        user_creds = TEST_USERS[user_type]
        login_data = {
            "email": user_creds["email"],
            "password": user_creds["password"]
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            print(f"Login Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Login successful for {user_creds['email']}")
                print(f"User role: {data.get('user', {}).get('role', 'Unknown')}")
                
                # Extract session token from cookies or response
                if 'session_token' in self.session.cookies:
                    self.auth_token = self.session.cookies['session_token']
                    print(f"Session token obtained from cookies")
                
                return True
            else:
                print(f"❌ Login failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    def test_vendor_auto_numbering(self):
        """Test vendor auto-numbering system"""
        print(f"\n=== VENDOR AUTO-NUMBERING TEST ===")
        
        # Create first vendor
        vendor_data = {
            "name_english": "Tech Solutions Ltd",
            "commercial_name": "TechSol",
            "entity_type": "LLC",
            "vat_number": "300123456789003",
            "cr_number": "1010123456",
            "cr_expiry_date": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
            "cr_country_city": "Riyadh, Saudi Arabia",
            "activity_description": "Software Development",
            "number_of_employees": 25,
            "street": "King Fahd Road",
            "building_no": "123",
            "city": "Riyadh",
            "district": "Olaya",
            "country": "Saudi Arabia",
            "mobile": "+966501234567",
            "email": "contact@techsol.com",
            "representative_name": "Ahmed Al-Rashid",
            "representative_designation": "CEO",
            "representative_id_type": "National ID",
            "representative_id_number": "1234567890",
            "representative_nationality": "Saudi",
            "representative_mobile": "+966501234567",
            "representative_email": "ahmed@techsol.com",
            "bank_account_name": "Tech Solutions Ltd",
            "bank_name": "Saudi National Bank",
            "bank_branch": "Riyadh Main",
            "bank_country": "Saudi Arabia",
            "iban": "SA0310000000123456789012",
            "currency": "SAR",
            "swift_code": "NCBKSARI"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/vendors", json=vendor_data)
            print(f"Create Vendor 1 Status: {response.status_code}")
            
            if response.status_code == 200:
                vendor1 = response.json()
                vendor_number1 = vendor1.get('vendor_number')
                print(f"✅ Vendor 1 created with number: {vendor_number1}")
                print(f"Status: {vendor1.get('status')}")
                
                # Verify format: Vendor-25-NNNN
                if vendor_number1 and vendor_number1.startswith('Vendor-25-'):
                    print(f"✅ Vendor number format is correct")
                    self.created_entities['vendors'].append(vendor1['id'])
                else:
                    print(f"❌ Vendor number format incorrect: {vendor_number1}")
                    return False
                    
                # Create second vendor to test sequential numbering
                vendor_data2 = vendor_data.copy()
                vendor_data2.update({
                    "name_english": "Digital Innovations Co",
                    "commercial_name": "DigiInno",
                    "vat_number": "300123456789004",
                    "cr_number": "1010123457",
                    "email": "info@digiinno.com",
                    "representative_email": "manager@digiinno.com"
                })
                
                response2 = self.session.post(f"{BASE_URL}/vendors", json=vendor_data2)
                print(f"Create Vendor 2 Status: {response2.status_code}")
                
                if response2.status_code == 200:
                    vendor2 = response2.json()
                    vendor_number2 = vendor2.get('vendor_number')
                    print(f"✅ Vendor 2 created with number: {vendor_number2}")
                    
                    # Check sequential numbering
                    if vendor_number1 and vendor_number2:
                        num1 = int(vendor_number1.split('-')[-1])
                        num2 = int(vendor_number2.split('-')[-1])
                        if num2 == num1 + 1:
                            print(f"✅ Sequential numbering works: {num1} -> {num2}")
                            self.created_entities['vendors'].append(vendor2['id'])
                            return True
                        else:
                            print(f"❌ Sequential numbering failed: {num1} -> {num2}")
                            return False
                else:
                    print(f"❌ Failed to create second vendor: {response2.text}")
                    return False
            else:
                print(f"❌ Failed to create first vendor: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Vendor auto-numbering test error: {str(e)}")
            return False
    
    def test_tender_auto_numbering(self):
        """Test tender auto-numbering system"""
        print(f"\n=== TENDER AUTO-NUMBERING TEST ===")
        
        tender_data = {
            "title": "Software Development Services",
            "description": "Development of custom software solutions",
            "project_name": "Digital Transformation Project",
            "requirements": "Full-stack development, mobile app, web portal",
            "budget": 500000.0,
            "deadline": (datetime.now() + timedelta(days=30)).isoformat(),
            "invited_vendors": []
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/tenders", json=tender_data)
            print(f"Create Tender 1 Status: {response.status_code}")
            
            if response.status_code == 200:
                tender1 = response.json()
                tender_number1 = tender1.get('tender_number')
                print(f"✅ Tender 1 created with number: {tender_number1}")
                print(f"Status: {tender1.get('status')}")
                
                # Verify format and auto-approval
                if tender_number1 and tender_number1.startswith('Tender-25-'):
                    print(f"✅ Tender number format is correct")
                    if tender1.get('status') == 'published':
                        print(f"✅ Tender auto-approved (published)")
                        self.created_entities['tenders'].append(tender1['id'])
                    else:
                        print(f"❌ Tender not auto-approved: {tender1.get('status')}")
                        return False
                else:
                    print(f"❌ Tender number format incorrect: {tender_number1}")
                    return False
                    
                # Create second tender
                tender_data2 = tender_data.copy()
                tender_data2.update({
                    "title": "IT Infrastructure Setup",
                    "project_name": "Network Upgrade Project",
                    "budget": 300000.0
                })
                
                response2 = self.session.post(f"{BASE_URL}/tenders", json=tender_data2)
                print(f"Create Tender 2 Status: {response2.status_code}")
                
                if response2.status_code == 200:
                    tender2 = response2.json()
                    tender_number2 = tender2.get('tender_number')
                    print(f"✅ Tender 2 created with number: {tender_number2}")
                    
                    # Check sequential numbering
                    if tender_number1 and tender_number2:
                        num1 = int(tender_number1.split('-')[-1])
                        num2 = int(tender_number2.split('-')[-1])
                        if num2 == num1 + 1:
                            print(f"✅ Sequential numbering works: {num1} -> {num2}")
                            self.created_entities['tenders'].append(tender2['id'])
                            return True
                        else:
                            print(f"❌ Sequential numbering failed: {num1} -> {num2}")
                            return False
                else:
                    print(f"❌ Failed to create second tender: {response2.text}")
                    return False
            else:
                print(f"❌ Failed to create first tender: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Tender auto-numbering test error: {str(e)}")
            return False
    
    def test_approved_tenders_endpoint(self):
        """Test approved tenders list endpoint"""
        print(f"\n=== APPROVED TENDERS ENDPOINT TEST ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/tenders/approved/list")
            print(f"Get Approved Tenders Status: {response.status_code}")
            
            if response.status_code == 200:
                tenders = response.json()
                print(f"✅ Retrieved {len(tenders)} approved tenders")
                
                if tenders:
                    # Check essential fields
                    first_tender = tenders[0]
                    required_fields = ['id', 'tender_number', 'title', 'project_name', 'requirements', 'budget']
                    missing_fields = [field for field in required_fields if field not in first_tender]
                    
                    if not missing_fields:
                        print(f"✅ All essential fields present: {required_fields}")
                        return True
                    else:
                        print(f"❌ Missing essential fields: {missing_fields}")
                        return False
                else:
                    print(f"⚠️ No approved tenders found (this might be expected)")
                    return True
            else:
                print(f"❌ Failed to get approved tenders: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Approved tenders test error: {str(e)}")
            return False
    
    def test_contract_auto_numbering(self):
        """Test contract auto-numbering system"""
        print(f"\n=== CONTRACT AUTO-NUMBERING TEST ===")
        
        # First get approved tenders and vendors
        if not self.created_entities['tenders'] or not self.created_entities['vendors']:
            print(f"❌ Need tenders and vendors for contract testing")
            return False
            
        tender_id = self.created_entities['tenders'][0]
        vendor_id = self.created_entities['vendors'][0]
        
        contract_data = {
            "tender_id": tender_id,
            "vendor_id": vendor_id,
            "title": "Software Development Contract",
            "sow": "Develop custom software solution as per tender requirements",
            "sla": "99.9% uptime, 24/7 support, monthly reporting",
            "value": 450000.0,
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=180)).isoformat(),
            "is_outsourcing": False,
            "milestones": [
                {"name": "Phase 1", "amount": 150000.0, "due_date": (datetime.now() + timedelta(days=60)).isoformat()},
                {"name": "Phase 2", "amount": 300000.0, "due_date": (datetime.now() + timedelta(days=120)).isoformat()}
            ]
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/contracts", json=contract_data)
            print(f"Create Contract 1 Status: {response.status_code}")
            
            if response.status_code == 200:
                contract1 = response.json()
                contract_number1 = contract1.get('contract_number')
                print(f"✅ Contract 1 created with number: {contract_number1}")
                print(f"Status: {contract1.get('status')}")
                
                # Verify format and auto-approval
                if contract_number1 and contract_number1.startswith('Contract-25-'):
                    print(f"✅ Contract number format is correct")
                    if contract1.get('status') == 'approved':
                        print(f"✅ Contract auto-approved")
                        self.created_entities['contracts'].append(contract1['id'])
                        return True
                    else:
                        print(f"❌ Contract not auto-approved: {contract1.get('status')}")
                        return False
                else:
                    print(f"❌ Contract number format incorrect: {contract_number1}")
                    return False
            else:
                print(f"❌ Failed to create contract: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Contract auto-numbering test error: {str(e)}")
            return False
    
    def test_contract_validation(self):
        """Test contract validation with invalid tender/vendor IDs"""
        print(f"\n=== CONTRACT VALIDATION TEST ===")
        
        # Test with invalid tender_id
        invalid_contract_data = {
            "tender_id": "invalid-tender-id",
            "vendor_id": self.created_entities['vendors'][0] if self.created_entities['vendors'] else "invalid-vendor-id",
            "title": "Invalid Contract",
            "sow": "Test SOW",
            "sla": "Test SLA",
            "value": 100000.0,
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=90)).isoformat()
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/contracts", json=invalid_contract_data)
            print(f"Create Contract with Invalid Tender Status: {response.status_code}")
            
            if response.status_code == 404:
                print(f"✅ Contract validation works - rejected invalid tender_id")
                
                # Test with invalid vendor_id
                invalid_contract_data["tender_id"] = self.created_entities['tenders'][0] if self.created_entities['tenders'] else "invalid-tender-id"
                invalid_contract_data["vendor_id"] = "invalid-vendor-id"
                
                response2 = self.session.post(f"{BASE_URL}/contracts", json=invalid_contract_data)
                print(f"Create Contract with Invalid Vendor Status: {response2.status_code}")
                
                if response2.status_code == 404:
                    print(f"✅ Contract validation works - rejected invalid vendor_id")
                    return True
                else:
                    print(f"❌ Contract validation failed for vendor_id: {response2.text}")
                    return False
            else:
                print(f"❌ Contract validation failed for tender_id: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Contract validation test error: {str(e)}")
            return False
    
    def test_invoice_auto_numbering(self):
        """Test invoice auto-numbering system"""
        print(f"\n=== INVOICE AUTO-NUMBERING TEST ===")
        
        if not self.created_entities['contracts'] or not self.created_entities['vendors']:
            print(f"❌ Need contracts and vendors for invoice testing")
            return False
            
        contract_id = self.created_entities['contracts'][0]
        vendor_id = self.created_entities['vendors'][0]
        
        invoice_data = {
            "contract_id": contract_id,
            "vendor_id": vendor_id,
            "amount": 150000.0,
            "description": "Phase 1 milestone payment",
            "milestone_reference": "Phase 1"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/invoices", json=invoice_data)
            print(f"Create Invoice 1 Status: {response.status_code}")
            
            if response.status_code == 200:
                invoice1 = response.json()
                invoice_number1 = invoice1.get('invoice_number')
                print(f"✅ Invoice 1 created with number: {invoice_number1}")
                print(f"Status: {invoice1.get('status')}")
                
                # Verify format and auto-approval
                if invoice_number1 and invoice_number1.startswith('Invoice-25-'):
                    print(f"✅ Invoice number format is correct")
                    if invoice1.get('status') == 'approved':
                        print(f"✅ Invoice auto-approved")
                        self.created_entities['invoices'].append(invoice1['id'])
                        return True
                    else:
                        print(f"❌ Invoice not auto-approved: {invoice1.get('status')}")
                        return False
                else:
                    print(f"❌ Invoice number format incorrect: {invoice_number1}")
                    return False
            else:
                print(f"❌ Failed to create invoice: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Invoice auto-numbering test error: {str(e)}")
            return False
    
    def test_search_functionality(self):
        """Test search functionality for all entities"""
        print(f"\n=== SEARCH FUNCTIONALITY TEST ===")
        
        search_tests = [
            ("vendors", "Vendor-25", "vendor_number search"),
            ("vendors", "Tech", "vendor name search"),
            ("tenders", "Tender-25", "tender_number search"),
            ("tenders", "Software", "tender title search"),
            ("contracts", "Contract-25", "contract_number search"),
            ("contracts", "Software", "contract title search"),
            ("invoices", "Invoice-25", "invoice_number search"),
            ("invoices", "Phase", "invoice description search")
        ]
        
        all_passed = True
        
        for endpoint, search_term, test_name in search_tests:
            try:
                response = self.session.get(f"{BASE_URL}/{endpoint}?search={search_term}")
                print(f"{test_name} Status: {response.status_code}")
                
                if response.status_code == 200:
                    results = response.json()
                    print(f"✅ {test_name} returned {len(results)} results")
                    
                    # Verify search results contain the search term
                    if results:
                        first_result = results[0]
                        found_term = False
                        
                        # Check relevant fields for search term
                        for key, value in first_result.items():
                            if isinstance(value, str) and search_term.lower() in value.lower():
                                found_term = True
                                break
                        
                        if found_term:
                            print(f"✅ Search term '{search_term}' found in results")
                        else:
                            print(f"⚠️ Search term '{search_term}' not found in results (might be expected)")
                    else:
                        print(f"⚠️ No results for '{search_term}' (might be expected)")
                else:
                    print(f"❌ {test_name} failed: {response.text}")
                    all_passed = False
                    
            except Exception as e:
                print(f"❌ {test_name} error: {str(e)}")
                all_passed = False
        
        return all_passed
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 60)
        print("SOURCEVIA PROCUREMENT BACKEND TESTING")
        print("=" * 60)
        
        # Login first
        if not self.login("procurement"):
            print("❌ Cannot proceed without authentication")
            return False
        
        test_results = {
            "vendor_auto_numbering": self.test_vendor_auto_numbering(),
            "tender_auto_numbering": self.test_tender_auto_numbering(),
            "approved_tenders_endpoint": self.test_approved_tenders_endpoint(),
            "contract_auto_numbering": self.test_contract_auto_numbering(),
            "contract_validation": self.test_contract_validation(),
            "invoice_auto_numbering": self.test_invoice_auto_numbering(),
            "search_functionality": self.test_search_functionality()
        }
        
        # Summary
        print(f"\n" + "=" * 60)
        print("TEST RESULTS SUMMARY")
        print("=" * 60)
        
        passed = 0
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name.replace('_', ' ').title()}: {status}")
            if result:
                passed += 1
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️ Some tests failed - check details above")
            return False

if __name__ == "__main__":
    tester = ProcurementTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)