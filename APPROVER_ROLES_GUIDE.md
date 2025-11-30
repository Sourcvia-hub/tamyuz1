# 👤 Approver Roles in Sourcevia Procurement System

## What is an "Approver"?

**Approver** is a permission level in the Role-Based Access Control (RBAC) system. Users with APPROVER permission can approve items in various modules like tenders, contracts, purchase orders, invoices, etc.

## Permission Hierarchy

The system has the following permission hierarchy (highest to lowest):

1. **CONTROLLER** - Full control (admin only)
2. **APPROVER** - Can approve items ⭐
3. **VERIFIER** - Can verify items
4. **REQUESTER** - Can create/request items
5. **VIEWER** - Can only view items
6. **NO_ACCESS** - Cannot access module

## User Roles with APPROVER Permission

### 1. Senior Manager (`senior_manager`)

**APPROVER Permission For:**
- ✅ Tenders & Tender Evaluation
- ✅ Contracts
- ✅ Purchase Orders
- ✅ Resources
- ✅ Invoices

**No APPROVER Access:**
- ❌ Vendors (only VIEWER)
- ❌ Assets (NO_ACCESS)

**Use Case:** Senior managers can approve high-level procurement decisions but cannot manage vendors or assets.

### 2. Procurement Manager (`procurement_manager`)

**APPROVER Permission For:**
- ✅ All modules (Vendors, Tenders, Contracts, POs, Resources, Invoices, Assets, Service Requests)

**Use Case:** Procurement managers have full approval authority across all procurement operations.

### 3. Admin (`admin`)

**Permission:** CONTROLLER (higher than APPROVER)
- ✅ Full access to all modules
- ✅ Can perform all actions including approve

**Use Case:** System administrators have complete control over the system.

## Test Users with Approver Access

Based on the system setup, you should have these test users:

### Admin User (Has CONTROLLER permission - includes approval)
```
Email: admin@sourcevia.com
Password: admin123
Role: admin
Permissions: Full access to everything
```

### Procurement Officer (No APPROVER permission)
```
Email: po@sourcevia.com
Password: po123456
Role: procurement_officer
Permissions: Can create and verify, but CANNOT approve
```

### Regular User (No APPROVER permission)
```
Email: user@sourcevia.com
Password: user12345
Role: user
Permissions: Can only request/create items, CANNOT approve
```

## How to Create Users with Approver Permission

To create users with approver access, use one of these roles:

### Option 1: Senior Manager
```python
{
    "email": "senior@sourcevia.com",
    "password": "senior123",
    "name": "Senior Manager",
    "role": "senior_manager"  # Has APPROVER permission
}
```

### Option 2: Procurement Manager
```python
{
    "email": "procmgr@sourcevia.com",
    "password": "procmgr123",
    "name": "Procurement Manager",
    "role": "procurement_manager"  # Has APPROVER permission for all modules
}
```

## Available User Roles

The system supports these roles:

1. **user** - Regular user (requester only)
2. **direct_manager** - Team manager (verifier)
3. **procurement_officer** - PO (requester + verifier)
4. **senior_manager** - Senior Manager (approver) ⭐
5. **procurement_manager** - Procurement Manager (approver for all) ⭐
6. **admin** - System Administrator (controller)

## Creating Approver Users

### Using Registration Endpoint:

```bash
curl -X POST https://sourcevia-secure.emergent.host/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "senior@sourcevia.com",
    "password": "senior123",
    "name": "Senior Manager",
    "role": "senior_manager"
  }'
```

### Using Direct Database Insert:

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

senior_manager = {
    "id": "senior-001",
    "email": "senior@sourcevia.com",
    "password": pwd_context.hash("senior123"),
    "name": "Senior Manager",
    "role": "senior_manager",
    "department": "Management",
    "created_at": datetime.now(timezone.utc)
}

procurement_manager = {
    "id": "procmgr-001",
    "email": "procmgr@sourcevia.com",
    "password": pwd_context.hash("procmgr123"),
    "name": "Procurement Manager",
    "role": "procurement_manager",
    "department": "Procurement",
    "created_at": datetime.now(timezone.utc)
}

await db.users.insert_many([senior_manager, procurement_manager])
```

## Checking Approver Permissions in Code

### Backend (Python):
```python
from utils.permissions import can_approve, Module

# Check if user can approve tenders
if can_approve(user_role, Module.TENDERS):
    # User can approve tenders
    pass
```

### Frontend (JavaScript):
```javascript
import { canApprove, Module } from './utils/permissions';

// Check if user can approve contracts
if (canApprove(userRole, Module.CONTRACTS)) {
    // Show approve button
}
```

## Summary

**To have "approver" functionality, you need users with one of these roles:**

1. ⭐ **Senior Manager** (`senior_manager`) - Can approve most items
2. ⭐ **Procurement Manager** (`procurement_manager`) - Can approve everything
3. ⭐ **Admin** (`admin`) - Full control including approval

**Current test users (based on handoff):**
- ✅ `admin@sourcevia.com` - Has approval rights (admin role)
- ❌ `po@sourcevia.com` - NO approval rights (procurement_officer)
- ❌ `user@sourcevia.com` - NO approval rights (user)

**To add approvers, create users with `senior_manager` or `procurement_manager` roles.**
