/**
 * Domain module: Authentication and Credential verification
 * Pure domain logic for password hashing, session tokens, and membership validity.
 */
export interface AuthDomainPolicy {
  minPasswordLength: number;
  maxFailedAttempts: number;
  sessionIdleMinutes: number;
}
