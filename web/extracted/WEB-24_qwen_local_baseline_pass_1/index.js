const crypto = require('crypto');

/**
 * Generates a cryptographically secure session token.
 * 
 * @param {number} [bytes=32] - The number of random bytes to generate.
 * @returns {string} A hex-encoded string representing the token.
 */
function generateSessionToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Validates the format of a session token.
 * Ensures it is a hexadecimal string of expected length.
 * 
 * @param {string} token - The token to validate.
 * @param {number} [expectedBytes=32] - The expected number of bytes the token represents.
 * @returns {boolean} True if the token is valid, false otherwise.
 */
function validateSessionToken(token, expectedBytes = 32) {
  if (typeof token !== 'string') {
    return false;
  }

  const expectedLength = expectedBytes * 2; // Hex string is 2 chars per byte
  
  if (token.length !== expectedLength) {
    return false;
  }

  // Check if it's a valid hexadecimal string
  const hexRegex = /^[0-9a-f]+$/i;
  return hexRegex.test(token);
}

module.exports = {
  generateSessionToken,
  validateSessionToken
};