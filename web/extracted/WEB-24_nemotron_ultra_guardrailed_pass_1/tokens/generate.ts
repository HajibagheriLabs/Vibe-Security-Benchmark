import { randomBytes } from 'node:crypto';

/**
 * Generates a cryptographically secure session token.
 * Uses 32 bytes (256 bits) of entropy, encoded as URL-safe base64.
 * @returns A secure random token string suitable for session identifiers.
 */
export function generateSessionToken(): string {
  const bytes = randomBytes(32);
  return bytes.toString('base64url');
}

/**
 * Generates a cryptographically secure token with custom byte length.
 * @param byteLength Number of random bytes to generate (default: 32).
 * @returns A secure random token string.
 */
export function generateSecureToken(byteLength = 32): string {
  if (byteLength < 16) {
    throw new Error('Token byte length must be at least 16');
  }
  const bytes = randomBytes(byteLength);
  return bytes.toString('base64url');
}