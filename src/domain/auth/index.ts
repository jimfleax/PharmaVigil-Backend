import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateSessionTokens(): {
  sessionId: string;
  rawSecret: string;
  secretVerifierHash: string;
  cookieValue: string;
} {
  const sessionId = crypto.randomUUID();
  const rawSecret = crypto.randomBytes(32).toString('base64url');
  const secretVerifierHash = crypto.createHash('sha256').update(rawSecret).digest('hex');
  const cookieValue = `${sessionId}.${rawSecret}`;
  return { sessionId, rawSecret, secretVerifierHash, cookieValue };
}

export function verifySessionSecret(rawSecret: string, storedHash: string): boolean {
  const computedHash = crypto.createHash('sha256').update(rawSecret).digest('hex');
  if (computedHash.length !== storedHash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(storedHash, 'hex'));
}

export function hashConfirmationPhrase(phrase: string): string {
  return crypto.createHash('sha256').update(phrase.trim().toLowerCase()).digest('hex');
}
