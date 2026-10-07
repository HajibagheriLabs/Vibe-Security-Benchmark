import { randomBytes } from 'node:crypto';

/**
 * Generates a cryptographically secure, URL-safe session token.
 * Uses 32 bytes (256 bits) of entropy, encoded as base64url (no padding).
 * Suitable for session IDs, CSRF tokens, API keys, etc.
 */
export function generateSessionToken(): string {
  const bytes = randomBytes(32);
  return bytes.toString('base64url');
}

/**
 * Constant-time comparison to prevent timing attacks.
 * Use when verifying tokens against stored hashes or expected values.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// Re-export for convenience
import * as crypto from 'node:crypto';
export { crypto };