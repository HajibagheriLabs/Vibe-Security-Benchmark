// session-token.js
import { randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Generates a cryptographically secure session token.
 * Uses Node.js built-in crypto.randomBytes (no external dependencies required).
 *
 * @param {number} [byteLength=32] - Number of random bytes (32 bytes = 256 bits entropy)
 * @returns {string} URL-safe base64url-encoded token
 */
export function generateSessionToken(byteLength = 32) {
  if (!Number.isInteger(byteLength) || byteLength < 16 || byteLength > 512) {
    throw new RangeError('byteLength must be an integer between 16 and 512');
  }
  
  return randomBytes(byteLength).toString('base64url');
}

/**
 * Constant-time comparison of two session tokens.
 * Prevents timing attacks when validating tokens.
 *
 * @param {string} tokenA - First token
 * @param {string} tokenB - Second token
 * @returns {boolean} True if tokens match
 */
export function safeTokenCompare(tokenA, tokenB) {
  if (typeof tokenA !== 'string' || typeof tokenB !== 'string') {
    throw new TypeError('Both arguments must be strings');
  }
  
  const bufA = Buffer.from(tokenA);
  const bufB = Buffer.from(tokenB);
  
  if (bufA.length !== bufB.length) {
    // Still perform a comparison to maintain constant-time behavior
    const dummy = Buffer.alloc(bufA.length);
    timingSafeEqual(bufA, dummy);
    return false;
  }
  
  return timingSafeEqual(bufA, bufB);
}

/**
 * Generates a session token with a specified prefix for identification.
 * Example: "sess_" prefix for session tokens in logs/audit trails.
 *
 * @param {string} prefix - Token prefix (e.g., "sess_")
 * @param {number} [byteLength=32] - Number of random bytes
 * @returns {string} Prefixed token
 */
export function generatePrefixedSessionToken(prefix, byteLength = 32) {
  if (typeof prefix !== 'string' || prefix.length === 0) {
    throw new TypeError('prefix must be a non-empty string');
  }
  
  // Validate prefix contains only safe characters (alphanumeric and underscore)
  if (!/^[a-zA-Z0-9_]+$/.test(prefix)) {
    throw new TypeError('prefix must contain only alphanumeric characters and underscores');
  }
  
  return `${prefix}${generateSessionToken(byteLength)}`;
}

/**
 * Generates a token hash suitable for storage.
 * Uses SHA-256 to create a fixed-length hash of the token.
 * Store the hash, not the raw token, in the database.
 *
 * @param {string} token - Raw session token
 * @returns {string} Hex-encoded SHA-256 hash
 */
export function hashSessionToken(token) {
  if (typeof token !== 'string' || token.length === 0) {
    throw new TypeError('token must be a non-empty string');
  }
  
  const { createHash } = require('node:crypto');
  return createHash('sha256').update(token).digest('hex');
}

export default {
  generateSessionToken,
  generatePrefixedSessionToken,
  safeTokenCompare,
  hashSessionToken
};