# Demo Script and Known Limitations

## Before demo
Use only synthetic fixtures; confirm rule set says `ILLUSTRATIVE_NOT_VALIDATED`; verify no real images uploaded; test all four role accounts; confirm reset scope/local fallback.

## 8–12 minute demo
1. **Context:** “Synthetic-data prototype only. Not validated for clinical use; must not guide real dispensing.”
2. **Patient:** show own prescriptions, patient-visible status, appointments, history; another patient's record must be inaccessible.
3. **Pharmacist identity check:** search synthetic hospital ID and explicitly confirm patient.
4. **Capture:** use seeded synthetic English printed image or manual entry; show OCR as editable/untrusted suggestion.
5. **Medicine confirmation:** confirm ingredient, brand/synonym, strength, dosage form, dose/route/frequency/duration where available.
6. **Check:** run illustrative rules; show alert, severity, ingredient IDs, source reference, rule version, evidence status, limitations.
7. **Doctor:** acknowledge and record `CHANGE_REQUIRED` with rationale.
8. **Revision:** create new immutable prescription revision; show old revision/check remain in history.
9. **Recheck:** pharmacist reconfirms/rechecks new revision.
10. **Gate:** unresolved/incomplete case cannot authorize; successful seeded path may record workflow authorization, never “safe.”
11. **Failure case:** show unknown medicine, ambiguous match, missing context, or engine failure.
12. **Admin:** show membership approval and scoped reset confirmation if implemented.

## Known limitations
- Synthetic data only.
- Illustrative rules are not clinically validated unless qualified review and approval are recorded.
- Small, limited rule coverage; no comprehensive drug–drug, food/drink, allergy, or adverse-reaction claim.
- English printed OCR only; handwriting/other languages unsupported.
- No real identity system or EHR/pharmacy/ABDM integration.
- Inpatient flow excludes MAR.
- Appointment feature may be deferred if critical path is at risk.
- Free-tier hosting may sleep/deactivate or impose quotas.
- No production security assessment or certification.
- No real dispensing or clinical deployment.
