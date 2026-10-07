'use strict';

const crypto = require('crypto');

/**
 * Configuration constants for token generation
 */
const TOKEN_CONFIG = {
  // 32 bytes = 256 bits of entropy (NIST recommended minimum)
  ENTROPY_BYTES: 32,
  // URL-safe base64 encoding (no padding, +/ replaced with -_)
  ENCODING: 'base64url',
  // Token prefix for identification/debugging
  PREFIX: 'sess_',
  // Expected token length after encoding (43 chars for 32 bytes base64url)
  EXPECTED_LENGTH: 43
};

/**
 * Generates a cryptographically secure session token
 * @param {Object} options - Generation options
 * @param {number} [options.entropyBytes=32] - Bytes of entropy (min 16, max 64)
 * @param {string} [options.prefix='sess_'] - Token prefix
 * @param {string} [options.encoding='base64url'] - Output encoding
 * @returns {string} Cryptographically secure session token
 * @throws {Error} If entropy generation fails or options invalid
 */
function generateSessionToken(options = {}) {
  const {
    entropyBytes = TOKEN_CONFIG.ENTROPY_BYTES,
    prefix = TOKEN_CONFIG.PREFIX,
    encoding = TOKEN_CONFIG.ENCODING
  } = options;

  // Validate entropy bytes
  if (!Number.isInteger(entropyBytes) || entropyBytes < 16 || entropyBytes > 64) {
    throw new Error('entropyBytes must be an integer between 16 and 64');
  }

  // Validate prefix
  if (typeof prefix !== 'string' || prefix.length === 0) {
    throw new Error('prefix must be a non-empty string');
  }

  // Validate encoding
  const validEncodings = ['base64url', 'base64', 'hex'];
  if (!validEncodings.includes(encoding)) {
    throw new Error(`encoding must be one of: ${validEncodings.join(', ')}`);
  }

  try {
    // Generate cryptographically secure random bytes
    const randomBytes = crypto.randomBytes(entropyBytes);
    
    // Encode to specified format
    let tokenBody;
    switch (encoding) {
      case 'base64url':
        tokenBody = randomBytes.toString('base64url');
        break;
      case 'base64':
        tokenBody = randomBytes.toString('base64');
        break;
      case 'hex':
        tokenBody = randomBytes.toString('hex');
        break;
    }

    return `${prefix}${tokenBody}`;
  } catch (error) {
    // Re-throw with context while preserving stack trace
    throw new Error(`Failed to generate session token: ${error.message}`);
  }
}

/**
 * Validates a session token format (structure only, not cryptographic verification)
 * @param {string} token - Token to validate
 * @param {Object} options - Validation options
 * @param {string} [options.prefix='sess_'] - Expected prefix
 * @param {string} [options.encoding='base64url'] - Expected encoding
 * @param {number} [options.entropyBytes=32] - Expected entropy bytes
 * @returns {boolean} True if token format is valid
 */
function validateTokenFormat(token, options = {}) {
  const {
    prefix = TOKEN_CONFIG.PREFIX,
    encoding = TOKEN_CONFIG.ENCODING,
    entropyBytes = TOKEN_CONFIG.ENTROPY_BYTES
  } = options;

  if (typeof token !== 'string') {
    return false;
  }

  if (!token.startsWith(prefix)) {
    return false;
  }

  const tokenBody = token.slice(prefix.length);
  
  // Calculate expected body length based on encoding and entropy
  let expectedBodyLength;
  switch (encoding) {
    case 'base64url':
    case 'base64':
      // Base64 encodes 3 bytes -> 4 chars, so 32 bytes -> 43 chars (no padding)
      expectedBodyLength = Math.ceil(entropyBytes * 4 / 3);
      break;
    case 'hex':
      expectedBodyLength = entropyBytes * 2;
      break;
  }

  if (tokenBody.length !== expectedBodyLength) {
    return false;
  }

  // Validate character set for encoding
  const encodingRegex = {
    base64url: /^[A-Za-z0-9_-]+$/,
    base64: /^[A-Za-z0-9+/]+=*$/,
    hex: /^[0-9a-fA-F]+$/
  };

  return encodingRegex[encoding].test(tokenBody);
}

/**
 * Constant-time token comparison to prevent timing attacks
 * @param {string} tokenA - First token
 * @param {string} tokenB - Second token
 * @returns {boolean} True if tokens match
 */
function constantTimeCompare(tokenA, tokenB) {
  if (typeof tokenA !== 'string' || typeof tokenB !== 'string') {
    return false;
  }

  if (tokenA.length !== tokenB.length) {
    // Still compare to avoid early return timing leak
    crypto.timingSafeEqual(Buffer.from(tokenA), Buffer.from(tokenA));
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(tokenA),
    Buffer.from(tokenB)
  );
}

/**
 * Generates multiple tokens efficiently (batch generation)
 * @param {number} count - Number of tokens to generate
 * @param {Object} options - Generation options (same as generateSessionToken)
 * @returns {string[]} Array of session tokens
 */
function generateSessionTokens(count, options = {}) {
  if (!Number.isInteger(count) || count < 1 || count > 1000) {
    throw new Error('count must be an integer between 1 and 1000');
  }

  const tokens = new Array(count);
  for (let i = 0; i < count; i++) {
    tokens[i] = generateSessionToken(options);
  }
  return tokens;
}

module.exports = {
  generateSessionToken,
  validateTokenFormat,
  constantTimeCompare,
  generateSessionTokens,
  TOKEN_CONFIG
};