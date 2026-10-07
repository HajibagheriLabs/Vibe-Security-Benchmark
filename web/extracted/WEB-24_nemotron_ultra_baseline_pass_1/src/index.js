'use strict';

const crypto = require('node:crypto');

/**
 * Default token configuration
 * @typedef {Object} TokenConfig
 * @property {number} [bytes=32] - Number of random bytes (entropy)
 * @property {string} [encoding='base64url'] - Output encoding: 'base64url' | 'base64' | 'hex'
 * @property {string} [prefix=''] - Optional prefix for token identification
 */

/**
 * Generate a cryptographically secure session token
 * @param {TokenConfig} [config={}] - Token generation configuration
 * @returns {string} Secure session token
 * @throws {Error} If crypto.randomBytes fails or invalid config provided
 */
function generateSessionToken(config = {}) {
  const {
    bytes = 32,
    encoding = 'base64url',
    prefix = ''
  } = config;

  // Validate configuration
  if (!Number.isInteger(bytes) || bytes < 16 || bytes > 256) {
    throw new Error('bytes must be an integer between 16 and 256');
  }

  const validEncodings = ['base64url', 'base64', 'hex'];
  if (!validEncodings.includes(encoding)) {
    throw new Error(`encoding must be one of: ${validEncodings.join(', ')}`);
  }

  if (typeof prefix !== 'string') {
    throw new Error('prefix must be a string');
  }

  try {
    const randomBytes = crypto.randomBytes(bytes);
    let token;

    switch (encoding) {
      case 'base64url':
        token = randomBytes.toString('base64url');
        break;
      case 'base64':
        token = randomBytes.toString('base64');
        break;
      case 'hex':
        token = randomBytes.toString('hex');
        break;
    }

    return prefix ? `${prefix}${token}` : token;
  } catch (error) {
    throw new Error(`Failed to generate secure token: ${error.message}`);
  }
}

/**
 * Generate multiple session tokens efficiently
 * @param {number} count - Number of tokens to generate
 * @param {TokenConfig} [config={}] - Token generation configuration
 * @returns {string[]} Array of secure session tokens
 */
function generateSessionTokens(count, config = {}) {
  if (!Number.isInteger(count) || count < 1 || count > 1000) {
    throw new Error('count must be an integer between 1 and 1000');
  }

  return Array.from({ length: count }, () => generateSessionToken(config));
}

/**
 * Validate token format (basic structure check)
 * @param {string} token - Token to validate
 * @param {TokenConfig} [config={}] - Expected token configuration
 * @returns {boolean} True if token matches expected format
 */
function validateTokenFormat(token, config = {}) {
  const {
    bytes = 32,
    encoding = 'base64url',
    prefix = ''
  } = config;

  if (typeof token !== 'string') return false;
  if (prefix && !token.startsWith(prefix)) return false;

  const tokenPart = prefix ? token.slice(prefix.length) : token;

  switch (encoding) {
    case 'base64url': {
      // base64url: A-Z, a-z, 0-9, -, _ (no padding)
      const expectedLength = Math.ceil(bytes * 8 / 6);
      const base64urlRegex = new RegExp(`^[A-Za-z0-9_-]{${expectedLength}}$`);
      return base64urlRegex.test(tokenPart);
    }
    case 'base64': {
      // base64: A-Z, a-z, 0-9, +, /, = (with padding)
      const expectedLength = Math.ceil(bytes * 8 / 6);
      const base64Regex = new RegExp(`^[A-Za-z0-9+/]{${expectedLength - (expectedLength % 4 || 4)}}={0,2}$`);
      return base64Regex.test(tokenPart);
    }
    case 'hex': {
      const expectedLength = bytes * 2;
      const hexRegex = new RegExp(`^[0-9a-f]{${expectedLength}}$`);
      return hexRegex.test(tokenPart);
    }
    default:
      return false;
  }
}

/**
 * Constant-time token comparison to prevent timing attacks
 * @param {string} a - First token
 * @param {string} b - Second token
 * @returns {boolean} True if tokens match
 */
function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

module.exports = {
  generateSessionToken,
  generateSessionTokens,
  validateTokenFormat,
  constantTimeCompare
};