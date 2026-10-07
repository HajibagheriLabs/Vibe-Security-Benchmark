import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

/**
 * Generates a cryptographically secure session token.
 *
 * @param {number} [byteLength=32] - Number of random bytes (default 32 = 256 bits).
 * @param {'hex'|'base64'|'base64url'} [encoding='base64url'] - Output encoding.
 * @returns {string} A URL-safe, cryptographically secure token string.
 */
export function generateSessionToken(byteLength = 32, encoding = 'base64url') {
  if (!Number.isInteger(byteLength) || byteLength < 16) {
    throw new RangeError('byteLength must be an integer >= 16 (128 bits minimum)');
  }

  const validEncodings = ['hex', 'base64', 'base64url'];
  if (!validEncodings.includes(encoding)) {
    throw new TypeError(`encoding must be one of: ${validEncodings.join(', ')}`);
  }

  return randomBytes(byteLength).toString(encoding);
}

/**
 * Hashes a session token for storage using SHA-256.
 *
 * @param {string} token - The plaintext token to hash.
 * @returns {string} Hex-encoded SHA-256 hash of the token.
 */
export function hashSessionToken(token) {
  if (typeof token !== 'string' || token.length === 0) {
    throw new TypeError('token must be a non-empty string');
  }
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Constant-time comparison of a plaintext token against a stored hash.
 *
 * @param {string} token - The plaintext token supplied by the client.
 * @param {string} storedHash - The hex-encoded SHA-256 hash stored server-side.
 * @returns {boolean} True if the token matches the hash.
 */
export function verifySessionToken(token, storedHash) {
  if (typeof token !== 'string' || typeof storedHash !== 'string') {
    return false;
  }

  const computedHash = hashSessionToken(token);
  const computedBuffer = Buffer.from(computedHash, 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');

  if (computedBuffer.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(computedBuffer, storedBuffer);
}

/**
 * Generates a token along with its hash in one call.
 *
 * @param {number} [byteLength=32] - Number of random bytes.
 * @returns {{ token: string, hash: string }} The plaintext token and its SHA-256 hash.
 */
export function generateTokenPair(byteLength = 32) {
  const token = generateSessionToken(byteLength);
  const hash = hashSessionToken(token);
  return { token, hash };
}