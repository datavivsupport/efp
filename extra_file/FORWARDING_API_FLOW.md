# Export Forwarding Process - API Request/Response Documentation

## Base URL
```
/api/liner/sales-input/
```

## Authentication
All endpoints require Bearer token authentication.
```
Authorization: Bearer <token>
```

---

## Complete FORWARDING Workflow Flow

```
STAGE 1 (Sales Creates)
    ↓
STAGE 2 (Parallel: Sales HOD Approval + CS Update)
    ↓ [Both HOD approved + CS updated]
STAGE 3 (CNF Uploads Load List)
    ↓ [Load List uploaded]
STAGE 4 (CS Uploads HBL + LPO/Invoice)
    ↓ [LPO or Invoice uploaded]
STAGE 5 (CS HOD Approval)
    ↓ [CS HOD approved]
STAGE 6 (Accounts uploads Payment Slip)
    ↓ [Payment processed]
STAGE 7 (CS/CNF Upload Pending Docs)
    ↓ [All docs complete]
STAGE 9 (Job Completed)
```

---

## STAGE 1: Sales Creates Request

### 1.1 Create Draft
**POST** `/api/liner/sales-input/`

**Request:**
```json
{
  "customer_name": "ABC Trading LLC",
  "contact_pic": "John Smith",
  "phone_no": "+971501234567",
  "email": "john@abctrading.com",
  "job_type": "FORWARDING",
  "carrier_name": "MAERSK",
  "port_of_loading": "JEBEL ALI",
  "port_of_discharge": "SINGAPORE",
  "final_pod": "SINGAPORE",
  "terms_of_shipment": "FREIGHT COLLECT",
  "haulier_code": "HC001",
  "hbl": true,
  "fac": true,
  "documentation": true,
  "transportation": true,
  "special_instructions": "Handle with care",
  "name_of_executive": "Sales Executive Name",
  "sales_hod": "Sales HOD Name",
  "status": "draft",
  "commodities": [
    {"name": "Electronics"}
  ],
  "container_details": [
    {
      "equipment_type": "40HC",
      "quantity": 2,
      "category": "LADEN",
      "quote": "USD 1500",
      "cost": 1500.00
    }
  ],
  "transportation_rows": [
    {
      "equipment_type": "Truck",
      "no_of_containers": 2,
      "category": "HC",
      "placement_time": "2026-04-01T10:00:00Z",
      "pickup_location": "Dubai Industrial Area",
      "special_remarks": "Morning delivery preferred"
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Sales input created successfully",
  "data": {
    "id": 123,
    "export_number": null,
    "current_stage": "1",
    "status": "draft",
    "customer_name": "ABC Trading LLC",
    "job_type": "FORWARDING",
    "created_at": "2026-03-30T10:00:00Z",
    "created_by_name": "Sales Person Name"
  }
}
```

---

### 1.2 Submit Draft (Move to Stage 2)
**POST** `/api/liner/sales-input/{id}/submit/`

**Request:**
```json
{
  "remarks": "Job submitted for approval"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Sales input submitted successfully",
  "data": {
    "id": 123,
    "export_number": "FW/0001/26",
    "current_stage": "2",
    "status": "submitted",
    "is_hod_approved": false,
    "is_cs_updated": false,
    "approval_history": [
      {
        "id": 1,
        "stage": "Sales Created",
        "pending_with": "Sales HOD",
        "status": "Sales Created",
        "remarks": "Job submitted for approval",
        "created_at": "2026-03-30T10:05:00Z"
      },
      {
        "id": 2,
        "stage": "Sales HOD Approval",
        "stage_code": "STAGE_2_HOD",
        "pending_with": "Sales HOD",
        "role": "SALES_HOD",
        "status": "PENDING",
        "is_parallel": true,
        "remarks": "Pending Sales HOD Approval"
      },
      {
        "id": 3,
        "stage": "CS Team Update",
        "stage_code": "STAGE_2_CS",
        "pending_with": "CS Team",
        "role": "CS",
        "status": "PENDING",
        "is_parallel": true,
        "remarks": "Pending CS Details Update"
      },
      {
        "id": 4,
        "stage": "CNF Update",
        "stage_code": "STAGE_2_CNF",
        "pending_with": "CNF Team",
        "role": "CNF",
        "status": "PENDING",
        "is_parallel": true,
        "remarks": "Pending CNF Documentation Update"
      }
    ]
  }
}
```

---

## STAGE 2: Parallel Approval (Sales HOD + CS Update)

### 2.1 Sales HOD Approval
**POST** `/api/liner/sales-input/{id}/approve/`

**User Role Required:** Sales HOD / Approver

**Request:**
```json
{
  "remarks": "Approved by Sales HOD"
}
```

**Response (200 OK) - Waiting for CS:**
```json
{
  "status": "success",
  "message": "Processed. Stage: 2 → 2",
  "data": {
    "id": 123,
    "current_stage": "2",
    "status": "submitted",
    "is_hod_approved": true,
    "is_cs_updated": false,
    "approval_history": [
      {
        "stage": "Sales HOD Approval",
        "role": "SALES_HOD",
        "status": "Approved",
        "updated_by_name": "Sales HOD Name",
        "remarks": "Approved by Sales HOD"
      }
    ]
  }
}
```

**Error Response (400) - If Job Was Rejected:**
```json
{
  "status": "error",
  "message": "Cannot approve: This job was rejected by CS. A new request must be created.",
  "data": {
    "rejected_by": "CS",
    "rejection_remarks": "Missing required documents"
  }
}
```

---

### 2.2 CS Team Update
**POST** `/api/liner/sales-input/{id}/approve/`

**User Role Required:** CS Team / Executive

**Request:**
```json
{
  "remarks": "CS details updated",
  "approval_details": {
    "afsys_job_no": "AFSYS123",
    "booking_vessel": "MAERSK SEALAND",
    "booking_voyage": "V123E",
    "vessel_eta": "2026-04-15",
    "booking_ref_no": "BKG123456",
    "si_cut_off_date": "2026-04-10",
    "si_cut_off_time": "18:00:00",
    "booking_remarks": "Confirmed booking"
  }
}
```

**Response (200 OK) - Both Complete, Moving to Stage 3:**
```json
{
  "status": "success",
  "message": "Processed. Stage: 2 → 3",
  "data": {
    "id": 123,
    "current_stage": "3",
    "status": "submitted",
    "is_hod_approved": true,
    "is_cs_updated": true,
    "approval_history": [
      {
        "stage": "CS Team Update",
        "role": "CS",
        "status": "UPDATED",
        "updated_by_name": "CS Executive Name"
      },
      {
        "stage": "CNF Load List Upload",
        "stage_code": "STAGE_3_CNF",
        "pending_with": "CNF Team",
        "role": "CNF",
        "status": "PENDING",
        "remarks": "Pending CNF Team to upload Load List"
      }
    ]
  }
}
```

---

## STAGE 3: CNF Uploads Load List

### 3.1 Upload Load List Document
**POST** `/api/liner/sales-input/{id}/upload-document/`

**User Role Required:** CNF Team

**Request (multipart/form-data):**
```
file: <load_list.pdf>
doc_type: "Load List"
category: "booking"
remarks: "Load list for shipment"
```

**Response (201 Created) - Document Uploaded, Stage 3 → 4:**
```json
{
  "status": "success",
  "message": "Uploaded",
  "data": {
    "id": 456,
    "doc_type": "Load List",
    "category": "booking",
    "file_url": "https://s3.amazonaws.com/bucket/load_list_xyz.pdf",
    "file_name": "load_list.pdf",
    "remarks": "Load list for shipment",
    "uploaded_by_name": "CNF Executive",
    "stage_uploaded": "3"
  }
}
```

**Note:** Load List upload automatically transitions job from Stage 3 to Stage 4.

---

### 3.2 CNF Confirms Load List (Alternative)
**POST** `/api/liner/sales-input/{id}/approve/`

**User Role Required:** CNF Team

**Request:**
```json
{
  "remarks": "Load List uploaded and confirmed"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Processed. Stage: 3 → 4",
  "data": {
    "id": 123,
    "current_stage": "4",
    "is_load_list_uploaded": true,
    "approval_history": [
      {
        "stage": "CNF Load List Upload",
        "role": "CNF",
        "status": "UPDATED",
        "remarks": "Load List uploaded - Load List uploaded and confirmed"
      },
      {
        "stage": "CS Documentation Phase",
        "stage_code": "STAGE_4_CS",
        "pending_with": "CS Team",
        "role": "CS",
        "status": "PENDING",
        "remarks": "Pending CS Team: HBL upload, LPO/Invoice upload"
      }
    ]
  }
}
```

**Error Response (400) - Load List Not Uploaded:**
```json
{
  "status": "error",
  "message": "Load List must be uploaded before proceeding to next stage."
}
```

---

## STAGE 4: CS Documentation Phase (HBL + LPO/Invoice)

### 4.1 Upload HBL Document (If HBL Selected)
**POST** `/api/liner/sales-input/{id}/upload-document/`

**User Role Required:** CS Team

**Request (multipart/form-data):**
```
file: <hbl_document.pdf>
doc_type: "HBL"
category: "financial"
remarks: "House Bill of Lading"
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Uploaded",
  "data": {
    "id": 457,
    "doc_type": "HBL",
    "file_url": "https://s3.amazonaws.com/bucket/hbl_xyz.pdf",
    "file_name": "hbl_document.pdf",
    "remarks": "House Bill of Lading",
    "stage_uploaded": "4"
  }
}
```

**Note:** HBL upload triggers DOCS team notification for verification (Stage 4AA - parallel).

---

### 4.2 Upload LPO Document
**POST** `/api/liner/sales-input/{id}/upload-document/`

**User Role Required:** CS Team

**Request (multipart/form-data):**
```
file: <lpo_document.pdf>
doc_type: "LPO"
category: "financial"
remarks: "Local Purchase Order"
```

**Response (201 Created) - Stage 4 → 5:**
```json
{
  "status": "success",
  "message": "Uploaded",
  "data": {
    "id": 458,
    "doc_type": "LPO",
    "file_url": "https://s3.amazonaws.com/bucket/lpo_xyz.pdf",
    "file_name": "lpo_document.pdf",
    "remarks": "Local Purchase Order",
    "stage_uploaded": "4"
  }
}
```

**Note:** LPO or Invoice upload automatically transitions to Stage 5 (CS HOD Approval).

---

### 4.3 Upload Invoice Document (Alternative to LPO)
**POST** `/api/liner/sales-input/{id}/upload-document/`

**Request (multipart/form-data):**
```
file: <invoice.pdf>
doc_type: "Invoice"
category: "financial"
remarks: "Commercial Invoice"
```

**Response:** Same as LPO upload.

---

### 4.4 CS Team Confirms Documents
**POST** `/api/liner/sales-input/{id}/approve/`

**User Role Required:** CS Team

**Request:**
```json
{
  "remarks": "All CS documents uploaded"
}
```

**Response (200 OK) - Stage 4 → 5:**
```json
{
  "status": "success",
  "message": "Processed. Stage: 4 → 5",
  "data": {
    "id": 123,
    "current_stage": "5",
    "is_lpo_uploaded": true,
    "is_hbl_uploaded": true,
    "approval_history": [
      {
        "stage": "CS Documentation Phase",
        "role": "CS",
        "status": "UPDATED",
        "remarks": "Documents uploaded - All CS documents uploaded"
      },
      {
        "stage": "CS HOD Approval",
        "stage_code": "STAGE_5_CSHOD",
        "pending_with": "CS HOD",
        "role": "CS_HOD",
        "status": "PENDING",
        "remarks": "Pending CS HOD Approval for financial documents"
      }
    ]
  }
}
```

**Error Response (400) - Missing Documents:**
```json
{
  "status": "error",
  "message": "Missing documents: LPO or Invoice. Upload required before proceeding."
}
```

---

## STAGE 4AA: DOCS Team BL Verification (Parallel)

### 4AA.1 DOCS Team Verifies HBL
**POST** `/api/liner/sales-input/{id}/approve/`

**User Role Required:** DOCS Team

**Request:**
```json
{
  "remarks": "BL Document verified and correct"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Processed. Stage: 4 → 4",
  "data": {
    "id": 123,
    "current_stage": "4",
    "approval_history": [
      {
        "stage": "DOCS BL Verification",
        "role": "DOCS",
        "status": "VERIFIED",
        "remarks": "BL Document verified - BL Document verified and correct"
      }
    ]
  }
}
```

---

## STAGE 5: CS HOD Approval

### 5.1 CS HOD Approves
**POST** `/api/liner/sales-input/{id}/approve/`

**User Role Required:** CS HOD / Approver

**Request:**
```json
{
  "remarks": "Approved by CS HOD"
}
```

**Response (200 OK) - With Payment Required → Stage 6:**
```json
{
  "status": "success",
  "message": "Processed. Stage: 5 → 6",
  "data": {
    "id": 123,
    "current_stage": "6",
    "status": "submitted",
    "is_cs_hod_approved": true,
    "approval_history": [
      {
        "stage": "CS HOD Approval",
        "role": "CS_HOD",
        "status": "Approved",
        "updated_by_name": "CS HOD Name",
        "remarks": "Approved by CS HOD"
      },
      {
        "stage": "Accounts Payment",
        "stage_code": "STAGE_6_ACCOUNTS",
        "pending_with": "Accounts",
        "role": "ACCOUNTS",
        "status": "PENDING",
        "remarks": "Pending Accounts team to upload Payment Slip"
      }
    ]
  }
}
```

**Response (200 OK) - No Payment Required → Stage 7:**
```json
{
  "status": "success",
  "message": "Processed. Stage: 5 → 7",
  "data": {
    "id": 123,
    "current_stage": "7",
    "is_cs_hod_approved": true,
    "approval_history": [
      {
        "stage": "Pending Docs Upload",
        "stage_code": "STAGE_7_PENDING",
        "pending_with": "CS/CNF Team",
        "role": "CS_CNF",
        "status": "PENDING",
        "remarks": "Pending CS/CNF to upload remaining documents"
      }
    ]
  }
}
```

---

### 5.2 CS HOD Rejects (Returns to Stage 4)
**POST** `/api/liner/sales-input/{id}/reject/`

**User Role Required:** CS HOD

**Request:**
```json
{
  "remarks": "Documents incomplete, please resubmit with correct invoice"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Job rejected by CS HOD. Returned to CS Team for corrections.",
  "data": {
    "previous_stage": "5",
    "current_stage": "4",
    "rejection_status": "CSHOD-REJECTED"
  }
}
```

**Note:** Job returns to Stage 4 for CS Team to correct and resubmit.

---

## STAGE 6: Accounts Payment

### 6.1 Upload Bank Slip / Payment Document
**POST** `/api/liner/sales-input/{id}/upload-document/`

**User Role Required:** Accounts Team

**Request (multipart/form-data):**
```
file: <bank_slip.pdf>
doc_type: "Bank Slip"
category: "financial"
remarks: "Payment processed - Reference: TXN123456"
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Uploaded",
  "data": {
    "id": 459,
    "doc_type": "Bank Slip",
    "file_url": "https://s3.amazonaws.com/bucket/bank_slip_xyz.pdf",
    "file_name": "bank_slip.pdf",
    "remarks": "Payment processed - Reference: TXN123456",
    "stage_uploaded": "6"
  }
}
```

---

### 6.2 Accounts Approves Payment
**POST** `/api/liner/sales-input/{id}/approve/`

**User Role Required:** Accounts Team

**Request:**
```json
{
  "remarks": "Payment processed and verified",
  "approval_details": {
    "account_remarks": "Payment received via bank transfer"
  }
}
```

**Response (200 OK) - Stage 6 → 7:**
```json
{
  "status": "success",
  "message": "Processed. Stage: 6 → 7",
  "data": {
    "id": 123,
    "current_stage": "7",
    "status": "submitted",
    "approval_history": [
      {
        "stage": "Accounts Payment",
        "role": "ACCOUNTS",
        "status": "Approved",
        "remarks": "Payment processed - Payment processed and verified"
      },
      {
        "stage": "Pending Docs Upload",
        "stage_code": "STAGE_7_PENDING",
        "pending_with": "CS/CNF Team",
        "role": "CS_CNF",
        "status": "PENDING",
        "remarks": "Pending documents: FAC, ED, Release Order, BOC, Haulage Cost Sheet"
      }
    ]
  }
}
```

---

### 6.3 Accounts Rejects (Returns to Stage 5)
**POST** `/api/liner/sales-input/{id}/reject/`

**User Role Required:** Accounts Team

**Request:**
```json
{
  "remarks": "Invoice amount mismatch, please correct"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Job rejected by Accounts. Returned to CS HOD for review.",
  "data": {
    "previous_stage": "6",
    "current_stage": "5",
    "rejection_status": "ACCOUNTS-REJECTED"
  }
}
```

---

## STAGE 7: Pending Docs Upload

### 7.1 Upload FAC Document (If FAC Selected)
**POST** `/api/liner/sales-input/{id}/upload-document/`

**User Role Required:** CS Team

**Request (multipart/form-data):**
```
file: <fac_document.pdf>
doc_type: "FAC"
category: "financial"
remarks: "Freight Account Current"
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Uploaded",
  "data": {
    "id": 460,
    "doc_type": "FAC",
    "file_url": "https://s3.amazonaws.com/bucket/fac_xyz.pdf",
    "file_name": "fac_document.pdf"
  }
}
```

---

### 7.2 Upload ED (Export Declaration)
**POST** `/api/liner/sales-input/{id}/upload-document/`

**User Role Required:** CS Team

**Request (multipart/form-data):**
```
file: <ed_document.pdf>
doc_type: "ED"
category: "booking"
remarks: "Export Declaration"
```

---

### 7.3 Upload Release Order
**POST** `/api/liner/sales-input/{id}/upload-document/`

**User Role Required:** CNF Team

**Request (multipart/form-data):**
```
file: <release_order.pdf>
doc_type: "Release Order"
category: "booking"
remarks: "Release Order from carrier"
```

---

### 7.4 Upload BOC
**POST** `/api/liner/sales-input/{id}/upload-document/`

**User Role Required:** CNF Team

**Request (multipart/form-data):**
```
file: <boc_document.pdf>
doc_type: "BOC"
category: "booking"
remarks: "Bill of Cargo"
```

---

### 7.5 Upload Haulage Cost Sheet
**POST** `/api/liner/sales-input/{id}/upload-document/`

**User Role Required:** CNF Team

**Request (multipart/form-data):**
```
file: <haulage_cost.pdf>
doc_type: "Haulage Cost"
category: "booking"
remarks: "Haulage cost details"
```

---

### 7.6 Complete Pending Docs (Move to Stage 9)
**POST** `/api/liner/sales-input/{id}/approve/`

**User Role Required:** CS Team or CNF Team

**Request:**
```json
{
  "remarks": "All pending documents uploaded"
}
```

**Response (200 OK) - All Docs Complete → Stage 9:**
```json
{
  "status": "success",
  "message": "Processed. Stage: 7 → 9",
  "data": {
    "id": 123,
    "current_stage": "9",
    "status": "approved",
    "is_fac_uploaded": true,
    "is_ed_uploaded": true,
    "is_ro_uploaded": true,
    "is_boc_uploaded": true,
    "is_cost_sheet_uploaded": true,
    "approval_history": [
      {
        "stage": "Pending Docs Upload",
        "role": "CS_CNF",
        "status": "Completed",
        "remarks": "All documents uploaded - All pending documents uploaded"
      }
    ]
  }
}
```

**Response (200 OK) - Docs Still Pending:**
```json
{
  "status": "success",
  "message": "Progress saved. Pending documents: FAC, BOC",
  "data": {
    "id": 123,
    "current_stage": "7",
    "is_fac_uploaded": false,
    "is_boc_uploaded": false
  }
}
```

---

## STAGE 9: Job Completed

Job is now complete. No further actions required.

**GET** `/api/liner/sales-input/{id}/`

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Sales input details fetched successfully",
  "data": {
    "id": 123,
    "export_number": "FW/0001/26",
    "current_stage": "9",
    "status": "approved",
    "customer_name": "ABC Trading LLC",
    "job_type": "FORWARDING",
    "is_hod_approved": true,
    "is_cs_updated": true,
    "is_cs_hod_approved": true,
    "is_cnf_loadlist_uploaded": true,
    "is_fac_uploaded": true,
    "is_ed_uploaded": true,
    "is_ro_uploaded": true,
    "is_boc_uploaded": true,
    "is_cost_sheet_uploaded": true,
    "is_lpo_uploaded": true,
    "is_hbl_uploaded": true,
    "documents": [
      {"doc_type": "Load List", "file_url": "..."},
      {"doc_type": "HBL", "file_url": "..."},
      {"doc_type": "LPO", "file_url": "..."},
      {"doc_type": "Bank Slip", "file_url": "..."},
      {"doc_type": "FAC", "file_url": "..."},
      {"doc_type": "ED", "file_url": "..."},
      {"doc_type": "Release Order", "file_url": "..."},
      {"doc_type": "BOC", "file_url": "..."},
      {"doc_type": "Haulage Cost", "file_url": "..."}
    ],
    "approval_history": [
      {"stage": "Sales Created", "status": "Sales Created"},
      {"stage": "Sales HOD Approval", "status": "Approved"},
      {"stage": "CS Team Update", "status": "UPDATED"},
      {"stage": "CNF Load List Upload", "status": "UPDATED"},
      {"stage": "CS Documentation Phase", "status": "UPDATED"},
      {"stage": "CS HOD Approval", "status": "Approved"},
      {"stage": "Accounts Payment", "status": "Approved"},
      {"stage": "Pending Docs Upload", "status": "Completed"}
    ]
  }
}
```

---

## Rejection Flows

### Stage 2 Rejection (Sales HOD/CS/CNF)
**POST** `/api/liner/sales-input/{id}/reject/`

**Result:** Job returns to Stage 1. A new request must be created.

```json
{
  "status": "success",
  "message": "Job rejected by Sales HOD. A new request must be created.",
  "data": {
    "previous_stage": "2",
    "current_stage": "1",
    "rejection_status": "rejected"
  }
}
```

---

### Stage 5 Rejection (CS HOD) - FORWARDING
**POST** `/api/liner/sales-input/{id}/reject/`

**Result:** Job returns to Stage 4 for CS Team to correct.

```json
{
  "status": "success",
  "message": "Job rejected by CS HOD. Returned to CS Team for corrections.",
  "data": {
    "previous_stage": "5",
    "current_stage": "4",
    "rejection_status": "CSHOD-REJECTED"
  }
}
```

---

### Stage 6 Rejection (Accounts)
**POST** `/api/liner/sales-input/{id}/reject/`

**Result:** Job returns to Stage 5 for CS HOD review.

```json
{
  "status": "success",
  "message": "Job rejected by Accounts. Returned to CS HOD for review.",
  "data": {
    "previous_stage": "6",
    "current_stage": "5",
    "rejection_status": "ACCOUNTS-REJECTED"
  }
}
```

---

## Validation Rules

### HOD Cannot Approve After User Rejection
If CS or CNF rejects at Stage 2, Sales HOD cannot approve.

**Request:** Sales HOD tries to approve
**Response (400):**
```json
{
  "status": "error",
  "message": "Cannot approve: This job was rejected by CS. A new request must be created.",
  "data": {
    "rejected_by": "CS",
    "rejection_remarks": "Missing required documents"
  }
}
```

---

## Document Types by Department

### CS Team Documents
| Doc Type | Stage | Required |
|----------|-------|----------|
| FAC | 7 | Only if FAC selected |
| ED | 7 | Yes |
| LPO | 4 | LPO or Invoice required |
| Invoice | 4 | LPO or Invoice required |
| HBL | 4 | Only if HBL selected |

### CNF Team Documents
| Doc Type | Stage | Required |
|----------|-------|----------|
| Load List | 3 | Yes (if required flag set) |
| Release Order | 7 | Yes (if required flag set) |
| BOC | 7 | Yes |
| Haulage Cost | 7 | Yes |
| Haulier Note | 7 | Yes (if required flag set) |

### Accounts Team Documents
| Doc Type | Stage | Required |
|----------|-------|----------|
| Bank Slip | 6 | Yes |

---

## Status Values

| Status | Description |
|--------|-------------|
| `draft` | Job created but not submitted |
| `submitted` | Job in workflow (Stages 2-7) |
| `approved` | Job completed (Stage 9) |
| `rejected` | Job rejected, needs new request |
| `CS-REJECTED` | Rejected by CS Team |
| `CNF-REJECTED` | Rejected by CNF Team |
| `CSHOD-REJECTED` | Rejected by CS HOD |
| `ACCOUNTS-REJECTED` | Rejected by Accounts |

---

## Flags Reference

| Flag | Description |
|------|-------------|
| `is_hod_approved` | Sales HOD has approved (Stage 2) |
| `is_cs_updated` | CS Team has updated (Stage 2) |
| `is_cnf_loadlist_uploaded` | CNF has uploaded Load List (Stage 3) |
| `is_cs_hod_approved` | CS HOD has approved (Stage 5) |
| `is_fac_uploaded` | FAC document uploaded |
| `is_ed_uploaded` | ED document uploaded |
| `is_ro_uploaded` | Release Order uploaded |
| `is_boc_uploaded` | BOC document uploaded |
| `is_cost_sheet_uploaded` | Haulage Cost Sheet uploaded |
| `is_lpo_uploaded` | LPO document uploaded |
| `is_invoice_uploaded` | Invoice document uploaded |
| `is_hbl_uploaded` | HBL document uploaded |
| `is_load_list_uploaded` | Load List document uploaded |

---

## Helper Endpoints

### Get Job Details
**GET** `/api/liner/sales-input/{id}/`

### List All Jobs
**GET** `/api/liner/sales-input/`

### List Draft Jobs
**GET** `/api/liner/sales-input/draft/`

### List Submitted Jobs
**GET** `/api/liner/sales-input/submitted/`

### Get Reports
**GET** `/api/liner/sales-input/reports/`

### Save Details (Partial Update)
**POST** `/api/liner/sales-input/{id}/save-details/`

### Update Document Remarks
**PATCH** `/api/liner/sales-input/{id}/update-document-remarks/`

```json
{
  "doc_id": 456,
  "remarks": "Updated remarks for document"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "status": "error",
  "message": "Error description"
}
```

### 403 Forbidden (Wrong Department)
```json
{
  "status": "error",
  "message": "Only Customer Support (CS) Team can upload FAC."
}
```

### 404 Not Found
```json
{
  "status": "error",
  "message": "Not found."
}
```

### 500 Internal Server Error
```json
{
  "status": "error",
  "message": "Error details"
}
```
