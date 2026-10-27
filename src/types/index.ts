import type { Context } from 'hono';

export type UserRole = 'PATIENT' | 'DOCTOR' | 'PHARMACIST' | 'HOSPITAL_ADMIN';
export type MembershipStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | 'REVOKED';
export type AccountStatus = 'ACTIVE' | 'DISABLED' | 'PENDING';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  displayName: string;
  accountStatus: AccountStatus;
}

export interface ActiveMembership {
  membershipId: string;
  hospitalId: string;
  role: UserRole;
  status: MembershipStatus;
}

export interface AppVariables {
  requestId: string;
  user?: AuthenticatedUser;
  membership?: ActiveMembership;
}

export type AppContext = Context<{ Variables: AppVariables }>;

export interface ErrorDetail {
  field?: string;
  code?: string;
  message?: string;
}

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
    details: ErrorDetail[];
  };
}
