# Test Strategy and Acceptance Criteria

## Test levels
1. **Unit:** rule matching, state transitions, validation, permission helpers, coverage computation, normalization.
2. **Integration:** Hono routes with test DB/fixtures; session cookie; tenant-scoped repositories; audit/idempotency; concurrency.
3. **Contract:** OpenAPI request/response conformance and generated frontend types.
4. **End-to-end:** scripted outpatient journey and role-specific views.
5. **Security:** cross-role/cross-hospital, CSRF/CORS, expiry, enumeration, rate limits, file validation.
6. **Manual smoke:** deployed URL, camera, cookie/session, reset guard, mobile viewport, local fallback.

## Critical release gates
- Every deterministic critical-rule fixture passes.
- Unknown/ambiguous/unsupported medicine cannot produce a complete check.
- Missing required context returns `INCOMPLETE`.
- Engine/database failure returns `FAILED` or incomplete/pending; no authorization.
- `NO_MATCHING_RULE` is never displayed as “safe” or “clear.”
- All defined cross-hospital and unauthorized-role requests are rejected.
- Prescription revisions and checks remain traceable.
- Every critical disposition/authorization has an audit event.
- Stale writes return conflict and do not overwrite.
- Duplicate idempotency key does not duplicate the effect.
- Primary outpatient E2E journey passes.
- Build, typecheck, lint, and contract validation pass.

## Test cases
| Test ID | Scenario | Expected result |
|---|---|---|
| TEST-AUTH-001 | Valid login | Secure session set; no secrets returned |
| TEST-AUTH-002 | Invalid login | Generic 401; no account enumeration |
| TEST-AUTH-003 | Pending membership calls clinical API | Denied |
| TEST-AUTH-004 | Suspended membership uses session | Request denied immediately |
| TEST-SEC-001 | Hospital A requests Hospital B patient | Safe 404/403; no data leak |
| TEST-SEC-002 | Patient calls doctor disposition endpoint | 403 |
| TEST-SEC-003 | Client forges role/hospital ID | Ignored/rejected; server membership controls |
| TEST-OCR-001 | OCR medicine is uncertain | Unconfirmed until pharmacist resolves |
| TEST-MED-001 | Exact canonical match | Correct ingredient identity |
| TEST-MED-002 | Brand/synonym with ambiguous strength | Manual resolution required |
| TEST-MED-003 | Unknown brand | Unsupported/incomplete |
| TEST-MED-004 | Combination missing ingredient mapping | Unsupported; no false clear |
| TEST-ALLERGY-001 | Confirmed allergy matches seeded ingredient | Review alert |
| TEST-ALLERGY-002 | Required allergy context missing | Incomplete, not negative |
| TEST-RULE-001 | Every defined seeded critical interaction | Expected alert/version |
| TEST-RULE-002 | No matching seeded rule | `NO_MATCHING_RULE` and limitation |
| TEST-RULE-003 | Required food/drink context missing | `INCOMPLETE` |
| TEST-RULE-004 | Rule set changes | Old check retains old version |
| TEST-FAIL-001 | Rule engine timeout/exception | Failed; no authorization |
| TEST-FAIL-002 | DB fails during authorization | No authorization success |
| TEST-ALERT-001 | Pharmacist records clinical disposition | 403 |
| TEST-ALERT-002 | Doctor disposition lacks rationale | 422 |
| TEST-RX-001 | Doctor revises prescription | New immutable revision; old remains |
| TEST-RX-002 | Old check used for new revision | Authorization rejected |
| TEST-DISP-001 | Unresolved alert exists | Authorization rejected |
| TEST-DISP-002 | Latest check incomplete/failed | Authorization rejected |
| TEST-CONC-001 | Two updates use same version | One succeeds; stale update gets 409 |
| TEST-IDEMP-001 | Retry same key and payload | Same result, no duplicate |
| TEST-IDEMP-002 | Same key, different payload | 409 idempotency conflict |
| TEST-AUDIT-001 | Critical disposition | Audit event exists |
| TEST-RESET-001 | Reset targets non-demo workspace | Rejected |
| TEST-RESET-002 | Reset occurs | Reset audit event survives |
| TEST-RET-001 | Temporary image expires | Image deleted; references retained |
| TEST-APT-001 | Overlapping booking for same doctor/slot | Second booking rejected |
| TEST-API-001 | Invalid body | Standard envelope + request ID |
| TEST-E2E-001 | Full outpatient workflow | Revision rechecked; authorization recorded |
| TEST-E2E-002 | Ambiguous medicine | Incomplete; no authorization |

## E2E script acceptance
1. Pharmacist logs in.
2. Search synthetic patient ID and confirm identity.
3. Capture seeded synthetic image or manually enter.
4. OCR is shown as untrusted suggestion.
5. Pharmacist confirms identity, strength, form.
6. Run deterministic illustrative check.
7. Show alert/evidence/version/limitations.
8. Doctor acknowledges and records `CHANGE_REQUIRED` with rationale.
9. Doctor creates immutable revision.
10. Pharmacist reconfirms/rechecks.
11. Unresolved/incomplete case cannot authorize.
12. Successful seeded workflow records workflow authorization without “safe” claim.
13. Show revision/check/audit trace.
14. Demonstrate one fail-closed case.

## Security matrix
Test every role against read patient same/different hospital, own/other patient, create prescription, confirm capture, start check, acknowledge alert, disposition, dispensing authorization, membership management, demo reset, audit read, and rule-set change. Deny by default.
