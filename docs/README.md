# Medication Safety Platform — Backend Repository Documentation Pack

This folder is the documentation starter pack for the **`medication-safety-backend`** repository. It is intended for the backend developer and their AI coding agent.

## Start here
1. `01-shared/product-vision-and-scope.md`
2. `01-shared/decision-register-and-assumptions.md`
3. `01-shared/clinical-safety-and-hazard-analysis.md`
4. `03-backend/BACKEND_PRD.md`
5. `03-backend/data-model.md`, `03-backend/clinical-rule-data-spec.md`, and `03-backend/endpoint-inventory.md`
6. `04-contracts/openapi.yaml` and `04-contracts/integration-contract.md`
7. `02-frontend/FRONTEND_PRD.md` and `02-frontend/route-inventory.md` — read as consumer/UI integration context.
8. `05-quality/test-strategy.md` and `06-operations/one-day-implementation-plan.md`

## Repository ownership
- Backend implementation belongs in this repository, not in this documentation pack.
- `03-backend/` contains the backend-specific PRD, data model, rule data specification, endpoint inventory, and AI-agent workflow.
- `04-contracts/openapi.yaml` is the **canonical API contract** for the project. The frontend repository must pin/copy or generate its client from an agreed version of this file.
- `02-frontend/` is included so backend work can be matched to the actual screen and route flows it serves; it is not a separate backend deliverable.
- `01-shared/`, `sources/`, `05-quality/`, and `06-operations/` are common context. Keep them aligned with the frontend repository.

## Non-negotiable safety
Synthetic data only. The rules are illustrative and not clinically validated unless a qualified clinician has independently reviewed and approved them. `NO_MATCHING_RULE` is not safety clearance. All authorization, tenant checks, and clinical workflow transitions are enforced server-side.

## Implementation tiers
`DAY_ONE_REQUIRED`, `MOCKED_FOR_DEMO`, and `SPECIFIED_DEFERRED` must be assigned accurately. The endpoint inventory is a planned contract; not every endpoint is necessarily part of the one-day implementation.

This is a documentation pack, not application source code. See `REPO-HANDOFF.md` for cross-repository ownership and integration instructions.
