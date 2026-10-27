# Decision Register and Assumptions

**PROVISIONAL** means agreed during discovery but subject to implementation validation. **RESEARCH_REQUIRED** means externally verify before use. **OPEN** means unresolved; use conservative defaults. **DEFERRED** means intentionally outside day-one scope.

## Provisional decisions
| ID | Decision | Status / consequence |
|---|---|---|
| DEC-001 | India-first hospital setting; inpatient and outpatient departments | PROVISIONAL |
| DEC-002 | Synthetic data only | NON-NEGOTIABLE |
| DEC-003 | Pharmacist-led prescription verification is primary | PROVISIONAL |
| DEC-004 | Check drug–drug, food/drink, allergy, adverse-reaction concerns | Only seeded subset evaluated |
| DEC-005 | Flag and route concerns; never certify safety | NON-NEGOTIABLE |
| DEC-006 | Scan + OCR + pharmacist confirmation | PROVISIONAL |
| DEC-007 | Synthetic hospital ID plus explicit patient confirmation | PROVISIONAL |
| DEC-008 | Distinct outpatient and inpatient workflows | NON-NEGOTIABLE |
| DEC-009 | Hospital-scoped records and least privilege | NON-NEGOTIABLE |
| DEC-010 | Two repositories and two developers | PROVISIONAL |
| DEC-011 | Next.js + TypeScript; Hono + TypeScript; MongoDB | PROVISIONAL; verify deployment topology |
| DEC-012 | Secure-cookie sessions and server-side authorization | NON-NEGOTIABLE |
| DEC-013 | OpenAPI-first contract under `/api/v1` | NON-NEGOTIABLE |
| DEC-014 | Immutable rule-set versions and full provenance | NON-NEGOTIABLE |
| DEC-015 | Verify source reuse terms; illustrative fallback permitted | NON-NEGOTIABLE |
| DEC-016 | Optimistic concurrency for critical clinical records | NON-NEGOTIABLE |
| DEC-017 | Application-level append-only audit events | NON-NEGOTIABLE |
| DEC-018 | Temporary image handling; minimize retention | NON-NEGOTIABLE |
| DEC-019 | Admin reset restricted to isolated synthetic demo workspace | NON-NEGOTIABLE |
| DEC-020 | Three implementation tiers: day-one, mocked, deferred | NON-NEGOTIABLE |
| DEC-021 | One-day build target | Constraint; does not weaken safety gates |
| DEC-022 | English printed OCR first; manual fallback | PROVISIONAL |
| DEC-023 | Basic appointment list/booking/cancellation | Lower priority than critical path |
| DEC-024 | Inpatient new/changed orders; no MAR | DAY-ONE or deferred after checkpoint |
| DEC-025 | Public free-tier deployment | RESEARCH_REQUIRED; local fallback required |

## Unresolved assumptions to record
1. **Clinical reviewer availability:** without qualified review, seeded rules remain `ILLUSTRATIVE_NOT_VALIDATED`.
2. **Source licensing:** public access does not imply permission to bulk reuse, transform, redistribute, or commercialize data.
3. **Hosting:** Vercel supports Hono deployment and MongoDB Atlas offers a free cluster with constraints, but exact fit must be rechecked.
4. **Cookie topology:** separate registrable domains complicate cookie auth/CSRF. Prefer same-site domains or a tested same-origin proxy; do not weaken controls for convenience.
5. **Authentication:** registration is available, but clinical privileges require approved hospital membership and administrator-assigned role. Seeded accounts may coexist with registration.
6. **Appointments:** basic functionality is planned but subordinate to the clinical critical path.
7. **Inpatient:** create/change orders only; administration record and complex reconciliation are deferred.
8. **OCR library:** choice/license not finalized.
9. **Regulatory analysis:** prototype is not a compliance assessment; legal review required before a real pilot.
10. **Retention:** synthetic data only; uploaded user images deleted after processing or short expiry; reset cannot erase its own audit event.

## Conflict-resolution rules
- Safety outranks convenience and visual polish.
- Backend authorization outranks frontend route visibility.
- Unknown/incomplete data outranks “no issue found.”
- Clinical disposition differs from dispensing authorization.
- Specified does not mean implemented; tier must be explicit.
- If time slips, defer appointments and advanced admin features before weakening safety/security.
