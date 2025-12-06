# ProcureFlix Simplified Vendor Creation Guide

## Overview

ProcureFlix now supports **simplified vendor creation** using the `VendorCreateRequest` model. This allows you to create vendors with minimal required fields, while the system automatically generates all necessary system fields.

## What Changed?

### Before (P1 - Full Model Required)
```json
{
  "id": "...",
  "vendor_number": "...",
  "name_english": "...",
  "commercial_name": "...",
  // ... 100+ fields required ...
  "risk_score": 0.0,
  "risk_category": "low",
  "status": "pending",
  "dd_required": false,
  "dd_completed": false,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z",
  // ... all DD fields ...
}
```

### After (P3 - Simplified Model)
```json
{
  "name_english": "Acme Corporation",
  "commercial_name": "Acme Corp",
  "entity_type": "Corporation",
  "vat_number": "VAT-ACME-2025",
  "cr_number": "CR-ACME-001",
  "cr_expiry_date": "2027-12-31T00:00:00Z",
  "cr_country_city": "USA / New York",
  "activity_description": "Manufacturing...",
  "number_of_employees": 500,
  "street": "789 Industrial Blvd",
  "building_no": "300",
  "city": "New York",
  "district": "Manhattan",
  "country": "USA",
  "mobile": "+1-212-555-0199",
  "email": "contact@acmecorp.example.com",
  "representative_name": "Jane Wilson",
  "representative_designation": "VP of Sales",
  "representative_id_type": "Passport",
  "representative_id_number": "US123456789",
  "representative_nationality": "USA",
  "representative_mobile": "+1-212-555-0200",
  "representative_email": "jane.wilson@acmecorp.example.com",
  "bank_account_name": "Acme Corporation",
  "bank_name": "Chase Bank",
  "bank_branch": "Manhattan Main Branch",
  "bank_country": "USA",
  "iban": "US98765432101234567890",
  "currency": "USD",
  "swift_code": "CHASUS33"
}
```

## Auto-Generated Fields

When you create a vendor using `VendorCreateRequest`, the system automatically generates:

| Field | Generated Value | Logic |
|-------|----------------|-------|
| `id` | UUID v4 | Unique identifier |
| `vendor_number` | `Vendor-YY-XXXX` | Auto-incremented based on creation date |
| `risk_score` | 0-100 | Calculated based on registration completeness |
| `risk_category` | `low`, `medium`, `high`, `very_high` | Determined by risk score |
| `status` | `pending_due_diligence` | Default for new vendors |
| `dd_required` | `true`/`false` | Based on risk category |
| `dd_completed` | `false` | Always false for new vendors |
| `created_at` | Current UTC timestamp | System timestamp |
| `updated_at` | Current UTC timestamp | System timestamp |

## API Endpoint

### Create Vendor (Simplified)

**Endpoint:** `POST /api/procureflix/vendors`

**Request Body:** `VendorCreateRequest` (application/json)

**Response:** Full `Vendor` model with auto-generated fields

**Status Codes:**
- `201 Created` - Vendor created successfully
- `400 Bad Request` - Validation error (missing required fields)
- `422 Unprocessable Entity` - Invalid data format

### Example Request

```bash
curl -X POST http://localhost:8001/api/procureflix/vendors \
  -H "Content-Type: application/json" \
  -d '{
    "name_english": "Acme Corporation",
    "commercial_name": "Acme Corp",
    "entity_type": "Corporation",
    "vendor_type": "international",
    "vat_number": "VAT-ACME-2025",
    "cr_number": "CR-ACME-001",
    "cr_expiry_date": "2027-12-31T00:00:00Z",
    "cr_country_city": "USA / New York",
    "activity_description": "Manufacturing and distribution",
    "number_of_employees": 500,
    "street": "789 Industrial Blvd",
    "building_no": "300",
    "city": "New York",
    "district": "Manhattan",
    "country": "USA",
    "mobile": "+1-212-555-0199",
    "email": "contact@acmecorp.example.com",
    "representative_name": "Jane Wilson",
    "representative_designation": "VP of Sales",
    "representative_id_type": "Passport",
    "representative_id_number": "US123456789",
    "representative_nationality": "USA",
    "representative_mobile": "+1-212-555-0200",
    "representative_email": "jane.wilson@acmecorp.example.com",
    "bank_account_name": "Acme Corporation",
    "bank_name": "Chase Bank",
    "bank_branch": "Manhattan Main Branch",
    "bank_country": "USA",
    "iban": "US98765432101234567890",
    "currency": "USD",
    "swift_code": "CHASUS33"
  }'
```

### Example Response

```json
{
  "id": "304eeb29-8d3a-437a-9d9e-22f5547e4aff",
  "vendor_number": "Vendor-25-0001",
  "vendor_type": "international",
  "name_english": "Acme Corporation",
  "commercial_name": "Acme Corp",
  "entity_type": "Corporation",
  "vat_number": "VAT-ACME-2025",
  "cr_number": "CR-ACME-001",
  "cr_expiry_date": "2027-12-31T00:00:00Z",
  "cr_country_city": "USA / New York",
  "activity_description": "Manufacturing and distribution",
  "number_of_employees": 500,
  "street": "789 Industrial Blvd",
  "building_no": "300",
  "city": "New York",
  "district": "Manhattan",
  "country": "USA",
  "mobile": "+1-212-555-0199",
  "email": "contact@acmecorp.example.com",
  "representative_name": "Jane Wilson",
  "representative_designation": "VP of Sales",
  "representative_id_type": "Passport",
  "representative_id_number": "US123456789",
  "representative_nationality": "USA",
  "representative_mobile": "+1-212-555-0200",
  "representative_email": "jane.wilson@acmecorp.example.com",
  "bank_account_name": "Acme Corporation",
  "bank_name": "Chase Bank",
  "bank_branch": "Manhattan Main Branch",
  "bank_country": "USA",
  "iban": "US98765432101234567890",
  "currency": "USD",
  "swift_code": "CHASUS33",
  "risk_score": 30.0,
  "risk_category": "high",
  "status": "pending_due_diligence",
  "dd_required": true,
  "dd_completed": false,
  "created_at": "2025-12-06T10:30:00Z",
  "updated_at": "2025-12-06T10:30:00Z",
  "owners_managers": [],
  "authorized_persons": [],
  "documents": [],
  "tags": []
}
```

## Required Fields

### Company Information
- `name_english` (string) - Company legal name
- `commercial_name` (string) - Trading name
- `entity_type` (string) - e.g., "LLC", "Ltd", "Corporation"
- `vendor_type` (enum) - "local" or "international"

### Registration & Tax
- `vat_number` (string) - VAT/Tax registration number
- `cr_number` (string) - Commercial registration number
- `cr_expiry_date` (datetime) - CR expiry date
- `cr_country_city` (string) - Format: "Country / City"

### Business Details
- `activity_description` (string) - Main business activity
- `number_of_employees` (integer) - Must be >= 1

### Address
- `street` (string)
- `building_no` (string)
- `city` (string)
- `district` (string)
- `country` (string)
- `mobile` (string)
- `email` (email) - Valid email address

### Representative
- `representative_name` (string)
- `representative_designation` (string)
- `representative_id_type` (string) - e.g., "Passport", "National ID"
- `representative_id_number` (string)
- `representative_nationality` (string)
- `representative_mobile` (string)
- `representative_email` (email)

### Banking
- `bank_account_name` (string)
- `bank_name` (string)
- `bank_branch` (string)
- `bank_country` (string)
- `iban` (string)
- `currency` (string) - Default: "USD"
- `swift_code` (string)

## Optional Fields

- `unified_number` (string)
- `license_number` (string)
- `license_expiry_date` (datetime)
- `landline` (string)
- `fax` (string)
- `representative_residence_tel` (string)
- `representative_phone_area_code` (string)
- `owners_managers` (array) - List of owner/manager objects
- `authorized_persons` (array) - List of authorized persons
- `documents` (array) - List of document URLs
- `tags` (array) - List of tags for categorization

## Risk Calculation Logic

The system calculates risk scores based on:

1. **Registration Completeness** (30 points)
   - CR expiry date proximity
   - License validity
   - VAT registration

2. **Due Diligence Requirements**
   - Determined by risk category
   - `high` or `very_high` risk → DD required
   - `low` or `medium` risk → DD may not be required

3. **Initial Status**
   - New vendors start as `pending_due_diligence`
   - After DD completion and approval → `approved`

## Existing Endpoints (Unchanged)

All other vendor endpoints remain unchanged and use the full `Vendor` model:

- `GET /api/procureflix/vendors` - List all vendors
- `GET /api/procureflix/vendors/{id}` - Get vendor details
- `PUT /api/procureflix/vendors/{id}` - Update vendor (full model)
- `POST /api/procureflix/vendors/{id}/status/{status}` - Change vendor status
- `GET /api/procureflix/vendors/{id}/ai/risk-explanation` - AI risk analysis

## Benefits

1. **Simplified Integration** - Frontend/API clients only need to provide essential fields
2. **Consistent System Fields** - Auto-generation ensures uniformity
3. **Reduced Errors** - Fewer fields = less chance of validation errors
4. **Better UX** - Shorter forms for users
5. **Backward Compatible** - Full vendor model still works for GET/PUT operations

## Migration Notes

- **No breaking changes** to existing GET/PUT endpoints
- Full `Vendor` model is still used for responses
- Existing vendors are unaffected
- SharePoint integration works with both models

## Future Enhancements

Potential improvements for future iterations:

1. Support bulk vendor creation
2. Add vendor import from CSV/Excel
3. Implement partial updates (PATCH)
4. Add vendor templates for common entity types
5. Support for vendor pre-qualification workflows

## Testing

The simplified vendor creation has been tested with:
- ✅ Valid minimal payload
- ✅ Auto-generation of system fields
- ✅ Risk calculation logic
- ✅ Integration with existing vendor services
- ✅ Backward compatibility with full model

## Support

For issues or questions about simplified vendor creation:
1. Check field validation in the request body
2. Verify all required fields are included
3. Review the API response for detailed error messages
4. Check backend logs for additional debugging info
