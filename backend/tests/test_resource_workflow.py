"""
Resource Workflow API Tests
Tests the HoP approval workflow for resources:
- Forward to HoP
- HoP Approve
- HoP Reject
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://procurefix.preview.emergentagent.com')

# Test credentials
HOP_CREDENTIALS = {"email": "hop@sourcevia.com", "password": "Password123!"}
OFFICER_CREDENTIALS = {"email": "test_officer@sourcevia.com", "password": "Password123!"}

# Test resource ID
TEST_RESOURCE_ID = "8d36f60c-2e16-4efa-85ca-a8cc06f51831"


@pytest.fixture(scope="module")
def hop_session():
    """Login as HoP and return session with cookies"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json=HOP_CREDENTIALS)
    assert response.status_code == 200, f"HoP login failed: {response.text}"
    return session


@pytest.fixture(scope="module")
def officer_session():
    """Login as Officer and return session with cookies"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json=OFFICER_CREDENTIALS)
    assert response.status_code == 200, f"Officer login failed: {response.text}"
    return session


class TestResourceWorkflowStatus:
    """Test workflow status endpoint"""
    
    def test_get_workflow_status(self, hop_session):
        """Test getting workflow status for a resource"""
        response = hop_session.get(
            f"{BASE_URL}/api/entity-workflow/resource/{TEST_RESOURCE_ID}/workflow-status"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["entity_type"] == "resource"
        assert data["entity_id"] == TEST_RESOURCE_ID
        assert "requires_workflow" in data
        assert "actions" in data
        assert "workflow_status" in data
        print(f"Workflow status: {data['workflow_status']}")
    
    def test_workflow_status_has_actions(self, hop_session):
        """Test that workflow status includes available actions"""
        response = hop_session.get(
            f"{BASE_URL}/api/entity-workflow/resource/{TEST_RESOURCE_ID}/workflow-status"
        )
        assert response.status_code == 200
        
        data = response.json()
        actions = data.get("actions", {})
        
        # Verify action keys exist
        assert "can_forward_for_review" in actions
        assert "can_forward_to_hop" in actions
        assert "can_review" in actions
        assert "can_hop_decide" in actions


class TestForwardToHoP:
    """Test forwarding resource to HoP"""
    
    def test_officer_can_forward_to_hop(self, officer_session):
        """Test that officer can forward resource to HoP"""
        response = officer_session.post(
            f"{BASE_URL}/api/entity-workflow/resource/{TEST_RESOURCE_ID}/forward-to-hop",
            json={"notes": "Test forward from officer"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "Forwarded" in data["message"]
        print(f"Forward response: {data}")
    
    def test_status_changes_to_pending_hop_approval(self, hop_session):
        """Verify status changed to pending_hop_approval after forwarding"""
        response = hop_session.get(
            f"{BASE_URL}/api/entity-workflow/resource/{TEST_RESOURCE_ID}/workflow-status"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["workflow_status"] == "pending_hop_approval"
        assert data["actions"]["can_hop_decide"] == True
        print(f"Status after forward: {data['workflow_status']}")


class TestHoPDecision:
    """Test HoP approval/rejection"""
    
    def test_hop_can_approve(self, hop_session):
        """Test that HoP can approve a resource"""
        response = hop_session.post(
            f"{BASE_URL}/api/entity-workflow/resource/{TEST_RESOURCE_ID}/hop-decision",
            json={"decision": "approved", "notes": "Approved by HoP in test"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["final_status"] == "active"
        print(f"Approval response: {data}")
    
    def test_status_after_approval(self, hop_session):
        """Verify status after HoP approval"""
        response = hop_session.get(
            f"{BASE_URL}/api/entity-workflow/resource/{TEST_RESOURCE_ID}/workflow-status"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["workflow_status"] == "approved"
        assert data["hop_decision"] == "approved"
        assert data["status"] == "active"
        print(f"Status after approval: {data['status']}")


class TestHoPRejection:
    """Test HoP rejection flow"""
    
    def test_hop_can_reject(self, hop_session):
        """Test that HoP can reject a resource (requires reset first)"""
        # First, we need to reset the workflow status via direct DB or API
        # For this test, we'll just verify the rejection endpoint works
        # when the resource is in pending_hop_approval status
        
        # Get current status
        status_response = hop_session.get(
            f"{BASE_URL}/api/entity-workflow/resource/{TEST_RESOURCE_ID}/workflow-status"
        )
        current_status = status_response.json().get("workflow_status")
        
        if current_status == "pending_hop_approval":
            response = hop_session.post(
                f"{BASE_URL}/api/entity-workflow/resource/{TEST_RESOURCE_ID}/hop-decision",
                json={"decision": "rejected", "notes": "Rejected by HoP in test"}
            )
            assert response.status_code == 200
            
            data = response.json()
            assert data["success"] == True
            assert data["final_status"] == "rejected"
            print(f"Rejection response: {data}")
        else:
            pytest.skip(f"Resource not in pending_hop_approval status (current: {current_status})")


class TestInvalidEntityType:
    """Test error handling for invalid entity types"""
    
    def test_invalid_entity_type_returns_400(self, hop_session):
        """Test that invalid entity type returns 400 error"""
        response = hop_session.get(
            f"{BASE_URL}/api/entity-workflow/invalid_type/{TEST_RESOURCE_ID}/workflow-status"
        )
        assert response.status_code == 400
        
        data = response.json()
        assert "Invalid entity type" in data.get("detail", "")


class TestResourceNotFound:
    """Test error handling for non-existent resources"""
    
    def test_nonexistent_resource_returns_404(self, hop_session):
        """Test that non-existent resource returns 404"""
        response = hop_session.get(
            f"{BASE_URL}/api/entity-workflow/resource/nonexistent-id-12345/workflow-status"
        )
        assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
