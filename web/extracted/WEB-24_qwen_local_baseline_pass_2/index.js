const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * Generates a cryptographically secure session token.
 * 
 * @param {number} [length=32] - The number of random bytes to generate.
 * @param {string} [encoding='hex'] - The encoding format for the output ('hex', 'base64', 'base64url').
 * @returns {string} The generated session token.
 */
function generateSecureSessionToken(length = 32, encoding = 'hex') {
  if (!['hex', 'base64', 'base64url'].includes(encoding)) {
    throw new Error(`Unsupported encoding: ${encoding}. Use 'hex', 'base64', or 'base64url'.`);
  }

  const bytes = crypto.randomBytes(length);
  
  let token;
  if (encoding === 'hex') {
    token = bytes.toString('hex');
  } else if (encoding === 'base64') {
    token = bytes.toString('base64');
  } else if (encoding === 'base64url') {
    token = bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  return token;
}

/**
 * Generates a UUID v4 string.
 * 
 * @returns {string} The generated UUID.
 */
function generateUUID() {
  return uuidv4();
}

module.exports = {
  generateSecureSessionToken,
  generateUUID
};