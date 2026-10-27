# Frontend/Backend Integration Contract

## Ownership
- Backend repository owns canonical `openapi/openapi.yaml`.
- Frontend pins a copy/generated client from a specific contract version.
- Changes require proposal, schema review by both developers, backend contract update, frontend client update, and contract tests.
- No duplicate hand-maintained API response types in frontend.

## Environment variables
Frontend:
- `NEXT_PUBLIC_API_BASE_URL` — public API base URL only; no secrets.

Backend:
- `NODE_ENV`, `PORT`, `MONGODB_URI`, `MONGODB_DB_NAME`
- `SESSION_COOKIE_NAME`, `SESSION_IDLE_TIMEOUT_MINUTES`, `SESSION_ABSOLUTE_TIMEOUT_HOURS`
- `APP_ORIGIN_ALLOWLIST` — exact origins
- CSRF/session configuration
- `DEMO_WORKSPACE_ID`
- `DEMO_RESET_ENABLED=false` by default; enable only for designated demo deployment
- `LOG_LEVEL`

Never commit `.env`, credentials, session secrets, or reset tokens. Provide `.env.example` with placeholders.

## Cookie and cross-origin contract
Preferred topology: same-site frontend/API origins, or a same-origin reverse proxy if supported. If separate origins:
- Browser requests use `credentials: "include"`.
- CORS allows exact frontend origin and credentials; never wildcard with credentials.
- Test cookie attributes on deployed domains.
- Use `Secure`, `HttpOnly`, `Path=/`, no broad `Domain`, and explicit `SameSite`.
- `SameSite=None` requires `Secure` and CSRF defenses.
- CSRF token or equivalent origin validation protects state-changing requests.
- Rotate session on login/privilege changes; revoke on logout.
- Never place session IDs in URL, localStorage, or logs.

## Standard error envelope
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "This record changed. Reload and review the latest version.",
    "requestId": "req_example",
    "details": []
  }
}
```
Stable codes: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `IDEMPOTENCY_CONFLICT`, `INVALID_STATE_TRANSITION`, `PATIENT_CONFIRMATION_REQUIRED`, `MEDICINE_MATCH_UNRESOLVED`, `CHECK_INCOMPLETE`, `CHECK_UNSUPPORTED`, `CHECK_FAILED`, `RATE_LIMITED`, `INTERNAL_ERROR`.

Never return stack traces, database errors, secrets, or foreign-tenant record details.

## Optimistic concurrency
Critical mutable records expose version/ETag. Client sends `If-Match` or `expectedVersion` as contract defines. Backend compares atomically. Stale write returns `409 CONFLICT`; client reloads and requires user review. Never auto-retry clinical decisions after conflict.

## Idempotency
For critical mutations, send `Idempotency-Key`. Store key, operation, actor, tenant, request hash, status/result, expiry. Same key/same payload returns prior result; same key/different payload returns 409. Do not blindly retry after uncertain commit.

## Rule check response
Every result includes outcome, ruleset version, coverage by category, alerts, limitations, subject ID/version, timestamp, request ID. `NO_MATCHING_RULE` must not be presented as comprehensive coverage or safety clearance.

## Integration checkpoints
A. Contract freeze: schemas, error envelope, cookie topology, fixtures, env templates.
B. Backend boot: health, DB, seed fixtures, auth.
C. Frontend shell: role layouts, auth, API client.
D. Core workflow: patient confirmation, capture/manual fallback, medicine confirmation, check, alerts.
E. Revision and authorization: doctor disposition, immutable revision, recheck, pharmacist authorization.
F. Security: tenant/role matrix, cookie/CORS/CSRF, stale-write/idempotency tests.
G. Deployment: smoke test and local fallback.

## Failure policy
If integration slips, defer appointments, advanced admin screens, rule-authoring UI, full inpatient UI before weakening auth, tenant isolation, fail-closed behavior, or audit.
