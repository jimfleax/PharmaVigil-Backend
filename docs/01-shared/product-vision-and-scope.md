# Product Vision, Pitch, and Scope

## One-sentence pitch
A hospital-focused medication-safety workflow that helps pharmacists confirm prescription data, checks known medicines and documented context against a traceable rule set, and routes potential concerns to a doctor before the dispensing workflow can proceed.

## Problem hypothesis
Medication workflows span prescription creation, reconciliation, dispensing, and transitions between care settings. Medication errors and incomplete medication histories can create avoidable risk. The prototype explores whether a clear, auditable pharmacist-led workflow can make medication information gaps and potential interaction concerns more visible. This is a hypothesis, not a claim that the prototype reduces adverse events. WHO's Medication Without Harm work emphasizes high-risk situations, polypharmacy, and transitions of care [S1, S2].

## Intended users
1. **Hospital administrator** — manages hospital membership, invitations/requests, role assignment, and controlled demo reset.
2. **Doctor** — reviews assigned medication concerns, records clinical disposition, and issues a revised prescription/order where appropriate.
3. **Pharmacist** — identifies the patient, captures prescription text, confirms OCR/matching, reviews rule results, and records dispensing workflow status.
4. **Patient** — accesses only their linked record, prescriptions and patient-visible status, appointments, and history.

## Primary outcome
Demonstrate a traceable outpatient workflow: patient record → prescription image capture → OCR suggestion → pharmacist confirmation → deterministic illustrative checks → doctor task/disposition → revised prescription → pharmacist recheck → recorded dispensing workflow authorization. The demo must also show a fail-closed path.

## Goals
- Provide a coherent end-to-end software demonstration.
- Separate OCR confidence, medicine-match confidence, evidence strength, and clinical outcome.
- Make rule coverage and limitations visible.
- Preserve prescription revisions and clinical decision history.
- Enforce hospital tenancy and least privilege on the backend.
- Provide complete route and API inventories.
- Produce reproducible tests and synthetic fixtures.

## Non-goals
- Real-world clinical decision support or autonomous prescribing.
- Certifying that a prescription is safe.
- Comprehensive drug-interaction coverage.
- Real patient data, real prescription images, or real dispensing.
- Production EHR/pharmacy/ABDM integration.
- Production-grade clinical governance, certification, or regulatory compliance.
- Full inpatient medication administration record (MAR).
- Complex scheduling, calendar integration, SMS, email, or external notifications.
- Autonomous diagnosis or OCR acceptance.
- Importing commercial/copyrighted clinical datasets without verified rights.

## Prototype boundary
All patient, hospital, staff, prescription, medicine, appointment, and alert data must be synthetic. Display a persistent notice: “Synthetic demonstration only — not for clinical use.” Clinical outputs must also say “Illustrative rule set; not clinically validated.”

## Success measures
- Critical scripted journey completes without manual database edits.
- Defined rule fixtures produce expected deterministic outputs.
- Unsupported/ambiguous/missing/failed cases cannot reach dispensing authorization.
- Cross-role and cross-hospital authorization tests reject forbidden requests.
- Every critical mutation is traceable to actor, timestamp, reason/context, and record version.
- Contract tests pass for implemented operations.
- Public deployment is smoke-tested if deployed.

No clinical outcome claim will be made from these measures.

## Product narrative
The product is not a “green check means safe” tool. It is a workflow and evidence viewer that can identify certain known concerns within a deliberately limited dataset and communicate when the system cannot make a complete determination.
