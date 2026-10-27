import { z } from 'zod';

export const RegisterRequestSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(12).max(128),
  displayName: z.string().min(1).max(120),
  hospitalSlug: z.string().min(2).max(80),
  requestedRole: z.enum(['PATIENT', 'DOCTOR', 'PHARMACIST', 'HOSPITAL_ADMIN']),
  syntheticHospitalPatientId: z.string().max(64).optional(),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const MembershipRequestSchema = z.object({
  hospitalSlug: z.string().min(2).max(80),
  requestedRole: z.enum(['PATIENT', 'DOCTOR', 'PHARMACIST', 'HOSPITAL_ADMIN']),
});
export type MembershipRequest = z.infer<typeof MembershipRequestSchema>;

export const ApproveMembershipRequestSchema = z.object({
  assignedRole: z.enum(['PATIENT', 'DOCTOR', 'PHARMACIST', 'HOSPITAL_ADMIN']),
  expectedVersion: z.number().int().nonnegative(),
  reason: z.string().max(500).optional(),
});
export type ApproveMembershipRequest = z.infer<typeof ApproveMembershipRequestSchema>;

export const RejectMembershipRequestSchema = z.object({
  reason: z.string().max(500).optional(),
  expectedVersion: z.number().int().nonnegative(),
});
export type RejectMembershipRequest = z.infer<typeof RejectMembershipRequestSchema>;

export const SuspendMembershipRequestSchema = z.object({
  reason: z.string().min(3).max(500),
  expectedVersion: z.number().int().nonnegative(),
});
export type SuspendMembershipRequest = z.infer<typeof SuspendMembershipRequestSchema>;
