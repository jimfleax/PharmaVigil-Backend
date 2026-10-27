# Backend PRD — `medication-safety-backend`

## Purpose
Authoritative API for authentication, membership, synthetic patients, prescription capture/revisions, medicine matching, deterministic illustrative rules, alerts, doctor disposition, dispensing workflow authorization, appointments, audit, and scoped demo reset.

## Stack and layers
- Hono + TypeScript.
- Node-compatible target selected after deployment verification; Vercel is a candidate.
- MongoDB with one consistent driver/ODM choice.
- Zod or equivalent runtime validation.
- Pure deterministic rule-engine functions isolated from HTTP/database code.
- Architecture: `routes → middleware → services/use-cases → repositories → MongoDB`.
- No direct database calls in route handlers.

## Suggested structure
```text
src/
  app.ts
  index.ts
  config/env.ts
  middleware/{request-id,session,require-auth,require-membership,require-role,csrf,rate-limit,error-handler}.ts
  routes/{auth,hospitals,memberships,users,patients,catalogue,captures,prescriptions,checks,alerts,dispensing,orders,appointments,notifications,audit,demo,health}.routes.ts
  domain/{auth,prescriptions,medication-orders,medicine-matching,rule-engine,alerts,appointments,audit}/
  services/
  repositories/
  schemas/
  fixtures/
  tests/
  openapi/openapi.yaml
```

## Authorization
For each protected operation validate:
1. Valid non-expired server-side session.
2. Active user account.
3. Active membership in the target hospital.
4. Required role and resource permission.
5. Resource belongs to the same hospital.
6. Workflow permits transition.
7. Expected version matches for protected update.

Hospital scope must be derived from authorized membership, not arbitrary body data. Do not disclose whether foreign-tenant resources exist; return safe not-found where appropriate.

## Core use cases
- Register user/request membership without granting clinical role.
- Approve membership and assign role through admin permission.
- Confirm patient identity by synthetic hospital ID.
- Create capture; extract OCR client-side or through reviewed local flow.
- Confirm/correct extracted fields and canonical medicine identity.
- Evaluate confirmed revision against a pinned rule-set version.
- Persist alerts with source/version/provenance.
- Route alerts to doctor task queue.
- Record doctor disposition with rationale.
- Create new prescription revision rather than mutating old revision.
- Re-evaluate revision and link new check.
- Record pharmacist authorization only after backend revalidation.
- Support separate inpatient create/change orders.
- Basic appointment booking/cancellation with conflict prevention if capacity permits.
- Append audit events for critical mutations.
- Reset only designated synthetic workspace; preserve reset event.

## Rule engine contract
Inputs: hospital/patient, confirmed prescription/order revision, canonical ingredients, relevant strength/form, active medication profile with source/verification status, confirmed and patient-reported allergies/reactions, rule-required context, and explicit ruleset version.

Outputs: `FLAGGED | NO_MATCHING_RULE | INCOMPLETE | UNSUPPORTED | FAILED`; coverage by category; matched ingredients/product mapping; alerts with severity, rationale, source, version, limitations, next action; timestamp/request ID.

`NO_MATCHING_RULE` is not safety clearance. Missing/unresolved required inputs produce `INCOMPLETE` or `UNSUPPORTED`. Exceptions/timeouts/DB failures produce `FAILED`; no dispensing authorization.

## State transitions

### Outpatient
`DRAFT_CAPTURE → CAPTURED → PHARMACIST_CONFIRMED → CHECK_PENDING → CHECK_COMPLETE | CHECK_INCOMPLETE | CHECK_FAILED`

If alerts exist:
`DOCTOR_REVIEW_REQUIRED → ACKNOWLEDGED → UNDER_REVIEW → CHANGE_REQUIRED | CLINICAL_DISPOSITION_RECORDED`

Change required:
`REVISED_PRESCRIPTION_CREATED → PHARMACIST_RECONFIRMATION → NEW_CHECK`

Final authorization requires latest revision, successful check for that exact revision, no unresolved alert, no incomplete/unsupported/failed result, correct hospital/patient, authorized pharmacist, valid expected version, and audit event.

### Inpatient
Separate medication-order aggregate with order version, active/discontinued status, check result, linked alerts. New/changed orders in scope; MAR not in prototype.

## Data and audit
- Validate all external inputs at runtime.
- Tenant filter every repository method for tenant-owned records.
- Confirm MongoDB transaction support before relying on multi-document atomicity.
- If transactions unavailable, use explicit operation states, idempotency, and reconciliation; document limitations.
- Audit includes actor, hospital, action, resource, timestamp, reason/context, request ID, before/after versions, result; minimize sensitive content.
- No audit update/delete API. Application-level append-only is not tamper-proof against database administrators.
- Do not log raw session IDs, credentials, image bytes, or unnecessary clinical narrative.

## Security
- Secure HttpOnly cookie; explicit SameSite; Secure in HTTPS; no broad Domain.
- CSRF/origin protection for state-changing cookie-authenticated requests.
- Exact CORS allowlist; never wildcard with credentials.
- Password hashing with modern vetted library/parameters.
- Rate-limit login, registration, patient search, capture, check, reset.
- File size/type/signature validation if upload exists.
- Secrets only in deployment settings.
- Generic auth failures to reduce enumeration.
- Reset requires admin authorization, explicit confirmation, and demo-workspace scope.

## Acceptance
- Implemented operations validate inputs and permissions.
- Cross-hospital tests reject unauthorized requests.
- State transitions are server-enforced.
- Rule engine is deterministic and fixture-tested.
- Duplicate critical retries do not duplicate effects.
- Stale writes return 409.
- Failed checks cannot create authorization.
- Critical mutations have audit events.
