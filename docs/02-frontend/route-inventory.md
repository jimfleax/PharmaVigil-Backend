# Frontend Route Inventory

**Tiers:** `DAY_ONE_REQUIRED`, `MOCKED_FOR_DEMO`, `SPECIFIED_DEFERRED`. Confirm during contract freeze.

| Route ID | Path | Role | Purpose / states | API families | Tier |
|---|---|---|---|---|---|
| UI-AUTH-001 | `/auth/register` | Public | Register patient/request staff membership; validation | auth/membership | DAY_ONE_REQUIRED |
| UI-AUTH-002 | `/auth/login` | Public | Login; invalid/rate limit | auth | DAY_ONE_REQUIRED |
| UI-AUTH-003 | `/auth/pending` | Authenticated | Pending/inactive membership | auth | DAY_ONE_REQUIRED |
| UI-AUTH-004 | `/auth/accept-invitation` | Invitee | Accept invitation; expired/used | auth | SPECIFIED_DEFERRED |
| UI-AUTH-005 | `/auth/forgot-password` | Public | Recovery request, no enumeration | auth | SPECIFIED_DEFERRED |
| UI-AUTH-006 | `/auth/reset-password` | Public | Single-use reset token | auth | SPECIFIED_DEFERRED |
| UI-AUTH-007 | `/auth/logout` | All | Revoke session | auth | DAY_ONE_REQUIRED |
| UI-ADMIN-001 | `/admin` | Admin | Overview/queues | membership/dashboard | DAY_ONE_REQUIRED |
| UI-ADMIN-002 | `/admin/memberships` | Admin | Approve/reject requests | memberships | DAY_ONE_REQUIRED |
| UI-ADMIN-003 | `/admin/memberships/[id]` | Admin | Assign role/suspend/revoke | memberships | DAY_ONE_REQUIRED |
| UI-ADMIN-004 | `/admin/users` | Admin | Hospital users/filter/status | users | DAY_ONE_REQUIRED |
| UI-ADMIN-005 | `/admin/patients/linking` | Admin | Resolve ambiguous patient link | patients | SPECIFIED_DEFERRED |
| UI-ADMIN-006 | `/admin/audit` | Admin | Read-only audit search | audit | SPECIFIED_DEFERRED |
| UI-ADMIN-007 | `/admin/rules` | Reviewer/admin | Rule lifecycle interface | rule sets | SPECIFIED_DEFERRED |
| UI-ADMIN-008 | `/admin/demo-reset` | Admin | Confirm scoped reset | demo | DAY_ONE_REQUIRED, restricted |
| UI-DOCTOR-001 | `/doctor` | Doctor | Task queue | tasks/alerts | DAY_ONE_REQUIRED |
| UI-DOCTOR-002 | `/doctor/tasks/[id]` | Doctor | Review case/evidence | alerts/checks | DAY_ONE_REQUIRED |
| UI-DOCTOR-003 | `/doctor/tasks/[id]/disposition` | Doctor | Typed disposition + rationale | alerts | DAY_ONE_REQUIRED |
| UI-DOCTOR-004 | `/doctor/prescriptions` | Doctor | Prescription list/history | prescriptions | DAY_ONE_REQUIRED |
| UI-DOCTOR-005 | `/doctor/prescriptions/new` | Doctor | Create/revise | prescriptions | DAY_ONE_REQUIRED for revision |
| UI-DOCTOR-006 | `/doctor/orders` | Doctor | Inpatient order list | orders | SPECIFIED_DEFERRED/minimal |
| UI-DOCTOR-007 | `/doctor/orders/new` | Doctor | Create/change order | orders | SPECIFIED_DEFERRED/minimal |
| UI-DOCTOR-008 | `/doctor/appointments` | Doctor | Appointment list | appointments | DAY_ONE if capacity |
| UI-PHARM-001 | `/pharmacist` | Pharmacist | Work queue/holds | cases | DAY_ONE_REQUIRED |
| UI-PHARM-002 | `/pharmacist/patients/search` | Pharmacist | Search synthetic ID | patients | DAY_ONE_REQUIRED |
| UI-PHARM-003 | `/pharmacist/patients/[id]/confirm` | Pharmacist | Confirm identity before linking | patients | DAY_ONE_REQUIRED |
| UI-PHARM-004 | `/pharmacist/capture` | Pharmacist | Camera/file capture | capture | DAY_ONE_REQUIRED |
| UI-PHARM-005 | `/pharmacist/cases/[id]/extract` | Pharmacist | OCR fields/corrections | capture | DAY_ONE_REQUIRED |
| UI-PHARM-006 | `/pharmacist/cases/[id]/medicines` | Pharmacist | Confirm ingredient/strength/form | catalogue/capture | DAY_ONE_REQUIRED |
| UI-PHARM-007 | `/pharmacist/cases/[id]/check` | Pharmacist | Start/retry check | checks | DAY_ONE_REQUIRED |
| UI-PHARM-008 | `/pharmacist/cases/[id]/results` | Pharmacist | Coverage/evidence/next action | checks/alerts | DAY_ONE_REQUIRED |
| UI-PHARM-009 | `/pharmacist/cases/[id]/authorize` | Pharmacist | Workflow authorization | dispensing | DAY_ONE_REQUIRED |
| UI-PHARM-010 | `/pharmacist/history` | Pharmacist | Revision/check history | prescriptions/checks | DAY_ONE_REQUIRED |
| UI-PHARM-011 | `/pharmacist/orders` | Pharmacist | Inpatient order queue | orders | SPECIFIED_DEFERRED/minimal |
| UI-PHARM-012 | `/pharmacist/appointments` | Pharmacist | Appointment view | appointments | SPECIFIED_DEFERRED |
| UI-PAT-001 | `/patient` | Patient | Own record overview | patient summary | DAY_ONE_REQUIRED |
| UI-PAT-002 | `/patient/prescriptions` | Patient | Own prescriptions/status | patient prescriptions | DAY_ONE_REQUIRED |
| UI-PAT-003 | `/patient/prescriptions/[id]` | Patient | Patient-visible detail/history | patient prescriptions | DAY_ONE_REQUIRED |
| UI-PAT-004 | `/patient/appointments` | Patient | Upcoming/past, cancel | appointments | DAY_ONE if capacity |
| UI-PAT-005 | `/patient/appointments/new` | Patient | Basic booking | appointments | DAY_ONE if capacity |
| UI-PAT-006 | `/patient/history` | Patient | Own visible history | patient history | DAY_ONE_REQUIRED |
| UI-PAT-007 | `/patient/medication-history` | Patient | Report meds/allergies | history | SPECIFIED_DEFERRED |
| UI-SHARED-001 | `/unauthorized` | All | Access denied | none | DAY_ONE_REQUIRED |
| UI-SHARED-002 | `/not-found` | All | Safe not-found | none | DAY_ONE_REQUIRED |
| UI-SHARED-003 | `/error` | All | Recoverable error/request ID | none | DAY_ONE_REQUIRED |

## Required specification for every route
Include role and hospital scope, entry/exit conditions, purpose, API operation IDs, loading/empty/success/validation/conflict/network/unauthorized states, form validation, destructive confirmation, accessibility/mobile behavior, implementation tier, and test IDs.
