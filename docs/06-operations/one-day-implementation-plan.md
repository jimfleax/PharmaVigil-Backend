# One-Day Implementation Plan

A one-day build should deliver a reliable narrow vertical slice, not pretend every specified feature is complete.

## Phase 0 — Joint contract freeze (30–45 min)
Both developers freeze OpenAPI, error envelope, cookie topology, fixtures, environment names, status enums, CORS/CSRF plan, and tier per route/endpoint.
**Exit:** frontend can use mock client; backend can implement without guessing.

## Phase 1 — Bootstraps and health (45–60 min)
Backend: Hono, request ID, error handler, env validation, health/readiness, MongoDB, seed synthetic hospital/users/patient/catalogue/rules.
Frontend: Next shell, role layouts, demo banner, API client, auth pages, route error states.
**Exit:** both apps run; health responds; fixtures deterministic.

## Phase 2 — Authentication and tenancy (60–90 min)
Backend: register/login/logout/current user, session store/revocation, membership/role/tenant middleware.
Frontend: login, pending approval, session bootstrap, logout, role shells.
Both: verify cookies, CORS, CSRF/origin on actual topology.
**Exit:** pending/unauthorized users cannot call clinical APIs.

## Phase 3 — Outpatient critical path (2–3 h)
Backend: patient search/confirmation, capture draft, confirmed revision, catalogue match, rule engine, check, alerts, doctor disposition, revision, recheck, authorization gates, audit/idempotency/version checks.
Frontend: capture/confirm/results, doctor queue/disposition/revision, pharmacist recheck/authorization, case history.
**Exit:** primary journey works without manual DB edits.

## Phase 4 — Safety/regression (60–90 min)
Run critical fixtures, unknown/ambiguous/missing/failed scenarios, cross-role/tenant matrix, stale version, duplicate retry, audit trace, reset isolation, contract/build/type tests.
**Exit:** all critical gates pass or scope is reduced.

## Phase 5 — Supporting scope and deployment
Priority: patient read-only portal; admin membership UI; appointments if core remains green; minimal inpatient order flow if time; public deploy/smoke; local fallback; demo rehearsal.
Defer advanced rule authoring, password recovery, full audit search, MAR, complex scheduling, external integrations.

## Stop-ship criteria
Do not publish even a demo if:
- Cross-hospital records are accessible.
- Pharmacist can perform doctor-only disposition.
- Failed/incomplete/unsupported checks can authorize.
- OCR bypasses pharmacist confirmation.
- UI claims clinical safety/validated coverage.
- Secrets are committed/exposed.
- Reset can affect another workspace.
