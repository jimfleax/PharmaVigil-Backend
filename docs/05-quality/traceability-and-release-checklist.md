# Traceability and Release Checklist

| Requirement | Implementation area | Verification |
|---|---|---|
| REQ-SAFE-001 OCR confirmation | Capture endpoint + pharmacist UI | TEST-OCR-001 |
| REQ-SAFE-002 unresolved match blocks | Medicine matcher | TEST-MED-002/003/004 |
| REQ-SAFE-003 missing context blocks | Rule engine | TEST-ALLERGY-002, RULE-003 |
| REQ-SAFE-004 failure blocks | Check + authorization guard | TEST-FAIL-001/002 |
| REQ-SAFE-005 no-match not safe | API/UI wording | TEST-RULE-002 |
| REQ-SAFE-006 disposition/auth separate | Alert/dispensing services | TEST-ALERT-001, DISP-001 |
| REQ-SAFE-007 provenance | Rule schema/check snapshot | TEST-RULE-004 |
| REQ-SAFE-008 revisions traceable | PrescriptionRevision | TEST-RX-001/002 |
| REQ-SEC-001 tenant enforcement | Middleware/repositories | TEST-SEC-001 |
| REQ-SEC-002 backend authorization | Route permission policy | TEST-SEC-002/003 |
| REQ-SEC-003 secure sessions | Auth middleware | TEST-AUTH-001/004 |
| REQ-SEC-004 concurrency | Version/ETag checks | TEST-CONC-001 |
| REQ-SEC-005 audit | Audit service | TEST-AUDIT-001 |
| REQ-SEC-006 safe reset | Reset service | TEST-RESET-001/002 |
| REQ-INT-001 OpenAPI | Backend contract | Contract lint |
| REQ-INT-002 error envelope | Global error handler | TEST-API-001 |
| REQ-INT-003 idempotency | Idempotency service | TEST-IDEMP-001/002 |
| REQ-INT-004 pinned contract | Generated client/version | CI contract check |

## Before deployment
- [ ] OpenAPI lint and contract tests pass.
- [ ] Typecheck, lint, build, unit, integration tests pass.
- [ ] Secrets only in platform environment settings.
- [ ] No real patient data/images in fixtures.
- [ ] Ruleset says `ILLUSTRATIVE_NOT_VALIDATED` unless formally reviewed.
- [ ] Exact CORS origins; no wildcard with credentials.
- [ ] Cookie attributes and CSRF/origin checks tested.
- [ ] Reset disabled outside designated demo.
- [ ] Tenant indexes exist and are verified.
- [ ] Image retention/deletion tested.
- [ ] Demo-only disclaimer visible.

## After deployment
- [ ] Health/readiness works.
- [ ] Register, pending approval, login, logout work.
- [ ] Role-specific pages and APIs behave correctly.
- [ ] Cookie works on actual domains and logout invalidates it.
- [ ] Cross-origin cookie behavior tested.
- [ ] Primary outpatient journey passes.
- [ ] Failed/incomplete/unsupported cases block authorization.
- [ ] Reset affects only designated workspace.
- [ ] Local fallback rehearsed.

## Go/no-go
No public demo release if any critical gate fails. Defer features rather than disabling safety/security controls.
