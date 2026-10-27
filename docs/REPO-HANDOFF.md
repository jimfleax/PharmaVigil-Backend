# Cross-Repository Handoff and Source of Truth

## Shared purpose
The frontend and backend repositories are separate, but they implement one product and must share the same product, safety, data, API, testing, and deployment assumptions. Each archive deliberately includes both PRDs and the other side's relevant interface specifications so neither developer needs missing context from the other archive.

## Canonical ownership
- **Canonical OpenAPI:** backend repository, `04-contracts/openapi.yaml`.
- **Frontend PRD and route inventory:** frontend repository, `02-frontend/`.
- **Backend PRD, data model, clinical rule specification, endpoint inventory:** backend repository, `03-backend/`.
- **Shared decisions, safety analysis, glossary, research, acceptance tests, and operations:** shared; copies must stay synchronized.
- **Generated frontend API client/types:** generated from a pinned canonical OpenAPI version, never independently designed.

## Contract change sequence
1. Raise a change against the canonical backend OpenAPI file.
2. Both developers review method/path, auth/tenant scope, request/response shape, status codes, error codes, idempotency, and concurrency behavior.
3. Update backend schemas and tests.
4. Publish/pin the same contract version or commit in frontend.
5. Update route integration and contract tests.
6. Record changes in PRs with relevant `REQ-*`, `UI-*`, `API-*`, and `TEST-*` IDs.

## Before coding
- Agree which endpoints/routes are `DAY_ONE_REQUIRED`, `MOCKED_FOR_DEMO`, and `SPECIFIED_DEFERRED`.
- Use one deterministic synthetic fixture set and stable IDs across both repos.
- Verify secure-cookie topology, CORS and CSRF behavior on the actual domains before relying on sessions.
- Do not include real patient data/images or unlicensed clinical data.
- Do not call illustrative rules clinically validated.

## If a conflict appears
Safety and server-side authorization take priority. Do not resolve API disagreements by adding frontend-only assumptions. Update the canonical contract and both dependent PRDs/tests.
