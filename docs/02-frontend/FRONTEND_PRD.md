# Frontend PRD — `medication-safety-frontend`

## Purpose
Build a responsive Next.js App Router + TypeScript application for four role-specific portals and a mobile-first prescription capture workflow. The backend is authoritative for identity, permissions, clinical states, rule evaluation, and workflow authorization.

## Architecture boundaries
- Next.js App Router, TypeScript, accessible React components.
- API base URL from `NEXT_PUBLIC_API_BASE_URL` only; no secrets in public variables.
- API client generated from or typed against the pinned backend OpenAPI contract.
- No clinical rule evaluation in the browser.
- OCR may run client-side; its output is untrusted until pharmacist confirmation.
- Do not store session secrets in localStorage/sessionStorage.
- Send secure cookies with `credentials: "include"` when topology permits.
- Protected clinical responses must not be cached in shared/browser caches.
- Camera support is progressive enhancement; manual upload/entry fallback is required.

## Global shell
Every authenticated page includes:
- Persistent notice: “Synthetic demonstration only — not for clinical use.”
- Rule-result notice: “Illustrative rule set; not clinically validated.”
- Current hospital/workspace indicator.
- User identity, role, sign-out.
- Responsive role-specific navigation.
- Accessible status labels and keyboard navigation.
- API error display using request ID and stable code.
- Session expiry handling that clears protected UI state and redirects to sign-in.

## Role-specific functionality

### Authentication
- Registration with validation.
- Login/logout and current-session bootstrap.
- Pending approval page.
- Disabled/suspended membership messaging.
- Invitation acceptance is deferred unless needed.
- Public registration must not grant clinical roles.

### Pharmacist
- Work queue and held cases.
- Search by synthetic hospital patient ID.
- Patient match confirmation before linking capture.
- Camera/file capture and image preview.
- OCR extraction editor with confidence hints where available.
- Medicine confirmation: ingredient, brand/synonym, strength, form, dose, route, frequency, duration.
- Ambiguous/unresolved matching blocks progression.
- Check result with category coverage, source, rule version, severity, rationale, limitations, and next action.
- Alert/case detail and history.
- Recheck revised prescription.
- Dispensing authorization button only when backend prerequisites pass; backend revalidates.
- Inpatient order list is deferred or minimal.

### Doctor
- In-app task queue, prioritized by severity/age.
- Case detail with prescription version, patient context, medicine data, and evidence.
- Acknowledge/under-review.
- Record typed disposition with required rationale.
- Change-required workflow creates a revised prescription version.
- View prior versions and rule-set versions.
- No rewriting original prescription or deleting audit history.
- Basic appointment list if time permits.

### Patient
- Own linked record only.
- Prescriptions and patient-visible status.
- Upcoming/past appointments and history.
- No internal notes, staff-only reports, or raw audit stream.
- Patient-reported medicine/allergy information is labelled reported, not verified.

### Hospital administrator
- Overview and pending membership requests.
- Approve/reject membership and assign role.
- Suspend/revoke membership.
- Hospital user list.
- Patient-link review can be deferred.
- Read-only audit view can be deferred.
- Rule governance interface is deferred; seeded rules are not editable by general admins.
- Admin-only demo reset with explicit confirmation and scoped workspace.

## State model
Check outcome union: `FLAGGED | NO_MATCHING_RULE | INCOMPLETE | UNSUPPORTED | FAILED`. Workflow state, alert state, and dispensing authorization are separate. `NO_MATCHING_RULE` must never be represented as “safe” or a green clearance.

## Error handling
- `401`: clear protected client state; redirect to login.
- `403`: access denied; no automatic retry.
- `404`: safe not-found without leaking foreign tenant existence.
- `409`: stale version/idempotency conflict; reload and require user review.
- `422`: show validation/state-transition details.
- `429`: show retry guidance and respect `Retry-After`.
- `5xx`/network failure: incomplete/failed; never advance.
- OCR failure: retry, manual entry, or save incomplete.
- Unsupported medicine: show why; no clear result.

## Accessibility/mobile
- Modern mobile browsers; camera requires HTTPS except localhost.
- Semantic headings, labelled controls, focus management, visible focus.
- Status not communicated by color alone.
- Test small viewport and keyboard-only flow.
- File input fallback if camera API is unavailable/denied.
- English printed-text OCR first; handwriting and other languages unsupported.

## Privacy/performance
- Keep images in memory/temporary processing where feasible.
- Do not send images to third-party OCR without explicit reviewed decision.
- Clear previews and local form state after completion/logout as appropriate.
- No persistence of session tokens or clinical content in browser storage by default.

## Acceptance
- All day-one routes render correct role shell.
- Unauthorized direct route access does not expose protected data.
- Primary outpatient journey works against real API.
- OCR output always requires pharmacist confirmation.
- Incomplete/failed/unsupported states are visible and non-authorizing.
- Conflict response reloads instead of overwriting.
- API errors show request ID when supplied.
- Camera or upload fallback works on tested target browsers.
