# Planned API Endpoint Inventory

Base path `/api/v1`. All tenant-owned operations require server-side tenant scope. Tiers are provisional and must be confirmed at contract freeze.

| Operation ID | Method + path | Purpose | Roles | Tier |
|---|---|---|---|---|
| API-HEALTH-001 | `GET /health/live` | Liveness | Public | DAY_ONE_REQUIRED |
| API-HEALTH-002 | `GET /health/ready` | Dependency readiness, no secrets | Public | DAY_ONE_REQUIRED |
| API-AUTH-001 | `POST /auth/register` | Register user/request membership | Public | DAY_ONE_REQUIRED |
| API-AUTH-002 | `POST /auth/login` | Login and set session cookie | Public | DAY_ONE_REQUIRED |
| API-AUTH-003 | `GET /auth/me` | Current user/membership | Authenticated | DAY_ONE_REQUIRED |
| API-AUTH-004 | `POST /auth/logout` | Revoke session | Authenticated | DAY_ONE_REQUIRED |
| API-AUTH-005 | `POST /auth/invitations/accept` | Accept invitation | Invitee | SPECIFIED_DEFERRED |
| API-AUTH-006 | `POST /auth/password/forgot` | Recovery request | Public | SPECIFIED_DEFERRED |
| API-AUTH-007 | `POST /auth/password/reset` | Reset with token | Public | SPECIFIED_DEFERRED |
| API-HOSP-001 | `GET /hospitals/current` | Current hospital | Member | DAY_ONE_REQUIRED |
| API-MEM-001 | `GET /memberships` | List requests/memberships | Admin | DAY_ONE_REQUIRED |
| API-MEM-002 | `POST /memberships` | Request membership | Authenticated | DAY_ONE_REQUIRED |
| API-MEM-003 | `POST /memberships/{id}/approve` | Approve and assign role | Admin | DAY_ONE_REQUIRED |
| API-MEM-004 | `POST /memberships/{id}/reject` | Reject request | Admin | DAY_ONE_REQUIRED |
| API-MEM-005 | `POST /memberships/{id}/suspend` | Suspend/revoke access | Admin | DAY_ONE_REQUIRED |
| API-USR-001 | `GET /users` | List hospital members | Admin | DAY_ONE_REQUIRED |
| API-PAT-001 | `GET /patients/search` | Search synthetic hospital ID | Pharmacist/authorized staff | DAY_ONE_REQUIRED |
| API-PAT-002 | `GET /patients/{patientId}` | Patient summary | Authorized staff | DAY_ONE_REQUIRED |
| API-PAT-003 | `POST /patients/{patientId}/confirm-link` | Confirm patient link | Patient/admin flow | DAY_ONE_REQUIRED |
| API-PAT-004 | `GET /patient/me/summary` | Patient own summary | Patient | DAY_ONE_REQUIRED |
| API-PAT-005 | `GET /patient/me/prescriptions` | Own prescriptions | Patient | DAY_ONE_REQUIRED |
| API-PAT-006 | `GET /patient/me/history` | Own visible history | Patient | DAY_ONE_REQUIRED |
| API-MED-001 | `GET /medicine-catalogue/search` | Catalogue search | Pharmacist/doctor | DAY_ONE_REQUIRED |
| API-MED-002 | `GET /medicine-catalogue/{itemId}` | Catalogue item detail | Authorized staff | DAY_ONE_REQUIRED |
| API-HIST-001 | `GET /patients/{id}/medication-history` | Medication profile | Authorized staff | DAY_ONE_REQUIRED |
| API-HIST-002 | `POST /patients/{id}/medication-history` | Add medicine history | Authorized role | SPECIFIED_DEFERRED |
| API-ALLERGY-001 | `GET /patients/{id}/allergies` | Allergy/adverse reactions | Authorized staff | DAY_ONE_REQUIRED |
| API-ALLERGY-002 | `POST /patients/{id}/allergies` | Add allergy/reaction | Authorized role | SPECIFIED_DEFERRED |
| API-CAP-001 | `POST /prescription-captures` | Create capture draft | Pharmacist | DAY_ONE_REQUIRED |
| API-CAP-002 | `GET /prescription-captures/{id}` | Read draft | Pharmacist | DAY_ONE_REQUIRED |
| API-CAP-003 | `PATCH /prescription-captures/{id}` | Save corrections | Pharmacist | DAY_ONE_REQUIRED |
| API-CAP-004 | `POST /prescription-captures/{id}/confirm` | Confirm extraction/matches | Pharmacist | DAY_ONE_REQUIRED |
| API-RX-001 | `GET /prescriptions` | List prescriptions | Doctor/pharmacist | DAY_ONE_REQUIRED |
| API-RX-002 | `POST /prescriptions` | Create prescription | Doctor | DAY_ONE_REQUIRED |
| API-RX-003 | `GET /prescriptions/{id}` | Read current prescription | Authorized staff | DAY_ONE_REQUIRED |
| API-RX-004 | `POST /prescriptions/{id}/revisions` | Create immutable revision | Doctor | DAY_ONE_REQUIRED |
| API-RX-005 | `GET /prescriptions/{id}/revisions` | Revision history | Authorized staff | DAY_ONE_REQUIRED |
| API-CHECK-001 | `POST /checks` | Evaluate confirmed revision/order | Authorized workflow actor | DAY_ONE_REQUIRED |
| API-CHECK-002 | `GET /checks/{id}` | Read outcome/coverage/evidence | Authorized staff | DAY_ONE_REQUIRED |
| API-CHECK-003 | `POST /checks/{id}/retry` | Retry failed/incomplete check | Authorized staff | DAY_ONE_REQUIRED |
| API-ALERT-001 | `GET /alerts` | Filter alert queue | Doctor/pharmacist by policy | DAY_ONE_REQUIRED |
| API-ALERT-002 | `GET /alerts/{id}` | Alert detail | Authorized staff | DAY_ONE_REQUIRED |
| API-ALERT-003 | `POST /alerts/{id}/acknowledge` | Acknowledge alert | Doctor | DAY_ONE_REQUIRED |
| API-ALERT-004 | `POST /alerts/{id}/disposition` | Record typed doctor disposition | Doctor | DAY_ONE_REQUIRED |
| API-ALERT-005 | `POST /alerts/{id}/resolve` | Resolve permitted transition | Doctor | DAY_ONE_REQUIRED |
| API-DISP-001 | `POST /dispensing-authorizations` | Record workflow authorization | Pharmacist | DAY_ONE_REQUIRED |
| API-ORD-001 | `GET /medication-orders` | List inpatient orders | Doctor/pharmacist | SPECIFIED_DEFERRED/minimal |
| API-ORD-002 | `POST /medication-orders` | Create inpatient order | Doctor | SPECIFIED_DEFERRED/minimal |
| API-ORD-003 | `POST /medication-orders/{id}/versions` | Change order | Doctor | SPECIFIED_DEFERRED/minimal |
| API-ORD-004 | `GET /medication-orders/{id}` | Read order/history | Authorized staff | SPECIFIED_DEFERRED/minimal |
| API-APT-001 | `GET /appointments` | List authorized appointments | Patient/doctor/admin | DAY_ONE if capacity |
| API-APT-002 | `POST /appointments` | Book appointment | Patient/admin | DAY_ONE if capacity |
| API-APT-003 | `POST /appointments/{id}/cancel` | Cancel appointment | Policy-based | DAY_ONE if capacity |
| API-NOTIF-001 | `GET /notifications` | In-app notifications | Authenticated | DAY_ONE_REQUIRED |
| API-NOTIF-002 | `POST /notifications/{id}/read` | Mark notification read | Owner | DAY_ONE_REQUIRED |
| API-AUD-001 | `GET /audit-events` | Filter audit events | Admin/authorized reviewer | SPECIFIED_DEFERRED |
| API-RULE-001 | `GET /rule-sets/current` | Current rule-set metadata | Authorized staff | DAY_ONE_REQUIRED |
| API-RULE-002 | `GET /rule-sets` | List versions | Admin/reviewer | SPECIFIED_DEFERRED |
| API-RULE-003 | `POST /rule-sets` | Create draft | Rule author | SPECIFIED_DEFERRED |
| API-RULE-004 | `POST /rule-sets/{id}/submit-review` | Submit draft | Rule author | SPECIFIED_DEFERRED |
| API-RULE-005 | `POST /rule-sets/{id}/approve` | Clinical approval | Qualified reviewer | SPECIFIED_DEFERRED |
| API-RULE-006 | `POST /rule-sets/{id}/publish` | Publish immutable version | Authorized publisher | SPECIFIED_DEFERRED |
| API-DEMO-001 | `POST /demo/reset` | Reset synthetic workspace | Demo admin | DAY_ONE_REQUIRED, restricted |
| API-DEMO-002 | `POST /demo/seed` | Seed deterministic fixtures | Dev/demo admin | SPECIFIED_DEFERRED; never unrestricted public |

## Contract freeze
Reconcile this inventory against OpenAPI before coding. No undocumented implemented endpoint. If one-day scope shrinks, update tier rather than silently omitting an operation.
