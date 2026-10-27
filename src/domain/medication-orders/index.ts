/**
 * Domain module: Inpatient Medication Orders
 * Immutable order versions, separate from outpatient prescriptions.
 */
export type MedicationOrderStatus = 'ACTIVE' | 'DISCONTINUED' | 'CANCELLED';
