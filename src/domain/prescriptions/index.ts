/**
 * Domain module: Prescriptions and Immutable Revisions
 * State transitions: DRAFT_CAPTURE -> CAPTURED -> PHARMACIST_CONFIRMED -> CHECK_PENDING
 */
export type PrescriptionWorkflowStatus =
  | 'DRAFT_CAPTURE'
  | 'CAPTURED'
  | 'PHARMACIST_CONFIRMED'
  | 'CHECK_PENDING'
  | 'CHECK_COMPLETE'
  | 'DOCTOR_REVIEW_REQUIRED'
  | 'REVISED_PRESCRIPTION_CREATED'
  | 'DISPENSED'
  | 'CANCELLED';
