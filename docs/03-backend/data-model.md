# Backend Data Model and Index Plan

Logical specification; exact schema validators and repository implementation remain to be written. Every tenant-owned document includes `hospitalId`. Use one ID convention consistently and dates as BSON Date internally.

## Core entities

### Hospital
`_id`, `name`, `slug`, `status: ACTIVE|SUSPENDED`, `isDemoWorkspace`, `createdAt`, `updatedAt`.
Indexes: unique `slug`; `status`.

### User
`_id`, `emailNormalized`, `displayName`, `passwordHash`, `accountStatus: ACTIVE|DISABLED|PENDING`, `createdAt`, `updatedAt`, `lastLoginAt?`.
Index: unique `emailNormalized` if account can belong to multiple hospitals. Role is membership-scoped, not globally trusted.

### Membership
`_id`, `hospitalId`, `userId`, `requestedRole`, `assignedRole?`, `status: PENDING|ACTIVE|REJECTED|SUSPENDED|REVOKED`, `requestedAt`, `reviewedAt?`, `reviewedBy?`, `reason?`, `version`.
Indexes: unique `{hospitalId,userId}`; `{hospitalId,status,requestedAt}`; `{userId,status}`.

### Session
`_id`, `userId`, `secretVerifierHash`, `createdAt`, `lastSeenAt`, `idleExpiresAt`, `absoluteExpiresAt`, `revokedAt?`, `revocationReason?`.
Never log raw token. Enforce expiry synchronously in middleware; TTL is cleanup only.

### PatientRecord
`_id`, `hospitalId`, `syntheticHospitalPatientId`, `linkedUserId?`, `displayName`, optional synthetic-safe details, `linkStatus: UNLINKED|PENDING_CONFIRMATION|LINKED|REVIEW_REQUIRED`, timestamps, `version`.
Indexes: unique `{hospitalId,syntheticHospitalPatientId}`; `{hospitalId,linkedUserId}`. No real national identifiers.

### MedicationCatalogItem
`_id`, `canonicalIngredientIds[]`, `productType: SINGLE_INGREDIENT|COMBINATION`, `brandNames[]`, `synonyms[]`, `strengths[]`, `dosageForms[]`, `routes[]`, `ingredientCompositionStatus: VERIFIED_FOR_DEMO|UNKNOWN`, `sourceRefs[]`, `catalogueVersion`, `status: ACTIVE|RETIRED|UNSUPPORTED`.
Indexes: multikey ingredient IDs; normalized brand/synonym search. A brand is not itself an ingredient.

### MedicationHistoryEntry
`_id`, `hospitalId`, `patientId`, `sourceType: CLINICIAN_PRESCRIBED|PATIENT_REPORTED|IMPORTED_SYNTHETIC`, `catalogueItemId?`, `canonicalIngredientIds[]`, dose/unit, route, frequency, start/end, `status: ACTIVE|STOPPED|UNKNOWN`, `verificationStatus: VERIFIED|REPORTED|UNVERIFIED`, `recordedBy`, `recordedAt`, `version`.
Index `{hospitalId,patientId,status}`.

### AllergyAdverseReaction
`_id`, `hospitalId`, `patientId`, `substanceText`, `canonicalIngredientId?`, `recordType: ALLERGY|ADVERSE_REACTION`, `reactionDescription?`, `severity: UNKNOWN|MILD|MODERATE|SEVERE`, `sourceType: CLINICIAN_RECORDED|PATIENT_REPORTED`, `verificationStatus: CONFIRMED|REPORTED|UNVERIFIED`, `recordedBy`, `recordedAt`, `version`.
Indexes `{hospitalId,patientId,verificationStatus}` and `{hospitalId,patientId,canonicalIngredientId}`.

### Prescription / PrescriptionRevision
Prescription: `_id`, `hospitalId`, `patientId`, `prescriberUserId`, `workflowType: OUTPATIENT`, `currentRevisionId`, `status`, timestamps, `version`.
Revision: `_id`, `hospitalId`, `prescriptionId`, `revisionNumber`, `supersedesRevisionId?`, `items[]`, `sourceCaptureId?`, `createdBy`, `createdAt`, `changeReason?`, `version`.
Unique `{hospitalId,prescriptionId,revisionNumber}`. Revisions immutable.
Item: catalogue ID, raw OCR text, canonical ingredients, brand text, strength/unit, form, dose/unit, route, frequency, duration/unit, `matchStatus: CONFIRMED|AMBIGUOUS|UNSUPPORTED|UNRESOLVED`, `matchConfidence?`, confirmer/time.

### PrescriptionCapture
`_id`, `hospitalId`, `patientId`, `createdBy`, temporary image reference, expiry/deletion metadata, `ocrEngine`, `ocrLanguage`, `ocrText?`, `ocrConfidence?`, `status: UPLOADED|OCR_COMPLETE|MANUAL_ENTRY|CONFIRMED|FAILED|EXPIRED`, timestamps, `version`.
Prefer browser OCR and structured text submission. If image stored, enforce type/size and deletion lifecycle.

### ClinicalRuleSet / ClinicalRule
Rule set: `_id`, immutable `version`, status `DRAFT|IN_REVIEW|APPROVED|PUBLISHED|RETIRED|ILLUSTRATIVE_NOT_VALIDATED`, source-register version, creator/reviewer/approval/publication/retirement metadata, change summary.
Rule: `ruleId`, `ruleVersion`, category `DRUG_DRUG|FOOD_DRINK|ALLERGY|ADVERSE_REACTION`, ingredient triggers, typed conditions, severity, rationale, next action, evidence refs, evidence strength, limitations, required context, status, effective/review dates.
Index unique rule-set version and status. Without qualified review, rule-set status remains illustrative.

### CheckRun
`_id`, `hospitalId`, `patientId`, `subjectType: PRESCRIPTION_REVISION|MEDICATION_ORDER_VERSION`, `subjectId`, `subjectVersion`, `ruleSetId`, `ruleSetVersion`, `outcome: FLAGGED|NO_MATCHING_RULE|INCOMPLETE|UNSUPPORTED|FAILED`, `coverageByCategory`, alert IDs, timestamps, `requestId`, creator, failure code/message.
Indexes `{hospitalId,subjectId,startedAt}` and `{hospitalId,patientId,completedAt}`.

### Alert / AlertDisposition
Alert: hospital/patient, check ID, rule ID/version, subject/version, status `OPEN|ACKNOWLEDGED|UNDER_REVIEW|CHANGE_REQUIRED|CLINICAL_DISPOSITION_RECORDED|RESOLVED`, severity, rationale/evidence/limitations snapshots, assigned doctor, timestamps, version.
Disposition: hospital, alert, doctor, type `CHANGE_REQUIRED|CLINICALLY_REVIEWED|OTHER_DOCUMENTED`, required rationale, timestamp, alert version.
Indexes by hospital/status/severity/time and assigned doctor/status. Dispositions immutable.

### DispensingAuthorization
`_id`, hospital/patient, prescription ID/revision ID, check ID, pharmacist ID, timestamp, acknowledgement wording, version. Must reference latest revision and completed check. Never store `safe: true`.

### MedicationOrder / MedicationOrderVersion
Separate inpatient aggregate. Order contains hospital/patient/ordering doctor/current version/status `ACTIVE|DISCONTINUED|CANCELLED`; immutable order versions contain items, change reason, author/time, prior version, check link. No MAR in prototype.

### Appointment
`_id`, hospital/patient/doctor, `startAt`, `endAt`, status `BOOKED|CANCELLED|COMPLETED`, creator, timestamps, version. Index `{hospitalId,doctorUserId,startAt,status}` and `{hospitalId,patientId,startAt}`. Arbitrary interval overlap needs application/transaction logic; a unique index alone is insufficient. Fixed slots simplify safe one-day implementation.

### Notification
`_id`, hospital, recipient user, type, subject ID, created/read timestamps. In-app only; notification is not source of alert state.

### AuditEvent
`_id`, hospital, actor, action, resource type/ID, timestamp, request ID, reason, before/after version, result, limited metadata.
Indexes `{hospitalId,timestamp}`, `{hospitalId,resourceType,resourceId,timestamp}`, `{hospitalId,actorUserId,timestamp}`. Append-only at application layer; never log secrets or image bytes.

### IdempotencyRecord
`_id`, hospital, actor, key, operation, request hash, status, result ref, created/expiry times. Unique `{hospitalId,actorUserId,operation,key}`. Same key/same payload returns prior result; same key/different payload returns 409. TTL is cleanup only.

## Transaction caveat
Verify transaction support for the selected MongoDB topology. If unavailable, use explicit operation state, idempotency, and reconciliation; do not claim multi-document atomicity without a test.
