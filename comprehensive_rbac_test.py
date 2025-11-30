#!/usr/bin/env python3
"""
Comprehensive RBAC Testing - All Phases
Tests permission hierarchy, data filtering, CRUD operations, and action-specific permissions
Based on the detailed review request for complete RBAC validation
"""

import requests
import json
from datetime import datetime, timedelta, timezone
import sys

# Configuration
BASE_URL = "https://sourcevia-app.preview.emergentagent.com/api"

# RBAC Test Users (password: "password")
RBAC_TEST_USERS = {
    "user": {"email": "user@test.com", "password": "password", "role": "user"},
    "direct_manager": {"email": "manager@test.com", "password": "password", "role": "direct_manager"},
    "procurement_officer": {"email": "officer@test.com", "password": "password", "role": "procurement_officer"},
    "senior_manager": {"email": "senior@test.com", "password": "password", "role": "senior_manager"},
    "procurement_manager": {"email": "procmgr@test.com", "password": "password", "role": "procurement_manager"},
    "admin": {"email": "admin@test.com", "password": "password", "role": "admin"}
}

class ComprehensiveRBACTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.current_user = None
        self.created_entities = {
            'vendors': [],
            'tenders': [],
            'contracts': [],
            'invoices': [],
            'purchase_orders': [],
            'assets': [],
            'osrs': []
        }
        
    def login_rbac_user(self, user_key):
        """Login with RBAC test user"""
        if user_key not in RBAC_TEST_USERS:
            print(f"❌ Unknown user key: {user_key}")
            return False
            
        user_creds = RBAC_TEST_USERS[user_key]
        login_data = {
            "email": user_creds["email"],
            "password": user_creds["password"]
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                user_info = data.get('user', {})
                self.current_user = {
                    'id': user_info.get('id'),
                    'email': user_info.get('email'),
                    'role': user_info.get('role'),
                    'name': user_info.get('name')
                }
                return True
            else:
                print(f"❌ Login failed for {user_creds['email']}: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False

    def test_comprehensive_rbac_all_phases(self):
        """
        Comprehensive RBAC Testing - All Phases as requested in review
        Tests permission hierarchy, data filtering, CRUD operations, and action-specific permissions
        """
        print(f"\n" + "="*100)
        print(f"COMPREHENSIVE RBAC TESTING - ALL PHASES")
        print(f"Testing Permission Hierarchy, Data Filtering, CRUD Operations, and Action-Specific Permissions")
        print(f"="*100)
        
        # Test Suite 1: Permission Hierarchy Verification
        print(f"\n🔍 TEST SUITE 1: PERMISSION HIERARCHY VERIFICATION")
        print(f"-" * 60)
        
        hierarchy_results = self.test_permission_hierarchy()
        
        # Test Suite 2: Data Filtering (Row-Level Security)
        print(f"\n🔍 TEST SUITE 2: DATA FILTERING (ROW-LEVEL SECURITY)")
        print(f"-" * 60)
        
        filtering_results = self.test_data_filtering()
        
        # Test Suite 3: CRUD Operations by Module
        print(f"\n🔍 TEST SUITE 3: CRUD OPERATIONS BY MODULE")
        print(f"-" * 60)
        
        crud_results = self.test_crud_operations_by_module()
        
        # Test Suite 4: Action-Specific Permissions
        print(f"\n🔍 TEST SUITE 4: ACTION-SPECIFIC PERMISSIONS")
        print(f"-" * 60)
        
        action_results = self.test_action_specific_permissions()
        
        # Test Suite 5: Error Messages & Security
        print(f"\n🔍 TEST SUITE 5: ERROR MESSAGES & SECURITY")
        print(f"-" * 60)
        
        security_results = self.test_error_messages_and_security()
        
        # Compile comprehensive results
        all_results = {
            'permission_hierarchy': hierarchy_results,
            'data_filtering': filtering_results,
            'crud_operations': crud_results,
            'action_specific': action_results,
            'security': security_results
        }
        
        return all_results

    def test_permission_hierarchy(self):
        """Test Suite 1: Permission Hierarchy Verification"""
        results = {}
        
        # 1.1 Vendors Module
        print(f"\n--- 1.1 Vendors Module Permission Hierarchy ---")
        
        # Test with officer@test.com (has REQUESTER + VERIFIER)
        print(f"\n🔹 Testing officer@test.com (has REQUESTER + VERIFIER)")
        if self.login_rbac_user('procurement_officer'):
            # GET /api/vendors - Should work (VIEWER included in hierarchy)
            response = self.session.get(f"{BASE_URL}/vendors")
            if response.status_code == 200:
                print(f"✅ GET /api/vendors - PASSED (status: {response.status_code})")
                results['vendors_officer_list'] = 'PASS'
            else:
                print(f"❌ GET /api/vendors - FAILED (status: {response.status_code})")
                results['vendors_officer_list'] = f'FAIL - {response.status_code}'
            
            # POST /api/vendors - Should work (has REQUESTER)
            vendor_data = {
                "name_english": "Hierarchy Test Vendor",
                "commercial_name": "HTV Co",
                "vendor_type": "local",
                "entity_type": "LLC",
                "vat_number": "300777777777001",
                "cr_number": "7777777001",
                "cr_expiry_date": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
                "cr_country_city": "Riyadh, Saudi Arabia",
                "activity_description": "Hierarchy Testing",
                "number_of_employees": 8,
                "street": "Test Street",
                "building_no": "777",
                "city": "Riyadh",
                "district": "Test District",
                "country": "Saudi Arabia",
                "mobile": "+966501777777",
                "email": "hierarchy@test.com",
                "representative_name": "Hierarchy Tester",
                "representative_designation": "Test Manager",
                "representative_id_type": "National ID",
                "representative_id_number": "7777777777",
                "representative_nationality": "Saudi",
                "representative_mobile": "+966501777777",
                "representative_email": "hierarchy@test.com",
                "bank_account_name": "Hierarchy Test Vendor",
                "bank_name": "Test Bank",
                "bank_branch": "Test Branch",
                "bank_country": "Saudi Arabia",
                "iban": "SA0377777777777777777777",
                "currency": "SAR",
                "swift_code": "TESTSAR"
            }
            
            response = self.session.post(f"{BASE_URL}/vendors", json=vendor_data)
            if response.status_code == 200:
                print(f"✅ POST /api/vendors - PASSED (status: {response.status_code})")
                results['vendors_officer_create'] = 'PASS'
                vendor_data_response = response.json()
                self.created_entities['vendors'].append(vendor_data_response['id'])
            else:
                print(f"❌ POST /api/vendors - FAILED (status: {response.status_code})")
                results['vendors_officer_create'] = f'FAIL - {response.status_code}'
        
        # Test with user@test.com (has VIEWER only)
        print(f"\n🔹 Testing user@test.com (has VIEWER only)")
        if self.login_rbac_user('user'):
            # GET /api/vendors - Should work (has VIEWER)
            response = self.session.get(f"{BASE_URL}/vendors")
            if response.status_code == 200:
                print(f"✅ GET /api/vendors - PASSED (status: {response.status_code})")
                results['vendors_user_list'] = 'PASS'
            else:
                print(f"❌ GET /api/vendors - FAILED (status: {response.status_code})")
                results['vendors_user_list'] = f'FAIL - {response.status_code}'
            
            # POST /api/vendors - Should FAIL 403 (no REQUESTER)
            response = self.session.post(f"{BASE_URL}/vendors", json=vendor_data)
            if response.status_code == 403:
                print(f"✅ POST /api/vendors - CORRECTLY DENIED (status: {response.status_code})")
                results['vendors_user_create'] = 'PASS - Correctly denied'
            else:
                print(f"❌ POST /api/vendors - Should be denied but got (status: {response.status_code})")
                results['vendors_user_create'] = f'FAIL - Should be denied but got {response.status_code}'
        
        # Test with admin@test.com
        print(f"\n🔹 Testing admin@test.com (CONTROLLER has all permissions)")
        if self.login_rbac_user('admin'):
            # All operations should work
            response = self.session.get(f"{BASE_URL}/vendors")
            if response.status_code == 200:
                print(f"✅ GET /api/vendors - PASSED (status: {response.status_code})")
                results['vendors_admin_list'] = 'PASS'
            else:
                print(f"❌ GET /api/vendors - FAILED (status: {response.status_code})")
                results['vendors_admin_list'] = f'FAIL - {response.status_code}'
        
        # 1.2 Tenders Module
        print(f"\n--- 1.2 Tenders Module Permission Hierarchy ---")
        
        # Test with user@test.com (has REQUESTER)
        print(f"\n🔹 Testing user@test.com (has REQUESTER)")
        if self.login_rbac_user('user'):
            # POST /api/tenders - Should work (has REQUESTER)
            tender_data = {
                "title": "Hierarchy Test Tender",
                "description": "Test tender for hierarchy validation",
                "project_name": "Hierarchy Testing Project",
                "requirements": "Testing permission hierarchy for tender creation",
                "budget": 50000.0,
                "deadline": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                "invited_vendors": []
            }
            
            response = self.session.post(f"{BASE_URL}/tenders", json=tender_data)
            if response.status_code == 200:
                print(f"✅ POST /api/tenders - PASSED (status: {response.status_code})")
                results['tenders_user_create'] = 'PASS'
                tender_response = response.json()
                self.created_entities['tenders'].append(tender_response['id'])
            else:
                print(f"❌ POST /api/tenders - FAILED (status: {response.status_code})")
                results['tenders_user_create'] = f'FAIL - {response.status_code}'
            
            # GET /api/tenders - Should work (VIEWER included in REQUESTER)
            response = self.session.get(f"{BASE_URL}/tenders")
            if response.status_code == 200:
                print(f"✅ GET /api/tenders - PASSED (status: {response.status_code})")
                results['tenders_user_list'] = 'PASS'
            else:
                print(f"❌ GET /api/tenders - FAILED (status: {response.status_code})")
                results['tenders_user_list'] = f'FAIL - {response.status_code}'
        
        # Test with officer@test.com (has REQUESTER + VERIFIER)
        print(f"\n🔹 Testing officer@test.com (has REQUESTER + VERIFIER)")
        if self.login_rbac_user('procurement_officer'):
            # POST /api/tenders - Should work
            response = self.session.post(f"{BASE_URL}/tenders", json=tender_data)
            if response.status_code == 200:
                print(f"✅ POST /api/tenders - PASSED (status: {response.status_code})")
                results['tenders_officer_create'] = 'PASS'
                tender_response = response.json()
                tender_id = tender_response['id']
                self.created_entities['tenders'].append(tender_id)
                
                # PUT /api/tenders/{id}/publish - Should work (has VERIFIER)
                response = self.session.put(f"{BASE_URL}/tenders/{tender_id}/publish")
                if response.status_code == 200:
                    print(f"✅ PUT /api/tenders/{{id}}/publish - PASSED (status: {response.status_code})")
                    results['tenders_officer_publish'] = 'PASS'
                else:
                    print(f"❌ PUT /api/tenders/{{id}}/publish - FAILED (status: {response.status_code})")
                    results['tenders_officer_publish'] = f'FAIL - {response.status_code}'
            else:
                print(f"❌ POST /api/tenders - FAILED (status: {response.status_code})")
                results['tenders_officer_create'] = f'FAIL - {response.status_code}'
        
        return results

    def test_data_filtering(self):
        """Test Suite 2: Data Filtering (Row-Level Security)"""
        results = {}
        
        print(f"\n--- 2.1 Tenders Data Filtering ---")
        
        # Create tenders with different users
        user_tender_id = None
        officer_tender_id = None
        
        # Create tender as user@test.com
        if self.login_rbac_user('user'):
            tender_data = {
                "title": "User Created Tender",
                "description": "Tender created by user for filtering test",
                "project_name": "User Filtering Project",
                "requirements": "Testing data filtering for user role",
                "budget": 30000.0,
                "deadline": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                "invited_vendors": []
            }
            
            response = self.session.post(f"{BASE_URL}/tenders", json=tender_data)
            if response.status_code == 200:
                user_tender_id = response.json()['id']
                print(f"✅ Created tender as user: {user_tender_id}")
                self.created_entities['tenders'].append(user_tender_id)
            else:
                print(f"❌ Failed to create tender as user: {response.status_code}")
        
        # Create tender as officer@test.com
        if self.login_rbac_user('procurement_officer'):
            tender_data = {
                "title": "Officer Created Tender",
                "description": "Tender created by officer for filtering test",
                "project_name": "Officer Filtering Project",
                "requirements": "Testing data filtering for officer role",
                "budget": 40000.0,
                "deadline": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                "invited_vendors": []
            }
            
            response = self.session.post(f"{BASE_URL}/tenders", json=tender_data)
            if response.status_code == 200:
                officer_tender_id = response.json()['id']
                print(f"✅ Created tender as officer: {officer_tender_id}")
                self.created_entities['tenders'].append(officer_tender_id)
            else:
                print(f"❌ Failed to create tender as officer: {response.status_code}")
        
        # Verify filtering
        # GET /api/tenders as user@test.com - Should see ONLY their tender
        if self.login_rbac_user('user'):
            response = self.session.get(f"{BASE_URL}/tenders")
            if response.status_code == 200:
                tenders = response.json()
                user_tender_count = len([t for t in tenders if t.get('created_by') == self.current_user.get('id')])
                total_count = len(tenders)
                print(f"✅ User sees {user_tender_count} own tenders out of {total_count} total")
                
                # Check if filtering is working (user should see only their own)
                if user_tender_count > 0 and user_tender_count <= total_count:
                    results['tenders_user_filtering'] = 'PASS - User sees filtered data'
                else:
                    results['tenders_user_filtering'] = f'UNCERTAIN - User sees {user_tender_count}/{total_count}'
            else:
                print(f"❌ Failed to get tenders as user: {response.status_code}")
                results['tenders_user_filtering'] = f'FAIL - {response.status_code}'
        
        # GET /api/tenders as officer@test.com - Should see ALL tenders
        if self.login_rbac_user('procurement_officer'):
            response = self.session.get(f"{BASE_URL}/tenders")
            if response.status_code == 200:
                tenders = response.json()
                total_count = len(tenders)
                print(f"✅ Officer sees {total_count} total tenders")
                results['tenders_officer_filtering'] = f'PASS - Officer sees {total_count} tenders'
            else:
                print(f"❌ Failed to get tenders as officer: {response.status_code}")
                results['tenders_officer_filtering'] = f'FAIL - {response.status_code}'
        
        # 2.2 Purchase Orders Filtering (similar pattern)
        print(f"\n--- 2.2 Purchase Orders Filtering ---")
        
        # Create POs with different users (if we have tenders and vendors)
        if self.created_entities['tenders'] and self.created_entities['vendors']:
            tender_id = self.created_entities['tenders'][0]
            vendor_id = self.created_entities['vendors'][0]
            
            # Create PO as user@test.com
            if self.login_rbac_user('user'):
                po_data = {
                    "tender_id": tender_id,
                    "vendor_id": vendor_id,
                    "delivery_time": "15 days",
                    "items": [
                        {
                            "name": "User PO Item",
                            "description": "Item for user PO filtering test",
                            "quantity": 2,
                            "unit_price": 500.0
                        }
                    ]
                }
                
                response = self.session.post(f"{BASE_URL}/purchase-orders", json=po_data)
                if response.status_code == 200:
                    user_po_id = response.json()['id']
                    print(f"✅ Created PO as user: {user_po_id}")
                    self.created_entities['purchase_orders'].append(user_po_id)
                else:
                    print(f"❌ Failed to create PO as user: {response.status_code}")
            
            # Create PO as officer@test.com
            if self.login_rbac_user('procurement_officer'):
                po_data = {
                    "tender_id": tender_id,
                    "vendor_id": vendor_id,
                    "delivery_time": "20 days",
                    "items": [
                        {
                            "name": "Officer PO Item",
                            "description": "Item for officer PO filtering test",
                            "quantity": 3,
                            "unit_price": 750.0
                        }
                    ]
                }
                
                response = self.session.post(f"{BASE_URL}/purchase-orders", json=po_data)
                if response.status_code == 200:
                    officer_po_id = response.json()['id']
                    print(f"✅ Created PO as officer: {officer_po_id}")
                    self.created_entities['purchase_orders'].append(officer_po_id)
                else:
                    print(f"❌ Failed to create PO as officer: {response.status_code}")
            
            # Verify PO filtering
            if self.login_rbac_user('user'):
                response = self.session.get(f"{BASE_URL}/purchase-orders")
                if response.status_code == 200:
                    pos = response.json()
                    user_po_count = len(pos)
                    print(f"✅ User sees {user_po_count} POs")
                    results['pos_user_filtering'] = f'PASS - User sees {user_po_count} POs'
                else:
                    results['pos_user_filtering'] = f'FAIL - {response.status_code}'
            
            if self.login_rbac_user('procurement_officer'):
                response = self.session.get(f"{BASE_URL}/purchase-orders")
                if response.status_code == 200:
                    pos = response.json()
                    officer_po_count = len(pos)
                    print(f"✅ Officer sees {officer_po_count} POs")
                    results['pos_officer_filtering'] = f'PASS - Officer sees {officer_po_count} POs'
                else:
                    results['pos_officer_filtering'] = f'FAIL - {response.status_code}'
        
        # 2.3 Service Requests Filtering
        print(f"\n--- 2.3 Service Requests Filtering ---")
        
        # Create OSRs with different users
        if self.login_rbac_user('user'):
            osr_data = {
                "title": "User OSR",
                "description": "OSR created by user for filtering test",
                "request_type": "maintenance",
                "category": "maintenance",
                "priority": "normal",
                "building_id": "test-building-id",
                "floor_id": "test-floor-id",
                "created_by": self.current_user.get('id', 'user-id')
            }
            
            response = self.session.post(f"{BASE_URL}/osrs", json=osr_data)
            if response.status_code == 200:
                user_osr_id = response.json()['id']
                print(f"✅ Created OSR as user: {user_osr_id}")
                self.created_entities['osrs'].append(user_osr_id)
            else:
                print(f"❌ Failed to create OSR as user: {response.status_code} - {response.text}")
        
        if self.login_rbac_user('procurement_officer'):
            osr_data = {
                "title": "Officer OSR",
                "description": "OSR created by officer for filtering test",
                "request_type": "maintenance",
                "category": "maintenance",
                "priority": "high",
                "building_id": "test-building-id",
                "floor_id": "test-floor-id",
                "created_by": self.current_user.get('id', 'officer-id')
            }
            
            response = self.session.post(f"{BASE_URL}/osrs", json=osr_data)
            if response.status_code == 200:
                officer_osr_id = response.json()['id']
                print(f"✅ Created OSR as officer: {officer_osr_id}")
                self.created_entities['osrs'].append(officer_osr_id)
            else:
                print(f"❌ Failed to create OSR as officer: {response.status_code} - {response.text}")
        
        # Verify OSR filtering
        if self.login_rbac_user('user'):
            response = self.session.get(f"{BASE_URL}/osrs")
            if response.status_code == 200:
                osrs = response.json()
                user_osr_count = len(osrs)
                print(f"✅ User sees {user_osr_count} OSRs")
                results['osrs_user_filtering'] = f'PASS - User sees {user_osr_count} OSRs'
            else:
                results['osrs_user_filtering'] = f'FAIL - {response.status_code}'
        
        if self.login_rbac_user('procurement_officer'):
            response = self.session.get(f"{BASE_URL}/osrs")
            if response.status_code == 200:
                osrs = response.json()
                officer_osr_count = len(osrs)
                print(f"✅ Officer sees {officer_osr_count} OSRs")
                results['osrs_officer_filtering'] = f'PASS - Officer sees {officer_osr_count} OSRs'
            else:
                results['osrs_officer_filtering'] = f'FAIL - {response.status_code}'
        
        return results

    def test_crud_operations_by_module(self):
        """Test Suite 3: CRUD Operations by Module"""
        results = {}
        
        # 3.1 Invoices Module
        print(f"\n--- 3.1 Invoices Module CRUD Operations ---")
        
        # Test with officer@test.com
        print(f"\n🔹 Testing officer@test.com (should have REQUESTER + VERIFIER)")
        if self.login_rbac_user('procurement_officer') and self.created_entities['contracts']:
            contract_id = self.created_entities['contracts'][0]
            vendor_id = self.created_entities['vendors'][0] if self.created_entities['vendors'] else None
            
            # POST /api/invoices - Should work (has REQUESTER)
            invoice_data = {
                "contract_id": contract_id,
                "vendor_id": vendor_id,
                "amount": 15000.0,
                "description": "RBAC Test Invoice - Officer",
                "milestone_reference": "Testing milestone"
            }
            
            response = self.session.post(f"{BASE_URL}/invoices", json=invoice_data)
            if response.status_code == 200:
                print(f"✅ POST /api/invoices - PASSED (status: {response.status_code})")
                results['invoices_officer_create'] = 'PASS'
                invoice_response = response.json()
                invoice_id = invoice_response['id']
                self.created_entities['invoices'].append(invoice_id)
                
                # GET /api/invoices - Should work
                response = self.session.get(f"{BASE_URL}/invoices")
                if response.status_code == 200:
                    print(f"✅ GET /api/invoices - PASSED (status: {response.status_code})")
                    results['invoices_officer_list'] = 'PASS'
                else:
                    print(f"❌ GET /api/invoices - FAILED (status: {response.status_code})")
                    results['invoices_officer_list'] = f'FAIL - {response.status_code}'
                
                # PUT /api/invoices/{id}/verify - Should work (has VERIFIER)
                response = self.session.put(f"{BASE_URL}/invoices/{invoice_id}/verify")
                if response.status_code == 200:
                    print(f"✅ PUT /api/invoices/{{id}}/verify - PASSED (status: {response.status_code})")
                    results['invoices_officer_verify'] = 'PASS'
                else:
                    print(f"❌ PUT /api/invoices/{{id}}/verify - FAILED (status: {response.status_code})")
                    results['invoices_officer_verify'] = f'FAIL - {response.status_code}'
            else:
                print(f"❌ POST /api/invoices - FAILED (status: {response.status_code})")
                results['invoices_officer_create'] = f'FAIL - {response.status_code}'
        
        # Test with procmgr@test.com
        print(f"\n🔹 Testing procmgr@test.com (should have APPROVER)")
        if self.login_rbac_user('procurement_manager') and self.created_entities['invoices']:
            invoice_id = self.created_entities['invoices'][0]
            
            # PUT /api/invoices/{id}/approve - Should work (has APPROVER)
            response = self.session.put(f"{BASE_URL}/invoices/{invoice_id}/approve")
            if response.status_code == 200:
                print(f"✅ PUT /api/invoices/{{id}}/approve - PASSED (status: {response.status_code})")
                results['invoices_procmgr_approve'] = 'PASS'
            else:
                print(f"❌ PUT /api/invoices/{{id}}/approve - FAILED (status: {response.status_code})")
                results['invoices_procmgr_approve'] = f'FAIL - {response.status_code}'
        
        # Test with user@test.com
        print(f"\n🔹 Testing user@test.com (checking REQUESTER permission)")
        if self.login_rbac_user('user') and self.created_entities['contracts']:
            contract_id = self.created_entities['contracts'][0]
            vendor_id = self.created_entities['vendors'][0] if self.created_entities['vendors'] else None
            
            # POST /api/invoices - Check if user has REQUESTER permission
            invoice_data = {
                "contract_id": contract_id,
                "vendor_id": vendor_id,
                "amount": 8000.0,
                "description": "RBAC Test Invoice - User",
                "milestone_reference": "User testing milestone"
            }
            
            response = self.session.post(f"{BASE_URL}/invoices", json=invoice_data)
            if response.status_code == 200:
                print(f"✅ POST /api/invoices - PASSED (status: {response.status_code})")
                results['invoices_user_create'] = 'PASS'
                invoice_response = response.json()
                self.created_entities['invoices'].append(invoice_response['id'])
            elif response.status_code == 403:
                print(f"✅ POST /api/invoices - CORRECTLY DENIED (status: {response.status_code})")
                results['invoices_user_create'] = 'PASS - Correctly denied'
            else:
                print(f"❌ POST /api/invoices - UNEXPECTED STATUS (status: {response.status_code})")
                results['invoices_user_create'] = f'UNEXPECTED - {response.status_code}'
        
        # 3.2 Contracts Module
        print(f"\n--- 3.2 Contracts Module CRUD Operations ---")
        
        # Test with officer@test.com
        print(f"\n🔹 Testing officer@test.com (should have REQUESTER + VERIFIER)")
        if self.login_rbac_user('procurement_officer') and self.created_entities['tenders'] and self.created_entities['vendors']:
            tender_id = self.created_entities['tenders'][0]
            vendor_id = self.created_entities['vendors'][0]
            
            # POST /api/contracts - Should work (has REQUESTER)
            contract_data = {
                "tender_id": tender_id,
                "vendor_id": vendor_id,
                "title": "RBAC Test Contract - Officer",
                "sow": "Statement of work for RBAC testing by officer",
                "sla": "Service level agreement for testing",
                "value": 35000.0,
                "start_date": datetime.now(timezone.utc).isoformat(),
                "end_date": (datetime.now(timezone.utc) + timedelta(days=120)).isoformat(),
                "milestones": []
            }
            
            response = self.session.post(f"{BASE_URL}/contracts", json=contract_data)
            if response.status_code == 200:
                print(f"✅ POST /api/contracts - PASSED (status: {response.status_code})")
                results['contracts_officer_create'] = 'PASS'
                contract_response = response.json()
                self.created_entities['contracts'].append(contract_response['id'])
                
                # GET /api/contracts - Should work
                response = self.session.get(f"{BASE_URL}/contracts")
                if response.status_code == 200:
                    print(f"✅ GET /api/contracts - PASSED (status: {response.status_code})")
                    results['contracts_officer_list'] = 'PASS'
                else:
                    print(f"❌ GET /api/contracts - FAILED (status: {response.status_code})")
                    results['contracts_officer_list'] = f'FAIL - {response.status_code}'
            else:
                print(f"❌ POST /api/contracts - FAILED (status: {response.status_code})")
                results['contracts_officer_create'] = f'FAIL - {response.status_code}'
        
        # Test with procmgr@test.com
        print(f"\n🔹 Testing procmgr@test.com (should have APPROVER)")
        if self.login_rbac_user('procurement_manager') and self.created_entities['contracts']:
            contract_id = self.created_entities['contracts'][-1]  # Use latest contract
            
            # PUT /api/contracts/{id}/approve - Should work (has APPROVER)
            response = self.session.put(f"{BASE_URL}/contracts/{contract_id}/approve")
            if response.status_code == 200:
                print(f"✅ PUT /api/contracts/{{id}}/approve - PASSED (status: {response.status_code})")
                results['contracts_procmgr_approve'] = 'PASS'
            else:
                print(f"❌ PUT /api/contracts/{{id}}/approve - FAILED (status: {response.status_code})")
                results['contracts_procmgr_approve'] = f'FAIL - {response.status_code}'
        
        # 3.3 Assets Module (Special - Users have NO_ACCESS)
        print(f"\n--- 3.3 Assets Module CRUD Operations ---")
        
        # Test with user@test.com
        print(f"\n🔹 Testing user@test.com (should have NO_ACCESS)")
        if self.login_rbac_user('user'):
            # GET /api/assets - Should FAIL 403 (NO_ACCESS)
            response = self.session.get(f"{BASE_URL}/assets")
            if response.status_code == 403:
                print(f"✅ GET /api/assets - CORRECTLY DENIED (status: {response.status_code})")
                results['assets_user_list'] = 'PASS - Correctly denied'
            else:
                print(f"❌ GET /api/assets - Should be denied but got (status: {response.status_code})")
                results['assets_user_list'] = f'FAIL - Should be denied but got {response.status_code}'
            
            # POST /api/assets - Should FAIL 403
            asset_data = {
                "name": "User Test Asset",
                "category_id": "test-category-id",
                "building_id": "test-building-id",
                "floor_id": "test-floor-id",
                "room_location": "Test Room",
                "model": "Test Model",
                "serial_number": "USER-TEST-001",
                "manufacturer": "Test Manufacturer",
                "status": "active",
                "condition": "good"
            }
            
            response = self.session.post(f"{BASE_URL}/assets", json=asset_data)
            if response.status_code == 403:
                print(f"✅ POST /api/assets - CORRECTLY DENIED (status: {response.status_code})")
                results['assets_user_create'] = 'PASS - Correctly denied'
            else:
                print(f"❌ POST /api/assets - Should be denied but got (status: {response.status_code})")
                results['assets_user_create'] = f'FAIL - Should be denied but got {response.status_code}'
        
        # Test with officer@test.com
        print(f"\n🔹 Testing officer@test.com (should have REQUESTER)")
        if self.login_rbac_user('procurement_officer'):
            # GET /api/assets - Should work (has REQUESTER)
            response = self.session.get(f"{BASE_URL}/assets")
            if response.status_code == 200:
                print(f"✅ GET /api/assets - PASSED (status: {response.status_code})")
                results['assets_officer_list'] = 'PASS'
            else:
                print(f"❌ GET /api/assets - FAILED (status: {response.status_code})")
                results['assets_officer_list'] = f'FAIL - {response.status_code}'
            
            # POST /api/assets - Should work
            asset_data = {
                "name": "Officer Test Asset",
                "category_id": "test-category-id",
                "building_id": "test-building-id",
                "floor_id": "test-floor-id",
                "room_location": "Test Room",
                "model": "Test Model",
                "serial_number": "OFFICER-TEST-001",
                "manufacturer": "Test Manufacturer",
                "status": "active",
                "condition": "good"
            }
            
            response = self.session.post(f"{BASE_URL}/assets", json=asset_data)
            if response.status_code == 200:
                print(f"✅ POST /api/assets - PASSED (status: {response.status_code})")
                results['assets_officer_create'] = 'PASS'
                asset_response = response.json()
                self.created_entities['assets'].append(asset_response['id'])
            else:
                print(f"❌ POST /api/assets - FAILED (status: {response.status_code})")
                results['assets_officer_create'] = f'FAIL - {response.status_code}'
        
        return results

    def test_action_specific_permissions(self):
        """Test Suite 4: Action-Specific Permissions"""
        results = {}
        
        # 4.1 Approval Operations
        print(f"\n--- 4.1 Approval Operations ---")
        
        # Test APPROVE permission
        print(f"\n🔹 Testing APPROVE permission")
        
        # Contracts approval with procmgr@test.com - Should work
        if self.login_rbac_user('procurement_manager') and self.created_entities['contracts']:
            contract_id = self.created_entities['contracts'][0]
            response = self.session.put(f"{BASE_URL}/contracts/{contract_id}/approve")
            if response.status_code == 200:
                print(f"✅ Contracts approval with procmgr@test.com - PASSED")
                results['approve_contracts_procmgr'] = 'PASS'
            else:
                print(f"❌ Contracts approval with procmgr@test.com - FAILED ({response.status_code})")
                results['approve_contracts_procmgr'] = f'FAIL - {response.status_code}'
        
        # Contracts approval with officer@test.com - Should FAIL 403
        if self.login_rbac_user('procurement_officer') and self.created_entities['contracts']:
            contract_id = self.created_entities['contracts'][0]
            response = self.session.put(f"{BASE_URL}/contracts/{contract_id}/approve")
            if response.status_code == 403:
                print(f"✅ Contracts approval with officer@test.com - CORRECTLY DENIED")
                results['approve_contracts_officer'] = 'PASS - Correctly denied'
            else:
                print(f"❌ Contracts approval with officer@test.com - Should be denied but got {response.status_code}")
                results['approve_contracts_officer'] = f'FAIL - Should be denied but got {response.status_code}'
        
        # Invoice approval with procmgr@test.com - Should work
        if self.login_rbac_user('procurement_manager') and self.created_entities['invoices']:
            invoice_id = self.created_entities['invoices'][0]
            response = self.session.put(f"{BASE_URL}/invoices/{invoice_id}/approve")
            if response.status_code == 200:
                print(f"✅ Invoice approval with procmgr@test.com - PASSED")
                results['approve_invoices_procmgr'] = 'PASS'
            else:
                print(f"❌ Invoice approval with procmgr@test.com - FAILED ({response.status_code})")
                results['approve_invoices_procmgr'] = f'FAIL - {response.status_code}'
        
        # 4.2 Delete/Terminate Operations
        print(f"\n--- 4.2 Delete/Terminate Operations ---")
        
        # Test DELETE permission
        print(f"\n🔹 Testing DELETE permission")
        
        # DELETE /api/assets/{id} with procmgr@test.com - Should work (has APPROVER)
        if self.login_rbac_user('procurement_manager') and self.created_entities['assets']:
            asset_id = self.created_entities['assets'][0]
            response = self.session.delete(f"{BASE_URL}/assets/{asset_id}")
            if response.status_code in [200, 204]:
                print(f"✅ DELETE /api/assets/{{id}} with procmgr@test.com - PASSED")
                results['delete_assets_procmgr'] = 'PASS'
            else:
                print(f"❌ DELETE /api/assets/{{id}} with procmgr@test.com - FAILED ({response.status_code})")
                results['delete_assets_procmgr'] = f'FAIL - {response.status_code}'
        
        # DELETE /api/assets/{id} with officer@test.com - Should FAIL 403
        if self.login_rbac_user('procurement_officer') and self.created_entities['assets']:
            asset_id = self.created_entities['assets'][0] if len(self.created_entities['assets']) > 1 else None
            if asset_id:
                response = self.session.delete(f"{BASE_URL}/assets/{asset_id}")
                if response.status_code == 403:
                    print(f"✅ DELETE /api/assets/{{id}} with officer@test.com - CORRECTLY DENIED")
                    results['delete_assets_officer'] = 'PASS - Correctly denied'
                else:
                    print(f"❌ DELETE /api/assets/{{id}} with officer@test.com - Should be denied but got {response.status_code}")
                    results['delete_assets_officer'] = f'FAIL - Should be denied but got {response.status_code}'
        
        # POST /api/contracts/{id}/terminate with procmgr@test.com - Should work
        if self.login_rbac_user('procurement_manager') and self.created_entities['contracts']:
            contract_id = self.created_entities['contracts'][0]
            response = self.session.post(f"{BASE_URL}/contracts/{contract_id}/terminate", json={"reason": "RBAC testing termination"})
            if response.status_code == 200:
                print(f"✅ POST /api/contracts/{{id}}/terminate with procmgr@test.com - PASSED")
                results['terminate_contracts_procmgr'] = 'PASS'
            else:
                print(f"❌ POST /api/contracts/{{id}}/terminate with procmgr@test.com - FAILED ({response.status_code})")
                results['terminate_contracts_procmgr'] = f'FAIL - {response.status_code}'
        
        return results

    def test_error_messages_and_security(self):
        """Test Suite 5: Error Messages & Security"""
        results = {}
        
        # 5.1 Verify Error Messages
        print(f"\n--- 5.1 Verify Error Messages ---")
        
        # Test denied access provides clear messages
        print(f"\n🔹 Testing clear error messages for denied access")
        
        # user@test.com tries to create asset
        if self.login_rbac_user('user'):
            asset_data = {
                "name": "Denied Test Asset",
                "category_id": "test-category-id",
                "building_id": "test-building-id",
                "floor_id": "test-floor-id",
                "room_location": "Test Room",
                "model": "Test Model",
                "serial_number": "DENIED-TEST-001",
                "manufacturer": "Test Manufacturer",
                "status": "active",
                "condition": "good"
            }
            
            response = self.session.post(f"{BASE_URL}/assets", json=asset_data)
            if response.status_code == 403:
                error_text = response.text.lower()
                if "permission" in error_text and "assets" in error_text:
                    print(f"✅ Clear error message for denied asset creation")
                    results['error_message_assets'] = 'PASS - Clear error message'
                else:
                    print(f"⚠️ Error message could be clearer: {response.text}")
                    results['error_message_assets'] = f'PARTIAL - Message: {response.text[:100]}'
            else:
                print(f"❌ Expected 403 but got {response.status_code}")
                results['error_message_assets'] = f'FAIL - Expected 403 but got {response.status_code}'
        
        # 5.2 Unauthorized Access
        print(f"\n--- 5.2 Unauthorized Access ---")
        
        # Test without authentication
        print(f"\n🔹 Testing without authentication")
        
        # Create a new session without login
        unauth_session = requests.Session()
        unauth_session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
        # GET /api/vendors without cookies - Should get 401 Unauthorized
        response = unauth_session.get(f"{BASE_URL}/vendors")
        if response.status_code == 401:
            print(f"✅ GET /api/vendors without auth - CORRECTLY DENIED (401)")
            results['unauth_vendors'] = 'PASS - 401 Unauthorized'
        else:
            print(f"❌ GET /api/vendors without auth - Expected 401 but got {response.status_code}")
            results['unauth_vendors'] = f'FAIL - Expected 401 but got {response.status_code}'
        
        return results

def main():
    """Main test execution"""
    tester = ComprehensiveRBACTester()
    
    print(f"\n" + "="*80)
    print(f"COMPREHENSIVE RBAC TESTING - ALL PHASES")
    print(f"="*80)
    
    # Run comprehensive RBAC tests as requested in review
    try:
        results = tester.test_comprehensive_rbac_all_phases()
        
        # Print detailed summary
        print(f"\n" + "="*100)
        print(f"COMPREHENSIVE RBAC TEST RESULTS SUMMARY")
        print(f"="*100)
        
        total_tests = 0
        passed_tests = 0
        failed_tests = 0
        
        for suite_name, suite_results in results.items():
            if not suite_results:
                continue
                
            print(f"\n📋 {suite_name.upper().replace('_', ' ')} SUITE:")
            print("-" * 50)
            
            for test_name, result in suite_results.items():
                total_tests += 1
                if "PASS" in str(result):
                    passed_tests += 1
                    status_icon = "✅"
                else:
                    failed_tests += 1
                    status_icon = "❌"
                
                print(f"{status_icon} {test_name}: {result}")
        
        print(f"\n" + "="*100)
        print(f"OVERALL RBAC TEST RESULTS:")
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "No tests run")
        print(f"="*100)
        
        return passed_tests > failed_tests  # Return True if more tests passed than failed
        
    except Exception as e:
        print(f"❌ RBAC Testing ERROR: {str(e)}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)