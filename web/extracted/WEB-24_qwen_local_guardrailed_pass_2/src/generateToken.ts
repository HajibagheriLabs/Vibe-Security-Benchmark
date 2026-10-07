import { randomBytes } from '@node-rs/crypto';
import { createHash } from 'crypto';

/**
 * Generates a cryptographically secure session token.
 * 
 * @param length - Number of random bytes to generate. Default 32 (256 bits).
 * @returns Hex-encoded string of the random bytes.
 */
export function generateToken(length: number = 32): string {
  if (length <= 0) {
    throw new Error('Token length must be a positive integer');
  }

  // Use @node-rs/crypto for high-performance random bytes
  const buffer = randomBytes(length);
  
  // Convert to hex string
  return buffer.toString('hex');
}

/**
 * Generates a SHA-256 hash of a session token for secure storage (e.g., DB).
 * 
 * @param token - The raw session token.
 * @returns Hex-encoded SHA-256 hash.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}