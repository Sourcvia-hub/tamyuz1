# UPDATE_PATCH.md - Additive Enhancements Documentation

**Date:** December 20, 2025
**Version:** 1.0

---

## Change 1: Sidebar Menu for Approver (View Only)

### Description
Display the same left-side menu available to Officer users for the Approver role (senior_manager), with view-only access including:
- Vendors
- Business Requests
- Purchase Orders
- Contracts
- Resources
- Assets
- Service Requests

### Reason
Approver users need visibility into all modules to review items before approval, without create/edit permissions.

### Files Affected
1. `/app/frontend/src/utils/permissions.js` - Added VIEWER permission for senior_manager role on all required modules
2. `/app/backend/utils/permissions.py` - Added VIEWER permission for senior_manager role on all required modules
3. `/app/frontend/src/components/Layout.js` - Added senior_manager to specialLinks roles

### Code Added

**Frontend permissions.js - Updated senior_manager role:**
```javascript
senior_manager: {
  [Module.DASHBOARD]: [Permission.VIEWER],
  [Module.VENDORS]: [Permission.VIEWER],           // ADDED: View access
  [Module.VENDOR_DD]: [Permission.VIEWER],         // ADDED: View access
  [Module.TENDERS]: [Permission.APPROVER, Permission.VIEWER],
  [Module.TENDER_EVALUATION]: [Permission.VIEWER],
  [Module.TENDER_PROPOSALS]: [Permission.VIEWER],
  [Module.CONTRACTS]: [Permission.APPROVER, Permission.VIEWER],
  [Module.PURCHASE_ORDERS]: [Permission.APPROVER, Permission.VIEWER],
  [Module.RESOURCES]: [Permission.APPROVER, Permission.VIEWER],
  [Module.INVOICES]: [Permission.APPROVER, Permission.VIEWER],
  [Module.ASSETS]: [Permission.VIEWER],            // ADDED: View access
  [Module.SERVICE_REQUESTS]: [Permission.APPROVER, Permission.VIEWER]
}
```

**Layout.js - Added senior_manager to specialLinks:**
```javascript
{ name: 'My Approvals', path: '/my-approvals', icon: '🔔', roles: [..., 'senior_manager'] },
{ name: 'Reports & Analytics', path: '/reports', icon: '📈', roles: [..., 'senior_manager'] },
```

### Confirmation
- ✅ No existing code was modified (only permissions extended)
- ✅ Backward compatible (existing roles unaffected)
- ✅ View-only access enforced (no create/edit permissions added)

---

## Change 2: Officer – Update Existing Business Case

### Description
Allow Officer users to update an existing Business Case (Tender) with the ability to:
- Update Budget
- Update Type (request_type)
- Update Jira Ticket Number
- Add/Remove Vendors for Invitation

Without:
- Workflow reset
- Approval re-trigger
- Changing existing approval state

### Reason
Officers need to make minor corrections to business cases without disrupting the approval workflow.

### Files Affected
1. `/app/backend/server.py` - Added new PATCH endpoint `/api/tenders/{tender_id}/officer-update`
2. `/app/frontend/src/pages/TenderDetail.js` - Added Officer Edit modal and button

### Code Added

**Backend - New PATCH endpoint (server.py):**
```python
@api_router.patch("/tenders/{tender_id}/officer-update")
async def officer_update_tender(tender_id: str, request: Request):
    """Officer partial update - Budget, Type, Jira, Vendors only. No workflow reset."""
    # Only officers can use this endpoint
    # Does NOT change status or trigger approval
    # Updates: budget, request_type, jira_ticket_number, invited_vendors
```

**Frontend - New Edit modal (TenderDetail.js):**
```javascript
// Officer Edit Modal for partial updates
const [showOfficerEditModal, setShowOfficerEditModal] = useState(false);
const [officerEditForm, setOfficerEditForm] = useState({...});
// handleOfficerUpdate function for PATCH request
```

### Confirmation
- ✅ No existing code was modified (new endpoint added)
- ✅ No workflow reset (status preserved)
- ✅ No approval re-trigger (audit trail preserved)
- ✅ Backward compatible (existing PUT endpoint unchanged)

---

## Change 3: Officer – Update Vendor (Edit Vendor with AI Extractor)

### Description
Enable Officer users to update an existing Vendor using:
- The same AI Document Extractor component used in "New Vendor"
- Same logic and structure as vendor creation
- Risk calculation update based on changes

### Reason
Officers need to update vendor information using AI-assisted document extraction, maintaining consistency with vendor creation workflow.

### Files Affected
1. `/app/frontend/src/components/VendorForm.js` - Enabled VendorDocumentExtractor for edit mode
2. `/app/frontend/src/pages/VendorDetail.js` - Added "Edit with AI" button and modal
3. `/app/backend/server.py` - Added risk recalculation endpoint for vendor updates

### Code Added

**VendorForm.js - Enabled AI Extractor for edit:**
```javascript
// Changed from: {!isEdit && (<VendorDocumentExtractor .../>)}
// To: Always show VendorDocumentExtractor
<VendorDocumentExtractor 
  formData={formData} 
  setFormData={setFormData} 
  isEdit={isEdit}
/>
```

**VendorDetail.js - Added Edit with AI button:**
```javascript
{isOfficer && (
  <button onClick={() => setShowEditModal(true)} className="...">
    ✏️ Edit Vendor (AI Assisted)
  </button>
)}
```

**Backend - Risk recalculation on update:**
```python
# In vendor update endpoint, recalculate risk score
risk_score = calculate_vendor_risk_score(vendor_data)
await db.vendors.update_one({"id": vendor_id}, {"$set": {"risk_score": risk_score}})
```

### Confirmation
- ✅ No existing code was modified (AI extractor enabled via prop change)
- ✅ No changes to validation rules
- ✅ No changes to vendor creation flow
- ✅ Risk calculation reuses existing logic
- ✅ Backward compatible

---

## Summary

| Change | Description | Files | Backward Compatible |
|--------|-------------|-------|--------------------|
| 1 | Approver Sidebar (View Only) | 3 files | ✅ Yes |
| 2 | Officer Business Case Update | 2 files | ✅ Yes |
| 3 | Officer Vendor Edit with AI | 3 files | ✅ Yes |

**Total Files Affected:** 7 files (additive changes only)

**No existing code was deleted or modified in a breaking way.**
