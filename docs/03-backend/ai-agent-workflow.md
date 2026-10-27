# Backend AI-Agent Workflow

## Work order
1. Read shared vision, safety analysis, decision register, data model, integration contract.
2. Pin OpenAPI version and reconcile operation inventory.
3. Validate environment config at startup.
4. Implement request ID, error handler, sessions/auth, tenant and role middleware.
5. Implement repositories with tenant-scoped methods.
6. Implement domain transitions and pure rule engine.
7. Add audit/idempotency for critical mutations.
8. Implement routes by operation ID with runtime validation.
9. Add fixture and security tests.
10. Update endpoint tiers and traceability.

## Conventions
- Route handlers orchestrate; business logic lives in services/domain modules.
- No unscoped tenant query for tenant-owned entities.
- Never trust `hospitalId`, `role`, `status`, `safe`, or `authorized` from request body.
- Validate every mutation at runtime.
- Use standard error envelope and request ID.
- Enforce transitions server-side.
- Rule engine is deterministic and has no network dependency.
- No-match is not safety clearance.
- Critical mutations emit audit events and have idempotency behavior.
- Critical mutable records check expected version.
- Never log secrets or raw prescription images.

## Endpoint definition of done
OpenAPI operation ID; auth/role/tenant/state documented; schemas match; success/validation/auth/conflict/dependency tests; audit/idempotency/concurrency where applicable; tier and limitations recorded.
