# Complete Field Definitions for SharePoint Integration

This document provides detailed definitions for all fields across all modules in the Sourcevia Procurement Management System.

---

## 1. USERS MODULE

**SharePoint List Name**: `Users`

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| id | String (UUID) | Yes | Unique identifier | Single line of text |
| email | String (Email) | Yes | User email address | Single line of text |
| name | String | Yes | User full name | Single line of text |
| password | String | No | Hashed password (stored securely) | Single line of text |
| role | Choice | Yes | User role | Choice (user, direct_manager, procurement_officer, senior_manager, procurement_manager, admin) |
| created_at | DateTime | Yes | Account creation timestamp | Date and Time |

### User Roles
- `user`: Regular user/requester
- `direct_manager`: Direct manager (approval authority)
- `procurement_officer`: Procurement officer
- `senior_manager`: Senior manager
- `procurement_manager`: Procurement manager
- `admin`: System administrator

---

## 2. VENDORS MODULE

**SharePoint List Name**: `Vendors`

### Basic Information

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| id | String (UUID) | Yes | Unique identifier | Single line of text |
| vendor_number | String | No | Auto-generated (e.g., Vendor-25-0001) | Single line of text |
| vendor_type | Choice | Yes | Local or International | Choice (local, international) |
| name_english | String | Yes | Company name in English | Single line of text |
| commercial_name | String | Yes | Commercial/trade name | Single line of text |
| entity_type | String | Yes | Legal entity type | Single line of text |
| vat_number | String | Yes | VAT registration number | Single line of text |
| unified_number | String | No | Unified number (Saudi) | Single line of text |
| cr_number | String | Yes | Commercial registration number | Single line of text |
| cr_expiry_date | DateTime | Yes | CR expiry date | Date and Time |
| cr_country_city | String | Yes | CR registration location | Single line of text |
| license_number | String | No | Business license number | Single line of text |
| license_expiry_date | DateTime | No | License expiry date | Date and Time |
| activity_description | String | Yes | Business activity description | Multiple lines of text |
| number_of_employees | Number | Yes | Total number of employees | Number |

### Address and Contact

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| street | String | Yes | Street address | Single line of text |
| building_no | String | Yes | Building number | Single line of text |
| city | String | Yes | City | Single line of text |
| district | String | Yes | District/Area | Single line of text |
| country | String | Yes | Country | Single line of text |
| mobile | String | Yes | Mobile phone | Single line of text |
| landline | String | No | Landline phone | Single line of text |
| fax | String | No | Fax number | Single line of text |
| email | String (Email) | Yes | Company email | Single line of text |

### Representative Information

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| representative_name | String | Yes | Representative full name | Single line of text |
| representative_designation | String | Yes | Job title/position | Single line of text |
| representative_id_type | String | Yes | ID document type | Single line of text |
| representative_id_number | String | Yes | ID/passport number | Single line of text |
| representative_nationality | String | Yes | Nationality | Single line of text |
| representative_mobile | String | Yes | Mobile phone | Single line of text |
| representative_residence_tel | String | No | Residence telephone | Single line of text |
| representative_phone_area_code | String | No | Phone area code | Single line of text |
| representative_email | String (Email) | Yes | Representative email | Single line of text |

### Bank Account Information

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| bank_account_name | String | Yes | Account holder name | Single line of text |
| bank_name | String | Yes | Bank name | Single line of text |
| bank_branch | String | Yes | Branch name/location | Single line of text |
| bank_country | String | Yes | Bank country | Single line of text |
| iban | String | Yes | IBAN number | Single line of text |
| currency | String | Yes | Account currency | Single line of text |
| swift_code | String | Yes | SWIFT/BIC code | Single line of text |

### System Fields

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| risk_score | Number | Yes | Calculated risk score (0-15) | Number |
| risk_category | Choice | Yes | Risk classification | Choice (low, medium, high) |
| risk_assessment_details | JSON | No | Risk calculation breakdown | Multiple lines of text |
| status | Choice | Yes | Vendor status | Choice (pending, pending_due_diligence, approved, rejected, blacklisted) |
| evaluation_notes | String | No | Admin evaluation notes | Multiple lines of text |
| created_by | String | No | User ID who created | Single line of text |
| created_at | DateTime | Yes | Creation timestamp | Date and Time |
| updated_at | DateTime | Yes | Last update timestamp | Date and Time |
| owners_managers | JSON Array | No | List of owners/managers | Multiple lines of text |
| authorized_persons | JSON Array | No | List of authorized persons | Multiple lines of text |
| documents | JSON Array | No | List of document file paths | Multiple lines of text |

### Due Diligence Fields

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| dd_required | Boolean | Yes | DD questionnaire required | Yes/No |
| dd_completed | Boolean | Yes | DD completed flag | Yes/No |
| dd_completed_by | String | No | User ID who completed DD | Single line of text |
| dd_completed_at | DateTime | No | DD completion timestamp | Date and Time |
| dd_approved_by | String | No | User ID who approved DD | Single line of text |
| dd_approved_at | DateTime | No | DD approval timestamp | Date and Time |

**Due Diligence Questionnaire** (70+ fields - see Vendor Due Diligence section below)

---

## 3. TENDERS MODULE

**SharePoint List Name**: `Tenders`

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| id | String (UUID) | Yes | Unique identifier | Single line of text |
| tender_number | String | No | Auto-generated (TND-2025-0001) | Single line of text |
| title | String | Yes | Tender title | Single line of text |
| description | String | Yes | Detailed description | Multiple lines of text |
| project_name | String | Yes | Project name | Single line of text |
| requirements | String | Yes | Technical requirements | Multiple lines of text |
| budget | Number | Yes | Budget amount | Number (Currency) |
| deadline | DateTime | Yes | Submission deadline | Date and Time |
| invited_vendors | JSON Array | No | List of vendor IDs invited | Multiple lines of text |
| status | Choice | Yes | Tender status | Choice (draft, published, closed, awarded) |
| created_by | String | No | User ID who created | Single line of text |
| awarded_to | String | No | Vendor ID (winner) | Single line of text |
| created_at | DateTime | Yes | Creation timestamp | Date and Time |
| updated_at | DateTime | Yes | Last update timestamp | Date and Time |

---

## 4. PROPOSALS MODULE

**SharePoint List Name**: `Proposals`

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| id | String (UUID) | Yes | Unique identifier | Single line of text |
| proposal_number | String | No | Auto-generated (PRO-2025-0001) | Single line of text |
| tender_id | String | Yes | Reference to Tender | Lookup (Tenders) |
| vendor_id | String | Yes | Reference to Vendor | Lookup (Vendors) |
| technical_proposal | String | Yes | Technical proposal details | Multiple lines of text |
| financial_proposal | Number | Yes | Quoted amount | Number (Currency) |
| status | Choice | Yes | Proposal status | Choice (submitted, approved, rejected) |
| documents | JSON Array | No | List of document paths | Multiple lines of text |
| submitted_at | DateTime | Yes | Submission timestamp | Date and Time |

### Evaluation Fields

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| evaluation | JSON | No | Evaluation criteria scores | Multiple lines of text |
| evaluated_by | String | No | User ID who evaluated | Single line of text |
| evaluated_at | DateTime | No | Evaluation timestamp | Date and Time |
| technical_score | Number | No | Legacy technical score | Number |
| financial_score | Number | No | Legacy financial score | Number |
| final_score | Number | No | Legacy final score | Number |

### Evaluation Criteria (JSON structure)

```json
{
  "vendor_reliability_stability": 0.0,  // Score 1-5
  "delivery_warranty_backup": 0.0,  // Score 1-5
  "technical_experience": 0.0,  // Score 1-5
  "cost_score": 0.0,  // Score 1-5
  "meets_requirements": 0.0,  // Score 1-5
  "vendor_reliability_weighted": 0.0,  // 20% weight
  "delivery_warranty_weighted": 0.0,  // 20% weight
  "technical_experience_weighted": 0.0,  // 10% weight
  "cost_weighted": 0.0,  // 10% weight
  "meets_requirements_weighted": 0.0,  // 40% weight
  "total_score": 0.0  // Sum (100%)
}
```

---

## 5. CONTRACTS MODULE

**SharePoint List Name**: `Contracts`

### Basic Information

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| id | String (UUID) | Yes | Unique identifier | Single line of text |
| contract_number | String | No | Auto-generated (Contract-25-0001) | Single line of text |
| tender_id | String | Yes | Reference to approved tender | Lookup (Tenders) |
| vendor_id | String | Yes | Reference to vendor | Lookup (Vendors) |
| title | String | Yes | Contract title | Single line of text |
| sow | String | Yes | Statement of Work | Multiple lines of text |
| sla | String | Yes | Service Level Agreement | Multiple lines of text |
| milestones | JSON Array | No | Contract milestones | Multiple lines of text |
| value | Number | Yes | Contract value | Number (Currency) |
| start_date | DateTime | Yes | Contract start date | Date and Time |
| end_date | DateTime | Yes | Contract end date | Date and Time |
| is_outsourcing | Boolean | Yes | Outsourcing flag | Yes/No |
| is_noc | Boolean | Yes | NOC required flag | Yes/No |
| status | Choice | Yes | Contract status | Choice (draft, under_review, pending_due_diligence, approved, active, expired) |
| terminated | Boolean | Yes | Termination flag | Yes/No |
| terminated_by | String | No | User ID who terminated | Single line of text |
| terminated_at | DateTime | No | Termination timestamp | Date and Time |
| termination_reason | String | No | Reason for termination | Multiple lines of text |
| created_by | String | No | User ID who created | Single line of text |
| approved_by | String | No | User ID who approved | Single line of text |
| documents | JSON Array | No | List of document paths | Multiple lines of text |
| created_at | DateTime | Yes | Creation timestamp | Date and Time |
| updated_at | DateTime | Yes | Last update timestamp | Date and Time |

### Outsourcing Assessment - Section A

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| a1_continuing_basis | Boolean | No | Service on continuing basis | Yes/No |
| a1_period | String | No | Service period duration | Single line of text |
| a2_could_be_undertaken_by_bank | Boolean | No | Could be done by bank | Yes/No |
| a3_is_insourcing_contract | Boolean | No | Insourcing contract | Yes/No |
| a4_market_data_providers | Boolean | No | Market data providers | Yes/No |
| a4_clearing_settlement | Boolean | No | Clearing/settlement | Yes/No |
| a4_correspondent_banking | Boolean | No | Correspondent banking | Yes/No |
| a4_utilities | Boolean | No | Utilities service | Yes/No |
| a5_cloud_hosted | Boolean | No | Cloud-hosted service | Yes/No |
| outsourcing_classification | String | No | Calculated classification | Choice (not_outsourcing, outsourcing, insourcing, exempted, cloud_computing) |

### Outsourcing Assessment - Section B (Materiality)

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| b1_material_impact_if_disrupted | Boolean | No | Material impact if disrupted | Yes/No |
| b2_financial_impact | Boolean | No | Financial impact | Yes/No |
| b3_reputational_impact | Boolean | No | Reputational impact | Yes/No |
| b4_outside_ksa | Boolean | No | Service outside KSA | Yes/No |
| b5_difficult_alternative | Boolean | No | Difficult to find alternative | Yes/No |
| b6_data_transfer | Boolean | No | Data transfer involved | Yes/No |
| b7_affiliation_relationship | Boolean | No | Affiliation relationship | Yes/No |
| b8_regulated_activity | Boolean | No | Regulated activity | Yes/No |

---

## 6. PURCHASE ORDERS MODULE

**SharePoint List Name**: `PurchaseOrders`

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| id | String (UUID) | Yes | Unique identifier | Single line of text |
| po_number | String | No | Auto-generated (PO-25-0001) | Single line of text |
| tender_id | String | No | Optional tender reference | Lookup (Tenders) |
| vendor_id | String | Yes | Reference to vendor | Lookup (Vendors) |
| items | JSON Array | Yes | List of PO items | Multiple lines of text |
| total_amount | Number | Yes | Total PO amount | Number (Currency) |
| delivery_time | String | No | Delivery timeline | Single line of text |
| risk_level | String | Yes | Risk level from vendor | Single line of text |
| has_data_access | Boolean | Yes | Data access required | Yes/No |
| has_onsite_presence | Boolean | Yes | Onsite presence required | Yes/No |
| has_implementation | Boolean | Yes | Implementation involved | Yes/No |
| duration_more_than_year | Boolean | Yes | Duration > 1 year | Yes/No |
| amount_over_million | Boolean | Yes | Amount > 1 million | Yes/No |
| requires_contract | Boolean | Yes | Contract required (calculated) | Yes/No |
| converted_to_contract | Boolean | Yes | Converted to contract flag | Yes/No |
| contract_id | String | No | Resulting contract ID | Single line of text |
| status | Choice | Yes | PO status | Choice (draft, issued, converted_to_contract, cancelled) |
| created_by | String | No | User ID who created | Single line of text |
| created_at | DateTime | Yes | Creation timestamp | Date and Time |
| updated_at | DateTime | Yes | Last update timestamp | Date and Time |

### PO Item Structure (JSON)

```json
{
  "name": "Item name",
  "description": "Item description",
  "quantity": 10.0,
  "price": 100.0,
  "total": 1000.0
}
```

---

## 7. INVOICES MODULE

**SharePoint List Name**: `Invoices`

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| id | String (UUID) | Yes | Unique identifier | Single line of text |
| invoice_number | String | No | User-provided or auto-generated | Single line of text |
| contract_id | String | Yes | Reference to contract | Lookup (Contracts) |
| vendor_id | String | Yes | Reference to vendor | Lookup (Vendors) |
| amount | Number | Yes | Invoice amount | Number (Currency) |
| description | String | Yes | Invoice description | Multiple lines of text |
| milestone_reference | String | No | Related milestone | Single line of text |
| status | Choice | Yes | Invoice status | Choice (pending, verified, approved, paid, rejected) |
| submitted_at | DateTime | Yes | Submission timestamp | Date and Time |
| verified_at | DateTime | No | Verification timestamp | Date and Time |
| approved_at | DateTime | No | Approval timestamp | Date and Time |
| paid_at | DateTime | No | Payment timestamp | Date and Time |
| verified_by | String | No | User ID who verified | Single line of text |
| approved_by | String | No | User ID who approved | Single line of text |
| documents | JSON Array | No | List of document paths | Multiple lines of text |

---

## 8. RESOURCES MODULE

**SharePoint List Name**: `Resources`

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| id | String (UUID) | Yes | Unique identifier | Single line of text |
| resource_number | String | No | Auto-generated | Single line of text |
| contract_id | String | Yes | Reference to contract | Lookup (Contracts) |
| vendor_id | String | Yes | Reference to vendor | Lookup (Vendors) |
| contract_name | String | No | Contract name (denormalized) | Single line of text |
| scope | String | No | Contract scope | Multiple lines of text |
| sla | String | No | SLA details | Multiple lines of text |
| contract_duration | String | No | Contract duration | Single line of text |
| vendor_name | String | No | Vendor name (denormalized) | Single line of text |
| name | String | Yes | Resource full name | Single line of text |
| photo | String | No | Photo URL/path | Single line of text |
| nationality | String | Yes | Nationality | Single line of text |
| id_number | String | Yes | ID/passport number | Single line of text |
| education_qualification | String | Yes | Education qualification | Single line of text |
| years_of_experience | Number | Yes | Years of experience | Number |
| work_type | Choice | Yes | Work type | Choice (on_premises, offshore) |
| start_date | DateTime | Yes | Start date | Date and Time |
| end_date | DateTime | Yes | End date | Date and Time |
| access_development | Boolean | Yes | Development env access | Yes/No |
| access_production | Boolean | Yes | Production env access | Yes/No |
| access_uat | Boolean | Yes | UAT env access | Yes/No |
| scope_of_work | String | Yes | Scope of work details | Multiple lines of text |
| has_relatives | Boolean | Yes | Has relatives in bank | Yes/No |
| relatives | JSON Array | No | List of relatives | Multiple lines of text |
| status | Choice | Yes | Resource status | Choice (active, inactive, terminated) |
| created_by | String | No | User ID who created | Single line of text |
| created_at | DateTime | Yes | Creation timestamp | Date and Time |
| updated_at | DateTime | Yes | Last update timestamp | Date and Time |

### Relative Structure (JSON)

```json
{
  "name": "Relative name",
  "position": "Job position",
  "department": "Department name",
  "relation": "Relationship type"
}
```

---

## 9. ASSETS MODULE

**SharePoint List Name**: `Assets`

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| id | String (UUID) | Yes | Unique identifier | Single line of text |
| asset_number | String | No | Auto-generated | Single line of text |
| name | String | Yes | Asset name | Single line of text |
| category_id | String | Yes | Reference to category | Lookup (AssetCategories) |
| category_name | String | No | Category name (denormalized) | Single line of text |
| model | String | No | Model number/name | Single line of text |
| serial_number | String | No | Serial number | Single line of text |
| manufacturer | String | No | Manufacturer name | Single line of text |
| building_id | String | Yes | Reference to building | Lookup (Buildings) |
| building_name | String | No | Building name (denormalized) | Single line of text |
| floor_id | String | Yes | Reference to floor | Lookup (Floors) |
| floor_name | String | No | Floor name (denormalized) | Single line of text |
| room_area | String | No | Room/area location | Single line of text |
| custodian | String | No | Asset custodian name | Single line of text |
| vendor_id | String | No | Reference to vendor | Lookup (Vendors) |
| vendor_name | String | No | Vendor name (denormalized) | Single line of text |
| purchase_date | DateTime | No | Purchase date | Date and Time |
| cost | Number | No | Purchase cost | Number (Currency) |
| po_number | String | No | Purchase order number | Single line of text |
| contract_id | String | No | AMC contract reference | Lookup (Contracts) |
| contract_number | String | No | Contract number (denormalized) | Single line of text |
| warranty_start_date | DateTime | No | Warranty start date | Date and Time |
| warranty_end_date | DateTime | No | Warranty end date | Date and Time |
| warranty_status | String | No | Warranty status (calculated) | Single line of text |
| installation_date | DateTime | No | Installation date | Date and Time |
| last_maintenance_date | DateTime | No | Last maintenance date | Date and Time |
| next_maintenance_due | DateTime | No | Next maintenance due date | Date and Time |
| status | Choice | Yes | Asset status | Choice (active, under_maintenance, out_of_service, replaced, decommissioned) |
| condition | Choice | No | Asset condition | Choice (good, fair, poor) |
| attachments | JSON Array | No | List of attachments | Multiple lines of text |
| notes | String | No | Additional notes | Multiple lines of text |
| created_by | String | No | User ID who created | Single line of text |
| created_at | DateTime | Yes | Creation timestamp | Date and Time |
| updated_at | DateTime | No | Last update timestamp | Date and Time |

---

## 10. BUILDINGS MODULE

**SharePoint List Name**: `Buildings`

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| id | String (UUID) | Yes | Unique identifier | Single line of text |
| name | String | Yes | Building name | Single line of text |
| code | String | No | Building code | Single line of text |
| address | String | No | Building address | Single line of text |
| is_active | Boolean | Yes | Active status | Yes/No |
| created_at | DateTime | Yes | Creation timestamp | Date and Time |

---

## 11. FLOORS MODULE

**SharePoint List Name**: `Floors`

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| id | String (UUID) | Yes | Unique identifier | Single line of text |
| building_id | String | Yes | Reference to building | Lookup (Buildings) |
| name | String | Yes | Floor name (e.g., Ground Floor) | Single line of text |
| number | Number | No | Floor number | Number |
| is_active | Boolean | Yes | Active status | Yes/No |
| created_at | DateTime | Yes | Creation timestamp | Date and Time |

---

## 12. ASSET CATEGORIES MODULE

**SharePoint List Name**: `AssetCategories`

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| id | String (UUID) | Yes | Unique identifier | Single line of text |
| name | String | Yes | Category name | Single line of text |
| description | String | No | Category description | Multiple lines of text |
| is_active | Boolean | Yes | Active status | Yes/No |
| created_at | DateTime | Yes | Creation timestamp | Date and Time |

---

## 13. OSR (OPERATIONAL SERVICE REQUESTS) MODULE

**SharePoint List Name**: `OSR`

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| id | String (UUID) | Yes | Unique identifier | Single line of text |
| osr_number | String | No | Auto-generated (OSR-2025-0001) | Single line of text |
| title | String | Yes | Request title | Single line of text |
| request_type | Choice | Yes | Request type | Choice (asset_related, general_request) |
| category | Choice | Yes | Service category | Choice (maintenance, cleaning, relocation, safety, other) |
| priority | Choice | Yes | Priority level | Choice (low, normal, high) |
| description | String | Yes | Request description | Multiple lines of text |
| building_id | String | Yes | Reference to building | Lookup (Buildings) |
| building_name | String | No | Building name (denormalized) | Single line of text |
| floor_id | String | Yes | Reference to floor | Lookup (Floors) |
| floor_name | String | No | Floor name (denormalized) | Single line of text |
| room_area | String | No | Room/area location | Single line of text |
| asset_id | String | No | Reference to asset (if applicable) | Lookup (Assets) |
| asset_name | String | No | Asset name (denormalized) | Single line of text |
| asset_warranty_status | String | No | Asset warranty status | Single line of text |
| asset_contract_id | String | No | Asset AMC contract | Single line of text |
| asset_contract_number | String | No | Contract number (denormalized) | Single line of text |
| assigned_to_type | String | No | Assignment type | Choice (internal, vendor) |
| assigned_to_vendor_id | String | No | Assigned vendor ID | Lookup (Vendors) |
| assigned_to_vendor_name | String | No | Vendor name (denormalized) | Single line of text |
| assigned_to_internal | String | No | Internal team/person name | Single line of text |
| assigned_date | DateTime | No | Assignment date | Date and Time |
| status | Choice | Yes | Request status | Choice (open, assigned, in_progress, completed, cancelled) |
| resolution_notes | String | No | Resolution notes | Multiple lines of text |
| closed_date | DateTime | No | Closure date | Date and Time |
| attachments | JSON Array | No | List of attachments | Multiple lines of text |
| created_by | String | No | User ID who created | Single line of text |
| created_by_name | String | No | Creator name (denormalized) | Single line of text |
| created_at | DateTime | Yes | Creation timestamp | Date and Time |
| updated_at | DateTime | No | Last update timestamp | Date and Time |

---

## 14. NOTIFICATIONS MODULE

**SharePoint List Name**: `Notifications`

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| id | String (UUID) | Yes | Unique identifier | Single line of text |
| user_id | String | Yes | Reference to user | Lookup (Users) |
| title | String | Yes | Notification title | Single line of text |
| message | String | Yes | Notification message | Multiple lines of text |
| type | Choice | Yes | Notification type | Choice (info, approval, alert) |
| read | Boolean | Yes | Read status | Yes/No |
| created_at | DateTime | Yes | Creation timestamp | Date and Time |

---

## 15. AUDIT LOGS MODULE

**SharePoint List Name**: `AuditLogs`

| Field Name | Data Type | Required | Description | SharePoint Column Type |
|-----------|-----------|----------|-------------|----------------------|
| id | String (UUID) | Yes | Unique identifier | Single line of text |
| user_id | String | Yes | User who performed action | Lookup (Users) |
| action | String | Yes | Action performed | Single line of text |
| entity_type | String | Yes | Entity type | Choice (vendor, contract, tender, etc.) |
| entity_id | String | Yes | Reference to entity | Single line of text |
| details | String | Yes | Action details | Multiple lines of text |
| timestamp | DateTime | Yes | Action timestamp | Date and Time |

---

## VENDOR DUE DILIGENCE QUESTIONNAIRE (70+ Fields)

### Ownership Structure / General (5 questions)

| Field Name | Description |
|-----------|-------------|
| dd_ownership_change_last_year | Ownership change in last year? |
| dd_location_moved_or_closed | Location moved or closed? |
| dd_new_branches_opened | New branches opened? |
| dd_financial_obligations_default | Default on financial obligations? |
| dd_shareholding_in_bank | Shareholding in the bank? |

### Business Continuity (25 questions)

| Field Name | Description |
|-----------|-------------|
| dd_bc_rely_on_third_parties | Rely on third parties? |
| dd_bc_intend_to_outsource | Intend to outsource? |
| dd_bc_business_stopped_over_week | Business stopped over a week? |
| dd_bc_alternative_locations | Alternative locations available? |
| dd_bc_site_readiness_test_frequency | Site readiness test frequency |
| dd_bc_certified_standard | Certified to BC standard? |
| dd_bc_staff_assigned | Staff assigned to BC? |
| dd_bc_risks_assessed | Risks assessed? |
| dd_bc_threats_identified | Threats identified? |
| dd_bc_essential_activities_identified | Essential activities identified? |
| dd_bc_strategy_exists | BC strategy exists? |
| dd_bc_emergency_responders_engaged | Emergency responders engaged? |
| dd_bc_arrangements_updated | Arrangements updated? |
| dd_bc_documented_strategy | Strategy documented? |
| dd_bc_can_provide_exercise_info | Can provide exercise information? |
| dd_bc_exercise_results_used | Exercise results used for improvement? |
| dd_bc_management_trained | Management trained in BC? |
| dd_bc_staff_aware | Staff aware of BC procedures? |
| dd_bc_it_continuity_plan | IT continuity plan exists? |
| dd_bc_critical_data_backed_up | Critical data backed up? |
| dd_bc_vital_documents_offsite | Vital documents stored offsite? |
| dd_bc_critical_suppliers_identified | Critical suppliers identified? |
| dd_bc_suppliers_consulted | Suppliers consulted on BC? |
| dd_bc_communication_method | Communication method defined? |
| dd_bc_public_relations_capability | Public relations capability? |

### Anti-Fraud (4 questions)

| Field Name | Description |
|-----------|-------------|
| dd_fraud_whistle_blowing_mechanism | Whistle-blowing mechanism exists? |
| dd_fraud_prevention_procedures | Fraud prevention procedures? |
| dd_fraud_internal_last_year | Internal fraud last year? |
| dd_fraud_burglary_theft_last_year | Burglary/theft last year? |

### Operational Risks (10 questions)

| Field Name | Description |
|-----------|-------------|
| dd_op_criminal_cases_last_3years | Criminal cases last 3 years? |
| dd_op_financial_issues_last_3years | Financial issues last 3 years? |
| dd_op_documented_procedures | Documented procedures exist? |
| dd_op_internal_audit | Internal audit function? |
| dd_op_specific_license_required | Specific license required? |
| dd_op_services_outside_ksa | Services provided outside KSA? |
| dd_op_conflict_of_interest_policy | Conflict of interest policy? |
| dd_op_complaint_handling_procedures | Complaint handling procedures? |
| dd_op_customer_complaints_last_year | Customer complaints last year? |
| dd_op_insurance_contracts | Insurance contracts in place? |

### Cyber Security (6 questions)

| Field Name | Description |
|-----------|-------------|
| dd_cyber_cloud_services | Cloud services used? |
| dd_cyber_data_outside_ksa | Data stored outside KSA? |
| dd_cyber_remote_access_outside_ksa | Remote access from outside KSA? |
| dd_cyber_digital_channels | Digital channels provided? |
| dd_cyber_card_payments | Card payments accepted? |
| dd_cyber_third_party_access | Third-party access to systems? |

### Safety and Security (4 questions)

| Field Name | Description |
|-----------|-------------|
| dd_safety_procedures_exist | Safety procedures exist? |
| dd_safety_security_24_7 | 24/7 security? |
| dd_safety_security_equipment | Security equipment in place? |
| dd_safety_equipment | Safety equipment available? |

### Human Resources (4 questions)

| Field Name | Description |
|-----------|-------------|
| dd_hr_localization_policy | Localization policy exists? |
| dd_hr_hiring_standards | Hiring standards defined? |
| dd_hr_background_investigation | Background investigations conducted? |
| dd_hr_academic_verification | Academic verification performed? |

### Legal (1 question)

| Field Name | Description |
|-----------|-------------|
| dd_legal_formal_representation | Formal legal representation? |

### Regulatory (2 questions)

| Field Name | Description |
|-----------|-------------|
| dd_reg_regulated_by_authority | Regulated by authority? |
| dd_reg_audited_by_independent | Audited by independent auditor? |

### Conflict of Interest (1 question)

| Field Name | Description |
|-----------|-------------|
| dd_coi_relationship_with_bank | Relationship with the bank? |

### Data Management (1 question)

| Field Name | Description |
|-----------|-------------|
| dd_data_customer_data_policy | Customer data policy exists? |

### Financial Consumer Protection (2 questions)

| Field Name | Description |
|-----------|-------------|
| dd_fcp_read_and_understood | Read and understood FCP rules? |
| dd_fcp_will_comply | Will comply with FCP rules? |

### Additional Details (1 question)

| Field Name | Description |
|-----------|-------------|
| dd_additional_details | Additional details or comments |

### Final Checklist (3 questions)

| Field Name | Description |
|-----------|-------------|
| dd_checklist_supporting_documents | Supporting documents attached? |
| dd_checklist_related_party_checked | Related party checked? |
| dd_checklist_sanction_screening | Sanction screening completed? |

---

## RELATIONSHIPS BETWEEN MODULES

### Primary Relationships

1. **Tenders → Proposals**: One-to-Many
   - `proposals.tender_id` → `tenders.id`

2. **Vendors → Proposals**: One-to-Many
   - `proposals.vendor_id` → `vendors.id`

3. **Tenders → Contracts**: One-to-One
   - `contracts.tender_id` → `tenders.id`

4. **Vendors → Contracts**: One-to-Many
   - `contracts.vendor_id` → `vendors.id`

5. **Contracts → Invoices**: One-to-Many
   - `invoices.contract_id` → `contracts.id`

6. **Vendors → Invoices**: One-to-Many
   - `invoices.vendor_id` → `vendors.id`

7. **Tenders → Purchase Orders**: One-to-One (optional)
   - `purchase_orders.tender_id` → `tenders.id`

8. **Vendors → Purchase Orders**: One-to-Many
   - `purchase_orders.vendor_id` → `vendors.id`

9. **Contracts → Resources**: One-to-Many
   - `resources.contract_id` → `contracts.id`

10. **Vendors → Resources**: One-to-Many
    - `resources.vendor_id` → `vendors.id`

11. **Buildings → Floors**: One-to-Many
    - `floors.building_id` → `buildings.id`

12. **Buildings → Assets**: One-to-Many
    - `assets.building_id` → `buildings.id`

13. **Floors → Assets**: One-to-Many
    - `assets.floor_id` → `floors.id`

14. **AssetCategories → Assets**: One-to-Many
    - `assets.category_id` → `asset_categories.id`

15. **Vendors → Assets**: One-to-Many (for purchases)
    - `assets.vendor_id` → `vendors.id`

16. **Contracts → Assets**: One-to-Many (for AMC)
    - `assets.contract_id` → `contracts.id`

17. **Buildings → OSR**: One-to-Many
    - `osr.building_id` → `buildings.id`

18. **Floors → OSR**: One-to-Many
    - `osr.floor_id` → `floors.id`

19. **Assets → OSR**: One-to-Many (optional)
    - `osr.asset_id` → `assets.id`

20. **Vendors → OSR**: One-to-Many (for assignments)
    - `osr.assigned_to_vendor_id` → `vendors.id`

21. **Users → All Modules**: Creator relationships
    - Most modules have `created_by` field linking to `users.id`

---

## DATA VALIDATION RULES

### Auto-Generated Fields
- **vendor_number**: Pattern: `Vendor-YY-NNNN` (e.g., Vendor-25-0001)
- **tender_number**: Pattern: `TND-YYYY-NNNN` (e.g., TND-2025-0001)
- **proposal_number**: Pattern: `PRO-YYYY-NNNN` (e.g., PRO-2025-0001)
- **contract_number**: Pattern: `Contract-YY-NNNN` (e.g., Contract-25-0001)
- **po_number**: Pattern: `PO-YY-NNNN` (e.g., PO-25-0001)
- **invoice_number**: Pattern: `Invoice-YY-NNNN` (if not user-provided)
- **asset_number**: Auto-incremented number
- **resource_number**: Auto-incremented number
- **osr_number**: Pattern: `OSR-YYYY-NNNN` (e.g., OSR-2025-0001)

### Required Relationships
- Contracts MUST have valid tender_id (approved tender)
- Invoices MUST have valid contract_id and vendor_id
- Resources MUST have valid contract_id and vendor_id
- Assets MUST have valid building_id, floor_id, and category_id
- Proposals MUST have valid tender_id and vendor_id

### Business Rules
1. **Vendor Risk Score**: Calculated from 15 registration questions (1 point each)
2. **Risk Category**: Based on percentage: ≥80% Low, ≥60% Medium, ≥40% High, <40% Very High
3. **PO Requires Contract**: True if any risk question is Yes OR amount > 1 million
4. **Outsourcing Classification**: Calculated from Section A questionnaire responses
5. **Warranty Status**: Calculated based on current date vs warranty_end_date

---

## FILE ATTACHMENTS

### Storage Strategy
- **Current System**: Files stored in `/app/uploads/` directory
- **SharePoint**: Use Document Libraries with references in main lists

### Attachment Fields (stored as JSON)
All attachment fields store arrays of objects with this structure:

```json
{
  "filename": "document.pdf",
  "path": "/uploads/vendors/document.pdf",
  "url": "https://domain.com/uploads/vendors/document.pdf",
  "size": 1024567,
  "type": "application/pdf",
  "uploaded_at": "2025-12-01T10:30:00Z"
}
```

### SharePoint Document Library Structure
```
/Documents/
  /Vendors/
    /{vendor_id}/
  /Tenders/
    /{tender_id}/
  /Proposals/
    /{proposal_id}/
  /Contracts/
    /{contract_id}/
  /Invoices/
    /{invoice_id}/
  /Resources/
    /{resource_id}/
  /Assets/
    /{asset_id}/
  /OSR/
    /{osr_id}/
```

---

## NOTES

1. **UUID Format**: All IDs use UUID4 format (e.g., `123e4567-e89b-12d3-a456-426614174000`)
2. **DateTime Format**: ISO 8601 format with timezone (e.g., `2025-12-01T10:30:00+00:00`)
3. **Currency**: All amounts are in the base currency (no currency field per transaction)
4. **JSON Fields**: Store complex data structures as JSON strings in SharePoint
5. **Denormalized Fields**: Some fields are duplicated for performance (e.g., vendor_name in contracts)
6. **Soft Deletes**: No delete operations; use status fields or `is_active` flags
7. **Audit Trail**: Use AuditLogs table for tracking changes
8. **File Size Limits**: Configure based on SharePoint tenant limits (typically 250MB per file)

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Total Modules**: 15  
**Total Fields**: 400+
