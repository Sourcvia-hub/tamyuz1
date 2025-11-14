#!/usr/bin/env python3
"""
Focused test for contract creation with vendor DD status checking
"""

import requests
import json
from datetime import datetime, timedelta, timezone

# Configuration
BASE_URL = "https://sourcevia-mgmt.preview.emergentagent.com/api"
TEST_USER = {"email": "procurement@test.com", "password": "password"}

class ContractDDTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
    def login(self):
        """Login with test user"""
        print(f"=== LOGIN ===")
        
        login_data = {
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        }
        
        try:
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
    
    def get_or_create_tender(self):
        """Get existing tender or create one for testing"""
        print(f"\n=== GET/CREATE TENDER ===")
        
        # First try to get existing approved tenders
        try:
            response = self.session.get(f"{BASE_URL}/tenders/approved/list")
            if response.status_code == 200:
                tenders = response.json()
                if tenders:
                    tender = tenders[0]
                    print(f"✅ Using existing tender: {tender.get('tender_number')} - {tender.get('title')}")
                    return tender.get('id')
        except Exception as e:
            print(f"⚠️ Could not get existing tenders: {str(e)}")
        
        # Create new tender if none exist
        tender_data = {
            "title": "Contract DD Test Tender",
            "description": "Test tender for contract DD status checking",
            "project_name": "DD Status Test Project",
            "requirements": "Software development with DD requirements testing",
            "budget": 500000.0,
            "deadline": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            "invited_vendors": []
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/tenders", json=tender_data)
            print(f"Create Tender Status: {response.status_code}")
            
            if response.status_code == 200:
                tender = response.json()
                tender_id = tender.get('id')
                tender_number = tender.get('tender_number')
                print(f"✅ Created new tender: {tender_number}")
                return tender_id
            else:
                print(f"❌ Failed to create tender: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Tender creation error: {str(e)}")
            return None
    
    def test_scenario_1_pending_dd_vendor(self, tender_id):
        """Scenario 1: Create contract with vendor that has pending DD"""
        print(f"\n=== SCENARIO 1: Contract with Pending DD Vendor ===")
        
        # Create vendor with checklist items (triggers pending_due_diligence status)
        vendor_data = {
            "name_english": "Pending DD Test Vendor",
            "commercial_name": "Pending DD Co",
            "vendor_type": "local",
            "entity_type": "LLC",
            "vat_number": "300123456789020",
            "cr_number": "1010123470",
            "cr_expiry_date": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
            "cr_country_city": "Riyadh, Saudi Arabia",
            "activity_description": "Software Development Services",
            "number_of_employees": 15,
            "street": "Test Street",
            "building_no": "100",
            "city": "Riyadh",
            "district": "Test District",
            "country": "Saudi Arabia",
            "mobile": "+966501234580",
            "email": "contact@pendingddtest.com",
            "representative_name": "Test Representative",
            "representative_designation": "CEO",
            "representative_id_type": "National ID",
            "representative_id_number": "1234567890",
            "representative_nationality": "Saudi",
            "representative_mobile": "+966501234580",
            "representative_email": "rep@pendingddtest.com",
            "bank_account_name": "Pending DD Test Vendor",
            "bank_name": "Test Bank",
            "bank_branch": "Test Branch",
            "bank_country": "Saudi Arabia",
            "iban": "SA0310000000123456789020",
            "currency": "SAR",
            "swift_code": "TESTCODE",
            
            # Checklist items to trigger pending_due_diligence status
            "dd_checklist_supporting_documents": True,
            "dd_checklist_related_party_checked": True,
            "dd_checklist_sanction_screening": True
        }
        
        try:
            # Create vendor
            vendor_response = self.session.post(f"{BASE_URL}/vendors", json=vendor_data)
            print(f"Create Vendor Status: {vendor_response.status_code}")
            
            if vendor_response.status_code != 200:
                print(f"❌ Failed to create vendor: {vendor_response.text}")
                return False
            
            vendor = vendor_response.json()
            vendor_id = vendor.get('id')
            vendor_status = vendor.get('status')
            
            print(f"✅ Vendor created: {vendor.get('name_english')}")
            print(f"Vendor Status: {vendor_status}")
            print(f"DD Completed: {vendor.get('dd_completed')}")
            
            # Verify vendor has pending DD status
            if vendor_status != "pending_due_diligence":
                print(f"❌ Expected vendor status 'pending_due_diligence', got '{vendor_status}'")
                return False
            
            # Create contract with this vendor
            contract_data = {
                "tender_id": tender_id,
                "vendor_id": vendor_id,
                "title": "Contract with Pending DD Vendor",
                "sow": "Test contract to verify DD status checking",
                "sla": "Standard SLA terms",
                "value": 300000.0,
                "start_date": datetime.now(timezone.utc).isoformat(),
                "end_date": (datetime.now(timezone.utc) + timedelta(days=180)).isoformat(),
                # Set outsourcing assessment to trigger DD requirements
                "a1_continuing_basis": True,
                "a2_could_be_undertaken_by_bank": True,
                "a3_is_insourcing_contract": False,
                "a4_market_data_providers": False,
                "a4_clearing_settlement": False,
                "a4_correspondent_banking": False,
                "a4_utilities": False,
                "a5_cloud_hosted": False,
                "milestones": []
            }
            
            contract_response = self.session.post(f"{BASE_URL}/contracts", json=contract_data)
            print(f"Create Contract Status: {contract_response.status_code}")
            
            if contract_response.status_code == 200:
                contract = contract_response.json()
                contract_status = contract.get('status')
                contract_number = contract.get('contract_number')
                outsourcing_classification = contract.get('outsourcing_classification')
                
                print(f"✅ Contract created: {contract_number}")
                print(f"Contract Status: {contract_status}")
                print(f"Outsourcing Classification: {outsourcing_classification}")
                
                # VERIFY: Contract status should be "pending_due_diligence"
                if contract_status == "pending_due_diligence":
                    print(f"✅ SCENARIO 1 PASSED: Contract status is 'pending_due_diligence' as expected")
                    return {"vendor_id": vendor_id, "contract_id": contract.get('id'), "success": True}
                else:
                    print(f"❌ SCENARIO 1 FAILED: Expected contract status 'pending_due_diligence', got '{contract_status}'")
                    return {"vendor_id": vendor_id, "contract_id": contract.get('id'), "success": False}
            else:
                print(f"❌ Failed to create contract: {contract_response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Scenario 1 error: {str(e)}")
            return False
    
    def test_scenario_2_completed_dd_vendor(self, tender_id):
        """Scenario 2: Create contract with vendor that has completed DD"""
        print(f"\n=== SCENARIO 2: Contract with Completed DD Vendor ===")
        
        # Create vendor with DD fields (should be approved with dd_completed=true)
        vendor_data = {
            "name_english": "Completed DD Test Vendor",
            "commercial_name": "Completed DD Co",
            "vendor_type": "local",
            "entity_type": "LLC",
            "vat_number": "300123456789021",
            "cr_number": "1010123471",
            "cr_expiry_date": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
            "cr_country_city": "Riyadh, Saudi Arabia",
            "activity_description": "IT Consulting Services",
            "number_of_employees": 25,
            "street": "Test Street 2",
            "building_no": "200",
            "city": "Riyadh",
            "district": "Test District 2",
            "country": "Saudi Arabia",
            "mobile": "+966501234581",
            "email": "contact@completedddtest.com",
            "representative_name": "Test Representative 2",
            "representative_designation": "Managing Director",
            "representative_id_type": "National ID",
            "representative_id_number": "2345678901",
            "representative_nationality": "Saudi",
            "representative_mobile": "+966501234581",
            "representative_email": "rep2@completedddtest.com",
            "bank_account_name": "Completed DD Test Vendor",
            "bank_name": "Test Bank 2",
            "bank_branch": "Test Branch 2",
            "bank_country": "Saudi Arabia",
            "iban": "SA0320000000123456789021",
            "currency": "SAR",
            "swift_code": "TESTCD2",
            
            # Include DD fields to mark as completed during creation
            "dd_ownership_change_last_year": False,
            "dd_location_moved_or_closed": False,
            "dd_bc_rely_on_third_parties": True,
            "dd_bc_strategy_exists": True,
            "dd_bc_certified_standard": True,
            "dd_bc_it_continuity_plan": True,
            "dd_fraud_internal_last_year": False,
            "dd_op_criminal_cases_last_3years": False,
            "dd_op_documented_procedures": True,
            "dd_hr_background_investigation": True,
            "dd_safety_procedures_exist": True
        }
        
        try:
            # Create vendor
            vendor_response = self.session.post(f"{BASE_URL}/vendors", json=vendor_data)
            print(f"Create Vendor Status: {vendor_response.status_code}")
            
            if vendor_response.status_code != 200:
                print(f"❌ Failed to create vendor: {vendor_response.text}")
                return False
            
            vendor = vendor_response.json()
            vendor_id = vendor.get('id')
            vendor_status = vendor.get('status')
            dd_completed = vendor.get('dd_completed')
            
            print(f"✅ Vendor created: {vendor.get('name_english')}")
            print(f"Vendor Status: {vendor_status}")
            print(f"DD Completed: {dd_completed}")
            
            # Note: Based on the code, when DD fields are provided during creation, 
            # the vendor should be approved with dd_completed=true
            
            # Create contract with this vendor (outsourcing to trigger DD check)
            contract_data = {
                "tender_id": tender_id,
                "vendor_id": vendor_id,
                "title": "Contract with Completed DD Vendor",
                "sow": "Test contract with vendor that has completed DD",
                "sla": "Standard SLA terms",
                "value": 400000.0,
                "start_date": datetime.now(timezone.utc).isoformat(),
                "end_date": (datetime.now(timezone.utc) + timedelta(days=180)).isoformat(),
                # Set outsourcing assessment to trigger DD requirements
                "a1_continuing_basis": True,
                "a2_could_be_undertaken_by_bank": True,
                "a3_is_insourcing_contract": False,
                "a4_market_data_providers": False,
                "a4_clearing_settlement": False,
                "a4_correspondent_banking": False,
                "a4_utilities": False,
                "a5_cloud_hosted": False,
                "milestones": []
            }
            
            contract_response = self.session.post(f"{BASE_URL}/contracts", json=contract_data)
            print(f"Create Contract Status: {contract_response.status_code}")
            
            if contract_response.status_code == 200:
                contract = contract_response.json()
                contract_status = contract.get('status')
                contract_number = contract.get('contract_number')
                outsourcing_classification = contract.get('outsourcing_classification')
                
                print(f"✅ Contract created: {contract_number}")
                print(f"Contract Status: {contract_status}")
                print(f"Outsourcing Classification: {outsourcing_classification}")
                
                # VERIFY: Contract status should be "approved" (since vendor DD is complete)
                if contract_status == "approved":
                    print(f"✅ SCENARIO 2 PASSED: Contract status is 'approved' as expected")
                    return {"vendor_id": vendor_id, "contract_id": contract.get('id'), "success": True}
                else:
                    print(f"❌ SCENARIO 2 FAILED: Expected contract status 'approved', got '{contract_status}'")
                    return {"vendor_id": vendor_id, "contract_id": contract.get('id'), "success": False}
            else:
                print(f"❌ Failed to create contract: {contract_response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Scenario 2 error: {str(e)}")
            return False
    
    def test_scenario_3_dd_completion_updates_contract(self, scenario1_result):
        """Scenario 3: Verify DD completion updates contract"""
        print(f"\n=== SCENARIO 3: DD Completion Updates Contract ===")
        
        if not scenario1_result or not scenario1_result.get('vendor_id') or not scenario1_result.get('contract_id'):
            print(f"❌ Cannot run scenario 3 without valid scenario 1 results")
            return False
        
        vendor_id = scenario1_result['vendor_id']
        contract_id = scenario1_result['contract_id']
        
        # Complete the DD questionnaire for the pending vendor
        dd_completion_data = {
            "dd_ownership_change_last_year": False,
            "dd_location_moved_or_closed": False,
            "dd_bc_rely_on_third_parties": True,
            "dd_bc_strategy_exists": True,
            "dd_bc_certified_standard": False,
            "dd_bc_it_continuity_plan": True,
            "dd_fraud_internal_last_year": False,
            "dd_fraud_burglary_theft_last_year": False,
            "dd_op_criminal_cases_last_3years": False,
            "dd_op_financial_issues_last_3years": False,
            "dd_op_documented_procedures": True,
            "dd_cyber_data_outside_ksa": False,
            "dd_safety_procedures_exist": True,
            "dd_hr_background_investigation": True,
            "dd_reg_regulated_by_authority": True,
            "dd_coi_relationship_with_bank": False,
            "dd_data_customer_data_policy": True,
            "dd_fcp_read_and_understood": True,
            "dd_fcp_will_comply": True
        }
        
        try:
            # Complete DD questionnaire
            dd_response = self.session.put(f"{BASE_URL}/vendors/{vendor_id}/due-diligence", json=dd_completion_data)
            print(f"Complete DD Status: {dd_response.status_code}")
            
            if dd_response.status_code == 200:
                dd_result = dd_response.json()
                print(f"✅ DD questionnaire completed successfully")
                print(f"Message: {dd_result.get('message')}")
                
                # Check if contract status is auto-updated
                contract_check_response = self.session.get(f"{BASE_URL}/contracts/{contract_id}")
                print(f"Check Contract Status: {contract_check_response.status_code}")
                
                if contract_check_response.status_code == 200:
                    updated_contract = contract_check_response.json()
                    updated_contract_status = updated_contract.get('status')
                    
                    print(f"Updated Contract Status: {updated_contract_status}")
                    
                    # VERIFY: Contract status should be auto-updated to "approved"
                    if updated_contract_status == "approved":
                        print(f"✅ SCENARIO 3 PASSED: Contract status auto-updated to 'approved' after DD completion")
                        return True
                    else:
                        print(f"❌ SCENARIO 3 FAILED: Expected contract status 'approved', got '{updated_contract_status}'")
                        return False
                else:
                    print(f"❌ Failed to retrieve contract: {contract_check_response.text}")
                    return False
            else:
                print(f"❌ Failed to complete DD questionnaire: {dd_response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Scenario 3 error: {str(e)}")
            return False
    
    def run_all_scenarios(self):
        """Run all test scenarios"""
        print("=" * 60)
        print("CONTRACT VENDOR DD STATUS CHECKING TEST")
        print("=" * 60)
        
        # Login first
        if not self.login():
            print("❌ Cannot proceed without authentication")
            return False
        
        # Get or create tender
        tender_id = self.get_or_create_tender()
        if not tender_id:
            print("❌ Cannot proceed without tender")
            return False
        
        # Run scenarios
        scenario1_result = self.test_scenario_1_pending_dd_vendor(tender_id)
        scenario2_result = self.test_scenario_2_completed_dd_vendor(tender_id)
        scenario3_result = self.test_scenario_3_dd_completion_updates_contract(scenario1_result)
        
        # Summary
        print(f"\n" + "=" * 60)
        print("TEST RESULTS SUMMARY")
        print("=" * 60)
        
        results = {
            "Scenario 1 (Pending DD Vendor)": scenario1_result and scenario1_result.get('success', False),
            "Scenario 2 (Completed DD Vendor)": scenario2_result and scenario2_result.get('success', False),
            "Scenario 3 (DD Completion Updates Contract)": scenario3_result
        }
        
        passed = 0
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name}: {status}")
            if result:
                passed += 1
        
        print(f"\nOverall: {passed}/{total} scenarios passed")
        
        if passed == total:
            print("🎉 All scenarios passed!")
            return True
        else:
            print("⚠️ Some scenarios failed - check details above")
            return False

if __name__ == "__main__":
    tester = ContractDDTester()
    success = tester.run_all_scenarios()
    exit(0 if success else 1)