# Deployment and Operations Guide

## Candidate topology
- Frontend: Next.js on Vercel or compatible host.
- Backend: Hono on Vercel or compatible host.
- Database: MongoDB Atlas free cluster if current terms and availability fit.
- Separate repositories and deployment projects.

Hono documents a Vercel deployment path [S7]. MongoDB Atlas free clusters have constraints including 0.5 GB storage and possible idle deactivation [S8]. Vercel Hobby is free but has usage/eligibility limits [S9, S10]. This makes the topology plausible, not guaranteed. Verify current terms, regions, account eligibility, domains, and cookie behavior.

## Deployment gate
1. Confirm free plans permit intended public demo use.
2. Confirm each repository deploys independently.
3. Confirm Hono runtime and MongoDB connection reuse.
4. Test cookie configuration on actual frontend/API origins.
5. Test CORS/CSRF in browser.
6. Confirm MongoDB region, connection limits, persistence, idle behavior.
7. Confirm image storage; do not assume serverless local disk persists.
8. Record provider/plan/date/limits/fallback.

Prefer same-site frontend/API origins or a tested same-origin proxy. If cookie auth fails on separate cross-site domains, choose a different topology rather than weakening security.

## Environment variables
Frontend `.env.example`:
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787/api/v1
```
Backend `.env.example`:
```bash
NODE_ENV=development
PORT=8787
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=ventureforge_medication_safety
APP_ORIGIN_ALLOWLIST=http://localhost:3000
SESSION_COOKIE_NAME=__Host-vf_session
SESSION_IDLE_TIMEOUT_MINUTES=30
SESSION_ABSOLUTE_TIMEOUT_HOURS=8
DEMO_WORKSPACE_ID=synthetic-demo-hospital
DEMO_RESET_ENABLED=false
LOG_LEVEL=info
```
These are example names, not proof all host settings are supported. Never commit actual values.

## Logging
Log request ID, operation ID, status/duration, actor/hospital where appropriate, safe error code, check ID/ruleset version where useful. Never log passwords, hashes, cookies, session tokens, full prescription images/OCR text by default, unnecessary clinical narrative, or database URI.

## Retention
- Synthetic data only.
- Delete temporary user-uploaded images after extraction/confirmation or short configured expiry.
- If object storage is used, use explicit keys/expiry and test cleanup.
- If reliable cleanup is unavailable, avoid persistent uploads and use browser OCR/seeded images.
- Preserve structured revisions/checks/audit references needed for demo.
- Reset only designated synthetic workspace; preserve reset event outside reset deletion scope.
- Application-level append-only audit is not tamper-proof against database operators.

## Health and recovery
- `/health/live`: process alive.
- `/health/ready`: DB/config ready, without secret disclosure.
- On DB/rule engine failure: fail closed.
- Retry only idempotent operations.
- Maintain local fallback with same fixtures and record deployed commit/contract/seed versions.

## India privacy/regulatory note
DPDP Rules 2025 were notified in November 2025 [S5]; the Act’s commencement is phased [S6]. Use synthetic data only. Any real pilot requires current legal/regulatory review of applicable obligations, notices/consent, security, retention, grievance handling, and health-sector requirements. This is not legal advice or a compliance certification.
