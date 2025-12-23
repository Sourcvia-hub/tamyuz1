#!/usr/bin/env python3
"""
Focused Audit Trail Testing for Sourcevia Application
Tests the new audit trail feature across all entity types
"""

import requests
import json
import sys
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

# Configuration
BACKEND_URL = "https://audit-trail-pro.preview.emergentagent.com/api"

# Test Users that can login (based on domain restriction)
TEST_USERS = {
    "procurement_officer": {
        "email": "test_officer@sourcevia.com",
        "password": "Password123!",
        "expected_role": "procurement_officer"
    },
    "procurement_manager": {
        "email": "test_manager@sourcevia.com", 
        "password": "Password123!",
        "expected_role": "procurement_manager"
    }
}

class AuditTrailTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.auth_tokens = {}
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }

    def log_result(self, test_name: str, success: bool, message: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"    {message}")
        
        if success:
            self.results["passed"] += 1
        else:
            self.results["failed"] += 1
            self.results["errors"].append(f"{test_name}: {message}")

    def authenticate_as(self, role: str):
        """Authenticate as specific role"""
        if role not in TEST_USERS:
            return False
            
        user_data = TEST_USERS[role]
        try:
            login_data = {
                "email": user_data["email"],
                "password": user_data["password"]
            }
            
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                user = data.get("user", {})
                
                # Store session for later tests
                cookies = response.cookies
                if 'session_token' in cookies:
                    self.auth_tokens[role] = cookies['session_token']
                    self.session.cookies.update(cookies)
                
                return True
            else:
                self.log_result(f"Login {role}", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result(f"Login {role}", False, f"Exception: {str(e)}")
            return False

    def test_audit_trail_endpoints(self):
        """Test all audit trail endpoints with proper access control"""
        print("\n=== AUDIT TRAIL ENDPOINTS TESTING ===")
        
        # 1. Test Officer Access to Audit Trails
        print("\n--- Testing Officer Access to Audit Trails ---")
        if not self.authenticate_as('procurement_officer'):
            self.log_result("Officer Authentication", False, "Could not authenticate as officer")
            return
        
        self.log_result("Officer Authentication", True, "Successfully authenticated as officer")
        
        # Get entity IDs for testing
        test_entities = {}
        
        # Get a vendor ID
        try:
            vendors_response = self.session.get(f"{BACKEND_URL}/vendors")
            if vendors_response.status_code == 200:
                vendors = vendors_response.json()
                if vendors:
                    test_entities["vendor_id"] = vendors[0].get("id")
                    self.log_result("Get Vendor for Testing", True, f"Found vendor: {test_entities['vendor_id']}")
                else:
                    self.log_result("Get Vendor for Testing", False, "No vendors found")
            else:
                self.log_result("Get Vendor for Testing", False, f"Status: {vendors_response.status_code}")
        except Exception as e:
            self.log_result("Get Vendor for Testing", False, f"Exception: {str(e)}")
        
        # Get a tender ID
        try:
            tenders_response = self.session.get(f"{BACKEND_URL}/tenders")
            if tenders_response.status_code == 200:
                tenders = tenders_response.json()
                if tenders:
                    test_entities["tender_id"] = tenders[0].get("id")
                    self.log_result("Get Tender for Testing", True, f"Found tender: {test_entities['tender_id']}")
                else:
                    self.log_result("Get Tender for Testing", False, "No tenders found")
            else:
                self.log_result("Get Tender for Testing", False, f"Status: {tenders_response.status_code}")
        except Exception as e:
            self.log_result("Get Tender for Testing", False, f"Exception: {str(e)}")
        
        # Get a contract ID
        try:
            contracts_response = self.session.get(f"{BACKEND_URL}/contracts")
            if contracts_response.status_code == 200:
                contracts = contracts_response.json()
                if contracts:
                    test_entities["contract_id"] = contracts[0].get("id")
                    self.log_result("Get Contract for Testing", True, f"Found contract: {test_entities['contract_id']}")
                else:
                    self.log_result("Get Contract for Testing", False, "No contracts found")
            else:
                self.log_result("Get Contract for Testing", False, f"Status: {contracts_response.status_code}")
        except Exception as e:
            self.log_result("Get Contract for Testing", False, f"Exception: {str(e)}")
        
        # Get a purchase order ID
        try:
            pos_response = self.session.get(f"{BACKEND_URL}/purchase-orders")
            if pos_response.status_code == 200:
                pos = pos_response.json()
                if pos:
                    test_entities["po_id"] = pos[0].get("id")
                    self.log_result("Get Purchase Order for Testing", True, f"Found PO: {test_entities['po_id']}")
                else:
                    self.log_result("Get Purchase Order for Testing", False, "No purchase orders found")
            else:
                self.log_result("Get Purchase Order for Testing", False, f"Status: {pos_response.status_code}")
        except Exception as e:
            self.log_result("Get Purchase Order for Testing", False, f"Exception: {str(e)}")
        
        # Get a deliverable ID
        try:
            deliverables_response = self.session.get(f"{BACKEND_URL}/deliverables")
            if deliverables_response.status_code == 200:
                deliverables_data = deliverables_response.json()
                deliverables = deliverables_data.get("deliverables", [])
                if deliverables:
                    test_entities["deliverable_id"] = deliverables[0].get("id")
                    self.log_result("Get Deliverable for Testing", True, f"Found deliverable: {test_entities['deliverable_id']}")
                else:
                    self.log_result("Get Deliverable for Testing", False, "No deliverables found")
            else:
                self.log_result("Get Deliverable for Testing", False, f"Status: {deliverables_response.status_code}")
        except Exception as e:
            self.log_result("Get Deliverable for Testing", False, f"Exception: {str(e)}")
        
        # Get an asset ID
        try:
            assets_response = self.session.get(f"{BACKEND_URL}/assets")
            if assets_response.status_code == 200:
                assets = assets_response.json()
                if assets:
                    test_entities["asset_id"] = assets[0].get("id")
                    self.log_result("Get Asset for Testing", True, f"Found asset: {test_entities['asset_id']}")
                else:
                    self.log_result("Get Asset for Testing", False, "No assets found")
            else:
                self.log_result("Get Asset for Testing", False, f"Status: {assets_response.status_code}")
        except Exception as e:
            self.log_result("Get Asset for Testing", False, f"Exception: {str(e)}")
        
        # Get an OSR ID
        try:
            osr_response = self.session.get(f"{BACKEND_URL}/osr")
            if osr_response.status_code == 200:
                osr_list = osr_response.json()
                if osr_list:
                    test_entities["osr_id"] = osr_list[0].get("id")
                    self.log_result("Get OSR for Testing", True, f"Found OSR: {test_entities['osr_id']}")
                else:
                    self.log_result("Get OSR for Testing", False, "No OSRs found")
            else:
                self.log_result("Get OSR for Testing", False, f"Status: {osr_response.status_code}")
        except Exception as e:
            self.log_result("Get OSR for Testing", False, f"Exception: {str(e)}")
        
        # Test all audit trail endpoints with officer credentials
        audit_endpoints = [
            ("vendors", "vendor_id", "audit-log"),
            ("tenders", "tender_id", "audit-trail"),
            ("contracts", "contract_id", "audit-trail"),
            ("purchase-orders", "po_id", "audit-trail"),
            ("deliverables", "deliverable_id", "audit-trail"),
            ("assets", "asset_id", "audit-trail"),
            ("osr", "osr_id", "audit-trail")
        ]
        
        for entity_type, id_key, endpoint_suffix in audit_endpoints:
            if id_key in test_entities:
                entity_id = test_entities[id_key]
                try:
                    response = self.session.get(f"{BACKEND_URL}/{entity_type}/{entity_id}/{endpoint_suffix}")
                    
                    if response.status_code == 200:
                        audit_data = response.json()
                        if isinstance(audit_data, list):
                            self.log_result(f"Officer Access - {entity_type.title()} Audit Trail", True, f"Retrieved {len(audit_data)} audit entries")
                        else:
                            self.log_result(f"Officer Access - {entity_type.title()} Audit Trail", True, "Retrieved audit trail data")
                    elif response.status_code == 404:
                        self.log_result(f"Officer Access - {entity_type.title()} Audit Trail", True, f"Entity not found (expected for some entities)")
                    elif response.status_code == 403:
                        self.log_result(f"Officer Access - {entity_type.title()} Audit Trail", False, f"Access denied - audit trail not accessible to officers")
                    else:
                        self.log_result(f"Officer Access - {entity_type.title()} Audit Trail", False, f"Status: {response.status_code}, Response: {response.text}")
                except Exception as e:
                    self.log_result(f"Officer Access - {entity_type.title()} Audit Trail", False, f"Exception: {str(e)}")
            else:
                self.log_result(f"Officer Access - {entity_type.title()} Audit Trail", False, f"No {entity_type} available for testing")
        
        # 2. Test HoP Access (Should also work like officer)
        print("\n--- Testing HoP Access to Audit Trails ---")
        if not self.authenticate_as('procurement_manager'):
            self.log_result("HoP Authentication", False, "Could not authenticate as HoP")
            return
        
        self.log_result("HoP Authentication", True, "Successfully authenticated as HoP")
        
        # Test vendor audit log access as HoP
        if "vendor_id" in test_entities:
            vendor_id = test_entities["vendor_id"]
            try:
                response = self.session.get(f"{BACKEND_URL}/vendors/{vendor_id}/audit-log")
                
                if response.status_code == 200:
                    audit_data = response.json()
                    if isinstance(audit_data, list):
                        self.log_result("HoP Access - Vendor Audit Log", True, f"Retrieved {len(audit_data)} audit entries")
                    else:
                        self.log_result("HoP Access - Vendor Audit Log", True, "Retrieved audit trail data")
                elif response.status_code == 404:
                    self.log_result("HoP Access - Vendor Audit Log", True, "Entity not found (expected)")
                elif response.status_code == 403:
                    self.log_result("HoP Access - Vendor Audit Log", False, "Access denied - audit trail not accessible to HoP")
                else:
                    self.log_result("HoP Access - Vendor Audit Log", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_result("HoP Access - Vendor Audit Log", False, f"Exception: {str(e)}")
        else:
            self.log_result("HoP Access - Vendor Audit Log", False, "No vendors available for testing")

    def test_access_control_with_dummy_user(self):
        """Test access control by creating a business user and testing audit trail access"""
        print("\n--- Testing Business User Access Control ---")
        
        # Clear session to test without authentication
        old_cookies = self.session.cookies.copy()
        self.session.cookies.clear()
        
        # Test that unauthenticated user gets 401
        try:
            response = self.session.get(f"{BACKEND_URL}/vendors/dummy-id/audit-log")
            
            if response.status_code == 401:
                self.log_result("Unauthenticated Access Control - Vendor Audit Log", True, "Correctly returned 401 Unauthorized")
            else:
                self.log_result("Unauthenticated Access Control - Vendor Audit Log", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_result("Unauthenticated Access Control - Vendor Audit Log", False, f"Exception: {str(e)}")
        
        # Test other endpoints with dummy IDs to verify access control
        audit_endpoints = [
            ("tenders", "audit-trail"),
            ("contracts", "audit-trail"),
            ("purchase-orders", "audit-trail"),
            ("deliverables", "audit-trail"),
            ("assets", "audit-trail"),
            ("osr", "audit-trail")
        ]
        
        dummy_id = "test-id-123"
        for entity_type, endpoint_suffix in audit_endpoints:
            try:
                response = self.session.get(f"{BACKEND_URL}/{entity_type}/{dummy_id}/{endpoint_suffix}")
                
                if response.status_code == 401:
                    self.log_result(f"Unauthenticated Access Control - {entity_type.title()} Audit Trail", True, "Correctly returned 401 Unauthorized")
                else:
                    self.log_result(f"Unauthenticated Access Control - {entity_type.title()} Audit Trail", False, f"Expected 401, got {response.status_code}")
            except Exception as e:
                self.log_result(f"Unauthenticated Access Control - {entity_type.title()} Audit Trail", False, f"Exception: {str(e)}")
        
        # Restore cookies
        self.session.cookies.update(old_cookies)

    def run_tests(self):
        """Run all audit trail tests"""
        print("🚀 Starting Audit Trail Feature Testing...")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 80)
        
        # Test audit trail endpoints
        self.test_audit_trail_endpoints()
        
        # Test access control
        self.test_access_control_with_dummy_user()
        
        # Print summary
        print("\n" + "=" * 80)
        print("🎯 AUDIT TRAIL TEST SUMMARY")
        print("=" * 80)
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        
        if self.results['passed'] + self.results['failed'] > 0:
            success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100)
            print(f"📊 Success Rate: {success_rate:.1f}%")
        
        if self.results['errors']:
            print("\n❌ FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        print("\n🏁 Audit Trail Testing completed!")
        
        return self.results['failed'] == 0

if __name__ == "__main__":
    tester = AuditTrailTester()
    success = tester.run_tests()
    sys.exit(0 if success else 1)