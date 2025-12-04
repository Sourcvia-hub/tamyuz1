# SharePoint Integration Guide for Sourcevia

## 🎯 Overview

This guide provides step-by-step instructions for integrating Sourcevia with SharePoint as the primary data store. SharePoint will serve as the system of record, while Sourcevia acts as a UI + analysis layer on top.

---

## 📋 Prerequisites

1. **SharePoint Site**: Office 365 SharePoint Online site
2. **Permissions**: Site Owner or Site Collection Administrator
3. **Tools** (choose one):
   - SharePoint UI (manual setup)
   - PnP PowerShell (automated setup)
   - SharePoint REST API (programmatic setup)
   - Power Automate (workflow automation)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────┐
│         Sourcevia Frontend              │
│   (React - UI + Risk Analysis + AI)    │
└────────────┬────────────────────────────┘
             │ HTTP/REST
┌────────────▼────────────────────────────┐
│      Sourcevia Backend (FastAPI)        │
│   • Risk Scoring Engine                 │
│   • AI Analysis (OpenAI)                │
│   • Business Logic                      │
└────────────┬────────────────────────────┘
             │ SharePoint REST API
┌────────────▼────────────────────────────┐
│       SharePoint Online                 │
│   • Vendors List                        │
│   • Contracts List                      │
│   • Assets List                         │
│   • Document Libraries                  │
│   • All 15 modules as Lists             │
└─────────────────────────────────────────┘
```

---

## 📦 Step 1: Create SharePoint Lists

### Option A: Manual Creation (Recommended for small deployments)

For each module, create a SharePoint list:

1. **Navigate** to your SharePoint site
2. **Click** "New" → "List"
3. **Choose** "Blank list"
4. **Name** the list (e.g., "Vendors", "Contracts", "Assets")
5. **Add columns** based on schemas in `/json_schemas/`

#### Example: Creating Vendors List

1. Create list named "Vendors"
2. Add columns:
   - VendorID (Single line of text, Required, Indexed)
   - VendorNumber (Single line of text)
   - VendorType (Choice: local, international)
   - NameEnglish (Single line of text, Required)
   - CommercialName (Single line of text, Required)
   - VATNumber (Single line of text, Required)
   - ... (continue with all fields from vendors_schema.json)

### Option B: PowerShell Automation (Recommended for production)

```powershell
# Install PnP PowerShell if not already installed
Install-Module -Name PnP.PowerShell

# Connect to your SharePoint site
Connect-PnPOnline -Url "https://yourtenant.sharepoint.com/sites/sourcevia" -Interactive

# Create Vendors list
New-PnPList -Title "Vendors" -Template GenericList

# Add columns (example for a few key fields)
Add-PnPField -List "Vendors" -DisplayName "VendorID" -InternalName "VendorID" -Type Text -Required
Add-PnPField -List "Vendors" -DisplayName "VendorNumber" -InternalName "VendorNumber" -Type Text
Add-PnPField -List "Vendors" -DisplayName "VendorType" -InternalName "VendorType" -Type Choice -Choices @("local","international") -Required
Add-PnPField -List "Vendors" -DisplayName "NameEnglish" -InternalName "NameEnglish" -Type Text -Required
Add-PnPField -List "Vendors" -DisplayName "RiskScore" -InternalName "RiskScore" -Type Number -Required
Add-PnPField -List "Vendors" -DisplayName "RiskCategory" -InternalName "RiskCategory" -Type Choice -Choices @("low","medium","high") -Required

# Repeat for all 15 lists...
```

### Option C: SharePoint REST API (Programmatic)

See code examples in the backend integration section below.

---

## 📂 Step 2: Create Document Libraries

For file attachments, create document libraries:

```
Documents/
├── Vendors/
├── Tenders/
├── Proposals/
├── Contracts/
├── Invoices/
├── Resources/
├── Assets/
└── OSR/
```

### PowerShell:

```powershell
New-PnPList -Title "VendorDocuments" -Template DocumentLibrary
New-PnPList -Title "ContractDocuments" -Template DocumentLibrary
New-PnPList -Title "AssetDocuments" -Template DocumentLibrary
# ... etc
```

---

## 🔗 Step 3: Configure Lookup Relationships

SharePoint supports lookup columns for relationships. Configure these after creating all lists:

### Key Relationships:

1. **Proposals → Tenders**: Add Lookup column
   ```powershell
   Add-PnPField -List "Proposals" -DisplayName "Tender" -InternalName "TenderLookup" -Type Lookup -Required -LookupList "Tenders" -LookupField "Title"
   ```

2. **Contracts → Vendors**: Add Lookup column
   ```powershell
   Add-PnPField -List "Contracts" -DisplayName "Vendor" -InternalName "VendorLookup" -Type Lookup -Required -LookupList "Vendors" -LookupField "NameEnglish"
   ```

3. **Assets → Buildings**: Add Lookup column
   ```powershell
   Add-PnPField -List "Assets" -DisplayName "Building" -InternalName "BuildingLookup" -Type Lookup -Required -LookupList "Buildings" -LookupField "Title"
   ```

Continue for all 20 relationships documented in FIELD_DEFINITIONS.md.

---

## 💻 Step 4: Backend Integration

### 4.1 Install SharePoint Python SDK

```bash
pip install Office365-REST-Python-Client
```

### 4.2 Authentication Setup

**Option A: App Registration (Recommended for production)**

1. Go to Azure Portal → App Registrations
2. Create new app registration
3. Add SharePoint API permissions:
   - Sites.Read.All
   - Sites.ReadWrite.All
4. Generate client secret
5. Store credentials in `.env`:

```env
SHAREPOINT_SITE_URL=https://yourtenant.sharepoint.com/sites/sourcevia
SHAREPOINT_CLIENT_ID=your-client-id
SHAREPOINT_CLIENT_SECRET=your-client-secret
SHAREPOINT_TENANT_ID=your-tenant-id
```

**Option B: Username/Password (Development only)**

```env
SHAREPOINT_SITE_URL=https://yourtenant.sharepoint.com/sites/sourcevia
SHAREPOINT_USERNAME=user@yourtenant.onmicrosoft.com
SHAREPOINT_PASSWORD=your-password
```

### 4.3 Create SharePoint Repository Implementation

Create `/app/backend/repositories/sharepoint_repository.py`:

```python
from office365.runtime.auth.client_credential import ClientCredential
from office365.sharepoint.client_context import ClientContext
from typing import List, Optional, Dict, Any
from .base_repository import BaseRepository

class SharePointRepository(BaseRepository):
    \"\"\"SharePoint-based repository implementation.\"\"\"
    
    def __init__(self, list_name: str, site_url: str, client_id: str, client_secret: str):
        self.list_name = list_name
        self.site_url = site_url
        
        # Authenticate
        credentials = ClientCredential(client_id, client_secret)
        self.ctx = ClientContext(site_url).with_credentials(credentials)
        self.list = self.ctx.web.lists.get_by_title(list_name)
    
    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        \"\"\"Create item in SharePoint list.\"\"\"
        item = self.list.add_item(data).execute_query()
        return item.properties
    
    async def get_by_id(self, id: str) -> Optional[Dict[str, Any]]:
        \"\"\"Get item by ID from SharePoint.\"\"\"
        items = self.list.items.filter(f"VendorID eq '{id}'").get().execute_query()
        if len(items) > 0:
            return items[0].properties
        return None
    
    async def get_all(self, filters: Optional[Dict[str, Any]] = None, 
                     limit: Optional[int] = None) -> List[Dict[str, Any]]:
        \"\"\"Get all items from SharePoint list.\"\"\"
        query = self.list.items
        
        # Apply filters
        if filters:
            filter_str = self._build_filter(filters)
            query = query.filter(filter_str)
        
        # Apply limit
        if limit:
            query = query.top(limit)
        
        items = query.get().execute_query()
        return [item.properties for item in items]
    
    def _build_filter(self, filters: Dict[str, Any]) -> str:
        \"\"\"Build OData filter string from dictionary.\"\"\"
        conditions = []
        for key, value in filters.items():
            if isinstance(value, str):
                conditions.append(f"{key} eq '{value}'")
            elif isinstance(value, bool):
                conditions.append(f"{key} eq {str(value).lower()}")
            else:
                conditions.append(f"{key} eq {value}")
        return " and ".join(conditions)
    
    async def update(self, id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        \"\"\"Update item in SharePoint.\"\"\"
        item = await self.get_by_id(id)
        if item:
            sp_item = self.list.get_item_by_id(item['Id'])
            sp_item.update(data).execute_query()
            return sp_item.properties
        return None
    
    async def delete(self, id: str) -> bool:
        \"\"\"Delete item from SharePoint.\"\"\"
        item = await self.get_by_id(id)
        if item:
            self.list.get_item_by_id(item['Id']).delete_object().execute_query()
            return True
        return False
```

### 4.4 Update Repository Factory

Modify `/app/backend/repositories/repository_factory.py` to use SharePoint:

```python
from .sharepoint_repository import SharePointRepository
import os

class RepositoryFactory:
    def __init__(self, use_sharepoint: bool = True):
        self.use_sharepoint = use_sharepoint
        
        if use_sharepoint:
            self.site_url = os.getenv("SHAREPOINT_SITE_URL")
            self.client_id = os.getenv("SHAREPOINT_CLIENT_ID")
            self.client_secret = os.getenv("SHAREPOINT_CLIENT_SECRET")
    
    def _get_repo(self, list_name: str):
        if self.use_sharepoint:
            return SharePointRepository(
                list_name, 
                self.site_url, 
                self.client_id, 
                self.client_secret
            )
        else:
            return JSONRepository(list_name)
```

---

## 📊 Step 5: Data Migration (Optional)

If you have existing data in MongoDB or JSON:

### Export from MongoDB

```python
from pymongo import MongoClient
import json

client = MongoClient("mongodb://localhost:27017")
db = client.sourcevia

# Export vendors
vendors = list(db.vendors.find({}, {"_id": 0}))
with open("vendors_export.json", "w") as f:
    json.dump(vendors, f, indent=2, default=str)

# Repeat for all collections...
```

### Import to SharePoint

```python
import json
from office365.sharepoint.client_context import ClientContext

# Load exported data
with open("vendors_export.json", "r") as f:
    vendors = json.load(f)

# Connect to SharePoint
ctx = ClientContext(site_url).with_credentials(credentials)
vendors_list = ctx.web.lists.get_by_title("Vendors")

# Batch import
for vendor in vendors:
    # Map fields from MongoDB/JSON to SharePoint columns
    sharepoint_item = {
        "VendorID": vendor["id"],
        "VendorNumber": vendor.get("vendor_number"),
        "VendorType": vendor["vendor_type"],
        "NameEnglish": vendor["name_english"],
        # ... map all fields
    }
    vendors_list.add_item(sharepoint_item).execute_query()

print(f"Imported {len(vendors)} vendors")
```

---

## 🔒 Step 6: Security & Permissions

### List-Level Permissions

Configure permissions for each list based on roles:

1. **Vendors List**:
   - Procurement Officers: Read, Write
   - Managers: Read, Approve
   - Admin: Full Control

2. **Contracts List**:
   - Procurement Managers: Read, Write
   - Senior Managers: Read, Approve
   - Admin: Full Control

### Item-Level Permissions (Optional)

For sensitive data, configure item-level permissions:

```powershell
# Example: Restrict specific vendor
$item = Get-PnPListItem -List "Vendors" -Id 1
Set-PnPListItemPermission -List "Vendors" -Identity $item -User "john@company.com" -AddRole "Read"
```

---

## 🧪 Step 7: Testing

### 7.1 Test SharePoint Connection

```python
# test_sharepoint.py
from office365.sharepoint.client_context import ClientContext
from office365.runtime.auth.client_credential import ClientCredential

site_url = "https://yourtenant.sharepoint.com/sites/sourcevia"
credentials = ClientCredential(client_id, client_secret)
ctx = ClientContext(site_url).with_credentials(credentials)

# Test connection
web = ctx.web.get().execute_query()
print(f"Connected to: {web.title}")

# Test list access
vendors_list = ctx.web.lists.get_by_title("Vendors")
vendors = vendors_list.items.get().execute_query()
print(f"Found {len(vendors)} vendors")
```

### 7.2 Test CRUD Operations

```python
# Create
new_vendor = {
    "VendorID": "test-123",
    "NameEnglish": "Test Vendor",
    "VendorType": "local"
}
item = vendors_list.add_item(new_vendor).execute_query()
print(f"Created vendor: {item.properties['Id']}")

# Read
vendors = vendors_list.items.filter("VendorID eq 'test-123'").get().execute_query()
print(f"Found: {vendors[0].properties['NameEnglish']}")

# Update
vendors[0].update({"NameEnglish": "Updated Vendor"}).execute_query()

# Delete
vendors[0].delete_object().execute_query()
```

---

## 📱 Step 8: Frontend Integration

Update frontend to work with SharePoint-backed API:

### API Configuration

No changes needed! The backend abstracts SharePoint, so frontend continues to use the same REST endpoints:

```javascript
// frontend/src/config/api.js
const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// All existing API calls work as-is
export const getVendors = () => axios.get(`${API_URL}/vendors`);
export const createVendor = (data) => axios.post(`${API_URL}/vendors`, data);
```

---

## 🚀 Step 9: Deployment

### 9.1 Update Environment Variables

```env
# .env.production
SHAREPOINT_SITE_URL=https://yourtenant.sharepoint.com/sites/sourcevia
SHAREPOINT_CLIENT_ID=your-production-client-id
SHAREPOINT_CLIENT_SECRET=your-production-secret
SHAREPOINT_TENANT_ID=your-tenant-id
USE_SHAREPOINT=true
```

### 9.2 Deploy Backend

```bash
# Install SharePoint dependencies
pip install Office365-REST-Python-Client

# Update requirements.txt
pip freeze > requirements.txt

# Deploy to your hosting platform
# (same process as before, just with new env vars)
```

---

## 📈 Step 10: Monitoring & Optimization

### Performance Optimization

1. **Batch Requests**: Use SharePoint batch API for bulk operations
2. **Indexed Columns**: Ensure ID fields are indexed
3. **Caching**: Implement Redis cache for frequently accessed data
4. **Pagination**: Use SharePoint's $top and $skip for large lists

### Monitoring

1. **SharePoint Audit Logs**: Track all list operations
2. **Application Insights**: Monitor API performance
3. **SharePoint Usage Reports**: Track storage and limits

---

## 🛠️ Troubleshooting

### Common Issues

**Issue**: "Access Denied" errors
- **Solution**: Check app registration permissions in Azure AD

**Issue**: "List not found"
- **Solution**: Verify list name matches exactly (case-sensitive)

**Issue**: Slow performance
- **Solution**: Add indexes to frequently queried columns, implement caching

**Issue**: JSON field truncation
- **Solution**: Use Multiple Lines of Text field type with rich text disabled

---

## 📚 Additional Resources

- [SharePoint REST API Reference](https://docs.microsoft.com/en-us/sharepoint/dev/sp-add-ins/get-to-know-the-sharepoint-rest-service)
- [PnP PowerShell Documentation](https://pnp.github.io/powershell/)
- [Office365 Python Client](https://github.com/vgrem/Office365-REST-Python-Client)

---

## 📞 Support

For issues specific to:
- **SharePoint setup**: Contact your SharePoint admin
- **Schema questions**: Refer to FIELD_DEFINITIONS.md
- **Integration issues**: Check backend logs and SharePoint ULS logs

---

**Version**: 1.0  
**Last Updated**: December 2024  
**For**: Sourcevia Procurement Management System
