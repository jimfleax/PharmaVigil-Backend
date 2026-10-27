# Frontend AI-Agent Workflow

## Work order
1. Read README, shared vision, safety analysis, decision register, integration contract.
2. Read route inventory; do not add routes without recording them.
3. Pin OpenAPI version.
4. Generate/derive client types from contract; don't manually duplicate schemas.
5. Implement shell and auth bootstrap.
6. Implement day-one routes.
7. Add loading, empty, success, validation, unauthorized, conflict, incomplete, and failed states.
8. Add tests and update traceability.
9. Mark mocked/deferred status honestly.

## Conventions
- TypeScript strict mode; no `any` for API response shapes.
- All API calls through one typed client.
- Handle 401/403/409/422/429/5xx distinctly.
- Never infer clinical outcome or authorization client-side.
- No secrets or personal data in code.
- No browser storage for session tokens.
- Use safe vocabulary from clinical safety document.

## Route definition of done
Correct role/layout; API operation IDs and schemas; loading/empty/error/unauthorized/conflict states; accessible controls; mobile behavior; appropriate test; requirement/test IDs linked in PR.
