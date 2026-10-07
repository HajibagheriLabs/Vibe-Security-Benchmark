import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'crypto';

/**
 * Generate a cryptographically secure session token.
 * 
 * @param {Object} [options] - Configuration options
 * @param {number} [options.byteLength=32] - Number of random bytes (token length will be 2x this in hex)
 * @param {'hex'|'base64'|'base64url'} [options.encoding='hex'] - Output encoding
 * @param {string} [options.prefix] - Optional prefix to prepend to the token
 * @returns {string} The generated session token
 */
export function generateSessionToken(options = {}) {
  const {
    byteLength = 32,
    encoding = 'hex',
    prefix = ''
  } = options;

  if (!Number.isInteger(byteLength) || byteLength < 16) {
    throw new Error('byteLength must be an integer of at least 16 for adequate security');
  }

  if (!['hex', 'base64', 'base64url'].includes(encoding)) {
    throw new Error('encoding must be one of: hex, base64, base64url');
  }

  const token = randomBytes(byteLength).toString(encoding);
  return prefix ? `${prefix}_${token}` : token;
}

/**
 * Generate a UUID v4 session token (RFC 4122 compliant, cryptographically secure).
 * 
 * @param {Object} [options] - Configuration options
 * @param {string} [options.prefix] - Optional prefix to prepend to the token
 * @returns {string} The generated UUID v4 token
 */
export function generateUuidToken(options = {}) {
  const { prefix = '' } = options;
  const uuid = randomUUID();
  return prefix ? `${prefix}_${uuid}` : uuid;
}

/**
 * Hash a session token for storage (e.g., in a database).
 * Uses SHA-256 by default.
 * 
 * @param {string} token - The plaintext token to hash
 * @param {string} [algorithm='sha256'] - Hash algorithm to use
 * @returns {string} Hex-encoded hash of the token
 */
export function hashSessionToken(token, algorithm = 'sha256') {
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('token must be a non-empty string');
  }
  return createHash(algorithm).update(token, 'utf8').digest('hex');
}

/**
 * Constant-time comparison of a provided token against a stored hash.
 * 
 * @param {string} providedToken - The token provided by the client
 * @param {string} storedHash - The hex-encoded hash stored server-side
 * @param {string} [algorithm='sha256'] - Hash algorithm used for the stored hash
 * @returns {boolean} True if the token matches the stored hash
 */
export function verifySessionToken(providedToken, storedHash, algorithm = 'sha256') {
  if (typeof providedToken !== 'string' || typeof storedHash !== 'string') {
    return false;
  }

  const providedHash = createHash(algorithm).update(providedToken, 'utf8').digest('hex');
  const providedBuffer = Buffer.from(providedHash, 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');

  if (providedBuffer.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, storedBuffer);
}

/**
 * Generate a token with a configurable character alphabet.
 * Useful when tokens must conform to specific character set constraints.
 * 
 * @param {Object} [options] - Configuration options
 * @param {number} [options.length=32] - Length of the token in characters
 * @param {string} [options.alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'] - Allowed characters
 * @param {string} [options.prefix] - Optional prefix to prepend to the token
 * @returns {string} The generated token
 */
export function generateTokenWithAlphabet(options = {}) {
  const {
    length = 32,
    alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    prefix = ''
  } = options;

  if (!Number.isInteger(length) || length < 16) {
    throw new Error('length must be an integer of at least 16 for adequate security');
  }

  if (typeof alphabet !== 'string' || alphabet.length < 16) {
    throw new Error('alphabet must contain at least 16 unique characters');
  }

  // Ensure alphabet has no duplicate characters
  const uniqueChars = new Set(alphabet);
  if (uniqueChars.size !== alphabet.length) {
    throw new Error('alphabet must not contain duplicate characters');
  }

  const alphabetLength = alphabet.length;
  const bytesNeeded = Math.ceil(length * 2); // Oversample to reduce modulo bias
  const randomBuffer = randomBytes(bytesNeeded);
  const maxValid = Math.floor(256 / alphabetLength) * alphabetLength;

  let result = '';
  let byteIndex = 0;

  while (result.length < length) {
    if (byteIndex >= randomBuffer.length) {
      // Regenerate buffer if exhausted (should be rare with oversampling)
      const newBuffer = randomBytes(bytesNeeded);
      randomBuffer.set(newBuffer);
      byteIndex = 0;
    }

    const byte = randomBuffer[byteIndex++];
    if (byte < maxValid) {
      result += alphabet[byte % alphabetLength];
    }
  }

  return prefix ? `${prefix}_${result}` : result;
}

export default {
  generateSessionToken,
  generateUuidToken,
  hashSessionToken,
  verifySessionToken,
  generateTokenWithAlphabet
};