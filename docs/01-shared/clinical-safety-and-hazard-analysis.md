# Clinical Safety and Hazard Analysis

## Intended use
This prototype demonstrates a software workflow for synthetic prescription capture, checks against a small illustrative rule set, and routing potential concerns for human review. It is not intended to diagnose, prescribe, recommend treatment, authorize real dispensing, or determine that a patient is safe.

## Safety boundary
Never imply:
- “Safe” or “cleared” merely because no seeded rule matched.
- Comprehensive interaction coverage.
- Clinical approval without documented qualified reviewer approval.
- OCR output is authoritative.
- Patient-reported history is verified history.
- A completed software state equals clinician judgment.

Preferred wording:
- “No matching rule in this limited dataset.”
- “Check incomplete — required information is missing.”
- “Medicine identity requires confirmation.”
- “Illustrative alert — clinical validation not established.”
- “Workflow authorization recorded,” not “prescription safe.”

## Hazard register
| ID | Hazard | Cause | Mitigation | Verification |
|---|---|---|---|---|
| HAZ-001 | False reassurance from no alert | Incomplete rule coverage | Coverage always visible; never label safe | TEST-RULE-001 |
| HAZ-002 | Wrong medicine evaluated | OCR error or ambiguous brand | Pharmacist confirmation; ambiguity blocks completion | TEST-OCR-001 |
| HAZ-003 | Combination ingredient omitted | Incomplete product mapping | Explicit ingredient set; unknown composition => unsupported | TEST-MED-004 |
| HAZ-004 | Allergy risk omitted | Missing/uncertain history | Separate confirmed/reported records; missing is not negative | TEST-ALLERGY-001 |
| HAZ-005 | False alert clearance | Pharmacist can dismiss clinical alert | Doctor-only disposition; separate authorization | TEST-AUTH-006 |
| HAZ-006 | Check failure treated as clear | Timeout, exception, DB failure | Fail closed; no authorization; safe retry | TEST-FAIL-001 |
| HAZ-007 | Cross-hospital disclosure | Missing tenant filter | Tenant scope enforced on every query | TEST-SEC-001 |
| HAZ-008 | Unauthorized clinical action | Frontend-only role checks | Backend authorization per operation | TEST-SEC-002 |
| HAZ-009 | History silently changed | In-place edits | Immutable prescription revisions and append-only audit | TEST-AUDIT-001 |
| HAZ-010 | Stale update overwrites decision | Concurrent edits | Optimistic version checks; stale writes return conflict | TEST-CONC-001 |
| HAZ-011 | Reset deletes another tenant | Broad delete filter | Isolated demo scope; confirmation; reset event survives | TEST-RESET-001 |
| HAZ-012 | Image retained indefinitely | Missing lifecycle | Temporary storage/deletion; synthetic images only | TEST-RET-001 |
| HAZ-013 | Unlicensed data reused | Source terms assumed | Source/license register; no import before rights check | Review gate |
| HAZ-014 | Prototype mistaken for validated CDS | UI/branding claims | Persistent disclaimer and rule status | UI review |
| HAZ-015 | Retry duplicates a critical action | Network retry | Idempotency for critical mutations | TEST-IDEMP-001 |

## Check outcome contract
- `FLAGGED`: at least one seeded rule matched.
- `NO_MATCHING_RULE`: evaluation completed with no matching seeded rule; explicitly not a safety clearance.
- `INCOMPLETE`: required identity/context is missing or unresolved.
- `UNSUPPORTED`: medicine or category outside supported dataset.
- `FAILED`: evaluation did not complete reliably.

If required inputs are unresolved, the system cannot return a clear/complete outcome. A no-match result must not be displayed as “safe.” Any unresolved concern blocks dispensing authorization.

## Alert lifecycle
`OPEN → ACKNOWLEDGED → UNDER_REVIEW → (CHANGE_REQUIRED | CLINICAL_DISPOSITION_RECORDED) → RESOLVED`

Doctor records disposition with rationale. A change-required disposition leads to a new immutable prescription revision and pharmacist re-confirmation/recheck. Historical alerts remain linked to the original revision and rule-set version. New checks do not rewrite old results.

`RESOLVED` is not the same as `DISPENSING_AUTHORIZED`. The pharmacist action revalidates latest revision, latest check, unresolved alerts, incomplete/failed/unsupported outcomes, patient/hospital, role, and expected version.

## Rule governance
- `DRAFT`: editable, not used in normal evaluation.
- `IN_REVIEW`: awaiting designated reviewer.
- `APPROVED`: qualified clinical reviewer, identity, evidence, date recorded.
- `PUBLISHED`: immutable version available to evaluation.
- `RETIRED`: not used for new checks; history retained.
- `ILLUSTRATIVE_NOT_VALIDATED`: demo-only, not clinically approved.

A developer can deploy an approved ruleset but cannot silently alter clinical content. Without a qualified reviewer, seeded rules remain illustrative.

## Human factors
- Severity uses text/icon as well as color.
- Show source, version, limitations, match certainty, and next action.
- Do not bury incomplete status beneath a green banner.
- Confirm destructive reset.
- Patient portal does not expose staff-only notes.
- Camera failure must have a manual fallback.

## Residual risk
The prototype remains unsuitable for real clinical use because rule coverage is small, clinical validation/governance is not established, and deployment/security have not undergone a production assessment.
