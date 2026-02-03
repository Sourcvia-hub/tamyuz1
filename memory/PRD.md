# Sourcevia Procurement Platform - PRD

## Original Problem Statement
Enterprise procurement management platform with approval workflows, contract governance, vendor management, and comprehensive reporting capabilities.

## Core Architecture
- **Frontend**: React with Tailwind CSS, Shadcn/UI components
- **Backend**: FastAPI (Python) 
- **Database**: MongoDB
- **Authentication**: Session-based with role-based access control (RBAC)

## User Roles
| Role | Description |
|------|-------------|
| HoP (Head of Procurement) | Final approver for all workflows |
| Procurement Officer | Manages day-to-day procurement operations |
| Senior Manager (Approver) | Can approve workflows |
| Business User | Can create and submit requests |

## What's Been Implemented

### Session: February 3, 2026

#### Bug Fixes Completed
1. **PDF Export Fix** - Resolved `doc.autoTable is not a function` error
2. **PO & Resource stuck in approvals** - Fixed items remaining in "My Approvals" after HoP approval:
   - Added resources to the `my-pending-approvals` endpoint query
   - Added resource notification filtering to mark processed notifications
   - Fixed PO approval endpoint (was using wrong entity type)
   - Added full resource support to frontend (labels, colors, navigation, approve/reject handlers)
   - Changed import from `import 'jspdf-autotable'` to `import autoTable from 'jspdf-autotable'`
   - Updated calls from `doc.autoTable(...)` to `autoTable(doc, ...)`
   - File: `/app/frontend/src/utils/pdfExport.js`

#### Features Completed  
1. **Universal File Attachments** - Integrated `Attachments.js` component into all entity detail pages:
   - VendorDetail.js ✅
   - ContractDetail.js ✅
   - PurchaseOrderDetail.js ✅
   - TenderDetail.js ✅
   - Component supports upload/download with proper entity type mapping

2. **Export/Print Functionality** - All detail pages now have:
   - Export PDF button (generates branded PDF documents)
   - Print button (triggers browser print dialog)

### Previous Session Work
- Reports & Analytics page with Regular/Expert differentiation
- My Approvals page bug fixes (loading, navigation, duplicates)
- Audit Trail unified data merging
- HoP approval workflow fixes
- CCTV/Access Management page permissions for Officers
- OpenAI integration fixes

## Prioritized Backlog

### P1 - High Priority
- **CCTV & Access Management Integration** - Awaiting URLs from user to embed external systems via iframe

### P2 - Medium Priority
- **UI/UX Polish** - Sitewide review of consistency, fonts, component styles

### P3 - Future
- **SharePoint Live Integration**
- **Centralized RBAC Service** - Replace scattered permission checks

## Key Files Reference
- `/app/frontend/src/utils/pdfExport.js` - PDF generation utilities
- `/app/frontend/src/components/Attachments.js` - Reusable file attachment component
- `/app/frontend/src/pages/*Detail.js` - Entity detail pages
- `/app/backend/routes/business_request_workflow.py` - Complex approval workflow logic
- `/app/backend/server.py` - Main API endpoints including file upload/download

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| HoP | hop@sourcevia.com | Password123! |
| Officer | test_officer@sourcevia.com | Password123! |
| Approver | approver@sourcevia.com | Password123! |
| Business User | businessuser@sourcevia.com | Password123! |
