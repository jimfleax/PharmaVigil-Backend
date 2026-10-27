# Shared Glossary and Requirements

## Glossary
- **Medication catalogue:** structured medicine identities, ingredients, brands, synonyms, strength, and form.
- **Clinical rule:** versioned condition that may identify a known potential concern.
- **Rule set:** immutable collection/version of executable rules.
- **Coverage:** what the current dataset can/cannot evaluate; not a probability of safety.
- **OCR confidence:** confidence in extracted text, distinct from medicine match and evidence strength.
- **Medicine-match confidence:** confidence that text maps to a canonical medicine.
- **Evidence strength:** assessment assigned by rule governance.
- **Alert:** a rule result requiring review.
- **Disposition:** doctor-recorded clinical handling of an alert.
- **Dispensing authorization:** pharmacist-recorded workflow state after gates pass; not a clinical safety certification.
- **Patient-reported medicine:** disclosed by patient, not automatically verified.
- **Fail closed:** failure/missing data cannot advance to authorization.

## Requirements
### Product
- REQ-PROD-001: Support hospital administrator, doctor, pharmacist, patient.
- REQ-PROD-002: Hospital-scoped records and membership.
- REQ-PROD-003: Outpatient scan, confirmation, check, review, revision, recheck, authorization.
- REQ-PROD-004: Separate inpatient order create/change; no MAR in prototype.
- REQ-PROD-005: Patient sees own prescriptions/status, appointments, history.
- REQ-PROD-006: Basic appointments if capacity permits.
- REQ-PROD-007: Rules illustrative unless qualified review and approval are recorded.

### Safety
- REQ-SAFE-001: OCR never becomes confirmed medicine without pharmacist confirmation.
- REQ-SAFE-002: Ambiguous/unsupported medicine cannot produce complete result.
- REQ-SAFE-003: Missing required context cannot produce complete result.
- REQ-SAFE-004: Failed evaluation cannot produce complete result.
- REQ-SAFE-005: No-match is explicitly not safety clearance.
- REQ-SAFE-006: Doctor disposition and pharmacist authorization are separate.
- REQ-SAFE-007: Source, rule version, status, limitations are traceable.
- REQ-SAFE-008: Original and revised prescriptions remain traceable.

### Security and data
- REQ-SEC-001: Every protected operation checks session, active membership, role, and hospital scope.
- REQ-SEC-002: Frontend hiding is never the sole authorization control.
- REQ-SEC-003: Secure HttpOnly cookies and appropriate SameSite/CSRF controls.
- REQ-SEC-004: Critical clinical writes use optimistic concurrency.
- REQ-SEC-005: Audit events append-only at application level.
- REQ-SEC-006: Reset scoped to synthetic demo workspace and preserves reset event.
- REQ-DATA-001: Synthetic data only.
- REQ-DATA-002: Uploaded images are temporary.
- REQ-DATA-003: Patient-reported and verified data are distinguishable.

### Integration
- REQ-INT-001: OpenAPI-first `/api/v1`.
- REQ-INT-002: Standard error envelope and request ID.
- REQ-INT-003: Critical retries have idempotency semantics.
- REQ-INT-004: Frontend/backend pin the same contract and fixtures.
- REQ-INT-005: Every route/endpoint has implementation tier.
