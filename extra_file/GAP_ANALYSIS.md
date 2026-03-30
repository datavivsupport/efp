# Gap Analysis: Documentation vs Implementation

## Overview

This document provides a comprehensive analysis comparing the documented requirements (from `DMS WORK FLOW DETAILS.pdf` and `FORWARDING_API_FLOW.md`) against the actual implementation in the codebase.

**Analysis Date:** 2026-03-30
**Codebase:** Liner Application (React Frontend + Django Backend)

---

## Table of Contents

1. [Job Type Specific Flows](#1-job-type-specific-flows)
2. [Stage-Specific Features](#2-stage-specific-features)
3. [Additional Fields](#3-additional-fields)
4. [Document Upload Enhancements](#4-document-upload-enhancements)
5. [Admin Permission & Audit Features](#5-admin-permission--audit-features)
6. [Notification System](#6-notification-system)
7. [Dashboard & Reports](#7-dashboard--reports)
8. [Conditional Workflow Logic](#8-conditional-workflow-logic)
9. [UI/UX Issues](#9-uiux-issues)
10. [Integration Requirements](#10-integration-requirements)
11. [Role-Based View Control](#11-role-based-view-control)
12. [Workflow Completion Status](#12-workflow-completion-status)
13. [Priority Summary](#13-priority-summary)

---

## 1. Job Type Specific Flows

### Status Legend
- ✅ Implemented
- ⚠️ Partial
- ❌ Missing

| Feature | Documented | Implemented | Status | Notes |
|---------|------------|-------------|--------|-------|
| **LINER Business Flow** | Conditional flow at Stage 5 based on LPO/Invoice Yes/No selection | Basic workflow exists | ⚠️ | Missing Yes/No selector field and conditional halt logic |
| **FORWARDING Business Flow** | Complete 9-stage workflow | Implemented | ✅ | Core workflow functional |
| **CROSS TRADE Business Flow** | Conditional flow at Stage 5 with Release Order Yes/No selector | Basic workflow exists | ⚠️ | Missing conditional flow and third-party payment logic |
| **OTHERS Job Type Fields** | CARRIER, VSL/VOY, POL, FREIGHT MANIFEST, LOAD LIST, TDR/Sailing Report, OTHER DOCS | Partial fields exist | ⚠️ | Missing dedicated fields for TDR/Sailing Report with linked remarks |

### Required Actions:
- [ ] Add Yes/No selection field before LPO/Invoice fields for LINER
- [ ] Add Yes/No selection field before Release Order for CROSS TRADE
- [ ] Implement conditional halt logic when "No" is selected
- [ ] Add TDR/Sailing Report dedicated upload field for OTHERS

---

## 2. Stage-Specific Features

| Stage | Feature | Status | Details |
|-------|---------|--------|---------|
| **Stage 1** | Sales creates request with all mandatory fields | ✅ | Implemented |
| **Stage 2** | Parallel approval (Sales HOD + CS + CNF) | ✅ | Implemented |
| **Stage 2** | CNF notification when Transportation selected | ❌ | PDF specifies CNF should be notified if Transportation is selected |
| **Stage 2** | Block HOD approval if CS/CNF rejected | ✅ | Implemented via `_has_user_rejection()` |
| **Stage 3** | CNF uploads Load List | ✅ | Implemented |
| **Stage 4A** | CS HOD Selection dropdown during HBL upload | ❌ | Not implemented as per PDF |
| **Stage 4AA** | DOCS Team BL Verification as standalone stage | ⚠️ | Role exists but no dedicated approval track in UI |
| **Stage 5** | CS HOD Approval | ✅ | Implemented |
| **Stage 6** | Accounts uploads Bank Slip | ✅ | Implemented |
| **Stage 7** | Pending Docs Upload | ✅ | Implemented |
| **Stage 7** | Reminder notification after 2 days | ❌ | No scheduled notification system |
| **Stage 7** | Reminder notification after 5 days | ❌ | No reminder system implemented |
| **Stage 9** | Job Completed | ✅ | Implemented |

### Required Actions:
- [ ] Add CNF notification trigger when Transportation checkbox is selected
- [ ] Add CS HOD selection dropdown at Stage 4A
- [ ] Create dedicated DOCS Team verification UI at Stage 4AA
- [ ] Implement scheduled reminder system for Stage 7

---

## 3. Additional Fields

### Missing Fields from PDF Requirements

| Field Name | Location Required | Job Type | Status | Backend Model Field |
|------------|-------------------|----------|--------|---------------------|
| **POL VSL Initial ETA** | Booking Details | Liner & Forwarding | ❌ | `vsl_initial_eta` exists but not in frontend |
| **POL VSL Latest ETA** | Booking Details | Liner & Forwarding | ❌ | `vsl_latest_eta` exists but not in frontend |
| **POL ETD** | Booking Details | Liner & Forwarding | ❌ | `vsl_etd` exists but not in frontend |
| **POD ETA** | Booking Details | Liner & Forwarding | ❌ | `pod_eta` exists but not in frontend |
| **Overseas Agent Name** | Basic Info | Forwarding Only | ❌ | Need to add field |
| **Pre-Alert Upload** | Documents Section | All | ❌ | No dedicated Pre-Alert upload field |
| **Haulage Note Upload** (multiple) | Documents | Forwarding | ⚠️ | Single upload only, not multiple |

### Required Actions:
- [ ] Add POL VSL Initial ETA field to frontend (Booking Details section)
- [ ] Add POL VSL Latest ETA field to frontend
- [ ] Add POL ETD field to frontend
- [ ] Add POD ETA field to frontend
- [ ] Add Overseas Agent Name field for Forwarding jobs
- [ ] Add Pre-Alert document upload field
- [ ] Enable multiple Haulage Note uploads

---

## 4. Document Upload Enhancements

### Current State vs Requirements

| Document Type | Current | Required | Status |
|---------------|---------|----------|--------|
| **CRO Upload** | Single | Multiple with linked remarks | ❌ |
| **ED (Export Declaration)** | Single | Multiple with linked remarks | ❌ |
| **LPO Upload** | Single | Multiple with approval workflow (HOD + Accounts) | ❌ |
| **Invoice Upload** | Single | Multiple with approval workflow | ❌ |
| **Remarks per document** | Partial | Adjacent text field for each upload | ⚠️ |

### PDF Page 18 Requirement:
> "Provide an input text field adjacent to each document upload slot. This field should allow users to enter remarks or descriptions that are directly linked to the corresponding upload."

### Required Actions:
- [ ] Implement dynamic "Add Row" for CRO uploads with remarks field
- [ ] Implement dynamic "Add Row" for ED uploads with remarks field
- [ ] Implement multiple LPO uploads with HOD + Accounts approval workflow
- [ ] Implement multiple Invoice uploads with approval workflow
- [ ] Ensure all document uploads have adjacent remarks input field
- [ ] Store and retrieve remarks alongside related document

---

## 5. Admin Permission & Audit Features

### Missing Features (PDF Page 20)

| Feature | Description | Status |
|---------|-------------|--------|
| **Admin approval for document modification** | Users editing/deleting docs must trigger permission check | ❌ |
| **Admin approval for document removal** | System should prompt for admin approval before allowing deletion | ❌ |
| **Admin approval for document re-upload** | Re-uploading requires admin authorization | ❌ |
| **Audit log with timestamp** | All changes logged with timestamp | ⚠️ |
| **Audit log with user ID** | Track which user made changes | ⚠️ |
| **Audit log with admin approver ID** | Track which admin approved changes | ❌ |
| **Container details edit audit** | Track changes to container details | ❌ |
| **Special instructions edit audit** | Track changes to special instructions | ❌ |
| **Other charges edit audit** | Track changes to other charges | ❌ |

### Documents Requiring Admin Control:
- CRO
- LPO
- Invoice
- BL/HBL
- Haulier Sheet
- Load List
- ED
- Any uploaded document

### Required Actions:
- [ ] Create admin approval workflow for document modifications
- [ ] Add permission check before edit/delete operations
- [ ] Implement comprehensive audit trail with admin approver tracking
- [ ] Create audit report accessible to all users
- [ ] Add field-level change tracking for Sales Input stage fields

---

## 6. Notification System

### Missing Notifications by Stage

| Stage | Trigger Event | Recipients | Status |
|-------|---------------|------------|--------|
| **Stage 1** | Sales creates request | CS / SALES HOD / CNF (if Transportation selected) | ❌ |
| **Stage 2A** | CS updates details | CNF Team | ❌ |
| **Stage 2B** | Sales HOD approves | CS / CNF Teams | ❌ |
| **Stage 3** | CNF uploads Load List | CS Team | ❌ |
| **Stage 4A** | CS uploads HBL | DOCS Team | ❌ |
| **Stage 4B** | CS uploads LPO/Invoice | CS HOD | ❌ |
| **Stage 5** | CS HOD approves | Accounts / CS Team | ❌ |
| **Stage 6** | Accounts uploads payment | CS Team / CNF Team | ❌ |
| **Stage 7** | 2 days after accounts update | CS / CNF Team (reminder) | ❌ |
| **Stage 7** | 5 days after accounts update | CS / CNF Team (reminder) | ❌ |
| **All** | Sales Booking alert should reflect POD | Relevant teams | ❌ |

### Required Actions:
- [ ] Design notification service architecture
- [ ] Implement email notification integration
- [ ] Implement in-app notification system
- [ ] Create scheduled job for reminder notifications (2 days, 5 days)
- [ ] Add POD information to booking alerts

---

## 7. Dashboard & Reports

### Current Implementation

| Feature | Status | Notes |
|---------|--------|-------|
| Basic Dashboard with status | ✅ | Implemented |
| Income Report chart | ✅ | Implemented |
| Export Details pie chart | ✅ | Implemented |
| Job filtering by type | ✅ | Implemented |
| Pending tasks per user | ⚠️ | Partial implementation |

### Missing Features

| Feature | Status | PDF Reference |
|---------|--------|---------------|
| User-Defined Reports | ❌ | Page 21 - Custom export register format |
| Export Register Format | ❌ | Referenced Excel format in PDF |
| Shipment tracking dashboard | ❌ | Page 21 - Track shipment details |
| Pending tasks identification | ⚠️ | Page 18 - Identify pending tasks at any point |

### Required Actions:
- [ ] Implement custom report builder
- [ ] Create Export Register report with specified format
- [ ] Add shipment tracking dashboard view
- [ ] Enhance pending tasks visibility per user

---

## 8. Conditional Workflow Logic

### LINER Business (PDF Page 3, 12-13)

| Condition | Action Required | Status |
|-----------|-----------------|--------|
| Yes/No selection before LPO/Invoice | Control process flow based on selection | ❌ |
| If "No" selected | Halt process, trigger alert for pending uploads | ❌ |
| Haulage upload field | New field with completion remarks | ❌ |
| Pending list generation | System should generate list of missing documents | ⚠️ |

### CROSS TRADE Business (PDF Page 13)

| Condition | Action Required | Status |
|-----------|-----------------|--------|
| Yes/No selector before Release Order | Control process at Stage 5 | ❌ |
| If "No" selected | Halt process | ❌ |
| Third-party payment | Yes/No selector for LPO/Invoice upload | ❌ |
| After LPO/Invoice approval | Initiate CS HOD & Accounts approval | ❌ |
| Alert message | Inform about pending uploads | ❌ |

### Pending List Alert (PDF Page 17)

```
Dear CSV Updation and CNF Team,

Below are the list of documents are not uploaded yet:
- Bank Slip Document is not attached
- BOC Document is not attached
- FAC Document is not attached

Request No #: 6239
Carrier Name: UNIFEEDER
Customer Name: THE GOLDEN LINE
Name of Executive: Vivek sharda
Action: [Click Here]
```

### Required Actions:
- [ ] Add Yes/No selector fields for conditional flows
- [ ] Implement process halt logic
- [ ] Create pending documents alert message component
- [ ] Add Haulage upload field with completion remarks
- [ ] Generate dynamic pending list based on job type and uploaded documents

---

## 9. UI/UX Issues

### Known Issues from PDF

| Issue | Description | Status | PDF Reference |
|-------|-------------|--------|---------------|
| **Transportation rows display bug** | After saving, only first row remains visible | ❓ Needs Verification | Page 5 |
| **ETA column disappears** | ETA values not retained after saving | ❓ Needs Fix | Page 21 |

### Required Actions:
- [ ] Verify and fix transportation rows display issue
- [ ] Fix ETA column persistence issue
- [ ] Ensure all saved data is properly displayed on reload

---

## 10. Integration Requirements

### Missing Integrations

| Integration | Description | Status | PDF Reference |
|-------------|-------------|--------|---------------|
| **IAS DMS Link** | Documents should link to IAS DMS | ❌ | Page 2, Stage 5 |
| **Email Service** | Send notifications via email | ❌ | Throughout workflow |
| **Scheduled Jobs** | For reminder notifications | ❌ | Stage 7 reminders |

### Required Actions:
- [ ] Design IAS DMS integration architecture
- [ ] Implement email notification service
- [ ] Set up scheduled job system (Celery/Cron)

---

## 11. Role-Based View Control

### Current Roles

| Role | Status |
|------|--------|
| ADMIN, SUPER ADMIN | ✅ |
| SALES_EXECUTIVE, SALES_HOD | ✅ |
| CS_EXECUTIVE, CS_HOD | ✅ |
| CNF_EXECUTIVE, CNF_HOD | ✅ |
| ACCOUNTS_TEAM | ✅ |
| DOCS_TEAM | ✅ |
| GM (General Manager) | ✅ |

### Verification Needed

| Role | Expected Access | Status |
|------|-----------------|--------|
| **DOCS Team** | Can only VIEW BL document (not edit) at Stage 4AA | ❓ Needs Verification |
| **ROC Upload** | Mandatory for CS at Stage 2 (Basic info & ROC Upload) | ❓ Unclear - ROC not clearly defined |

### Required Actions:
- [ ] Verify DOCS Team read-only access for BL documents
- [ ] Clarify ROC (Release Order from Carrier?) requirement
- [ ] Ensure proper role-based field locking

---

## 12. Workflow Completion Status

### Current State

| Feature | Status |
|---------|--------|
| Stage 9 as completion stage | ✅ |
| Status changes to "approved" | ✅ |
| "Workflow Completed" explicit status | ⚠️ |

### PDF Requirement (Page 22):
> "Once all required documents are uploaded, the system should automatically update the status to 'Workflow Completed.'"

### Required Actions:
- [ ] Add explicit "Workflow Completed" status value
- [ ] Auto-update status when all required documents uploaded
- [ ] Display completion status prominently in UI

---

## 13. Priority Summary

### High Priority (Critical for Workflow)

| # | Feature | Effort Estimate |
|---|---------|-----------------|
| 1 | Notification System | High |
| 2 | Admin Document Control & Audit | High |
| 3 | Multiple Document Uploads (CRO, ED, LPO, Invoice) | Medium |
| 4 | Conditional Flow Logic (Yes/No selectors) | Medium |
| 5 | ETA Fields Expansion (4 new fields) | Low |

### Medium Priority (Enhancement)

| # | Feature | Effort Estimate |
|---|---------|-----------------|
| 6 | Reminder System (Scheduled notifications) | Medium |
| 7 | User-Defined Reports | High |
| 8 | Pre-Alert & Haulage Note uploads | Low |
| 9 | Overseas Agent Name field | Low |
| 10 | Pending List Alert Message | Medium |

### Low Priority (Nice to Have)

| # | Feature | Effort Estimate |
|---|---------|-----------------|
| 11 | IAS DMS Integration | High |
| 12 | DOCS Team Stage 4AA dedicated UI | Medium |
| 13 | UI/UX Bug Fixes (Transportation rows, ETA persistence) | Low |

---

## Implementation Roadmap Suggestion

### Phase 1: Core Workflow Enhancements
- Add missing ETA fields to frontend
- Fix UI/UX bugs (transportation rows, ETA persistence)
- Add Overseas Agent Name field
- Add Pre-Alert upload field

### Phase 2: Document Management
- Implement multiple document uploads
- Add remarks field to all documents
- Create admin approval workflow for document changes
- Enhance audit trail

### Phase 3: Conditional Logic
- Add Yes/No selectors for LINER and CROSS TRADE
- Implement process halt logic
- Create pending documents alert system

### Phase 4: Notifications & Reports
- Design notification architecture
- Implement email service
- Create scheduled reminder jobs
- Build user-defined reports

### Phase 5: Integrations
- IAS DMS integration
- Complete audit system
- Performance optimization

---

## Appendix: File Locations

### Frontend Files
- `/src/Components/ApprovalDashboard/ApprovalDashboard.jsx` - Dashboard
- `/src/Components/SalesInput/SalesInput.jsx` - Sales Input Form
- `/src/Components/Approval/Approval.jsx` - Approval Workflow

### Backend Files
- `/home/nitish/oceann/sharaf/sharafshipping-restapi/liner/models.py` - Django Models
- `/home/nitish/oceann/sharaf/sharafshipping-restapi/liner/views.py` - API Views
- `/home/nitish/oceann/sharaf/sharafshipping-restapi/liner/serializers.py` - Serializers
- `/home/nitish/oceann/sharaf/sharafshipping-restapi/liner/urls.py` - URL Patterns

### Documentation Files
- `/extra_file/DMS WORK FLOW DETAILS.pdf` - Original Requirements
- `/extra_file/FORWARDING_API_FLOW.md` - API Documentation

---

*Document generated from codebase analysis on 2026-03-30*
