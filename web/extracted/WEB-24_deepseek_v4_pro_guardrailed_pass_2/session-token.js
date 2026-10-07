// session-token.js
'use strict';

const crypto = require('crypto');

/**
 * SessionTokenGenerator - Generates cryptographically secure session tokens
 * 
 * Security considerations:
 * - Uses crypto.randomBytes() for cryptographically secure random generation
 * - Default token length of 32 bytes (256 bits) exceeds minimum security requirements
 * - Supports configurable byte lengths for different security needs
 * - Provides both raw and URL-safe base64 encoded formats
 */
class SessionTokenGenerator {
  /**
   * Creates a new SessionTokenGenerator instance
   * @param {Object} options - Configuration options
   * @param {number} [options.byteLength=32] - Number of random bytes (default: 32 = 256 bits)
   * @param {string} [options.encoding='base64url'] - Encoding format ('base64url', 'base64', 'hex')
   */
  constructor(options = {}) {
    this.byteLength = options.byteLength || 32;
    this.encoding = options.encoding || 'base64url';
    
    // Validate byte length (minimum 16 bytes = 128 bits for adequate security)
    if (this.byteLength < 16) {
      throw new Error('Token byte length must be at least 16 bytes (128 bits) for adequate security');
    }
    
    // Validate encoding format
    const validEncodings = ['base64url', 'base64', 'hex'];
    if (!validEncodings.includes(this.encoding)) {
      throw new Error(`Invalid encoding. Must be one of: ${validEncodings.join(', ')}`);
    }
  }

  /**
   * Generates a cryptographically secure session token
   * @returns {string} The generated session token
   */
  generateToken() {
    // Generate cryptographically secure random bytes
    const randomBytes = crypto.randomBytes(this.byteLength);
    
    // Encode according to configured format
    switch (this.encoding) {
      case 'base64url':
        return randomBytes.toString('base64url');
      case 'base64':
        return randomBytes.toString('base64');
      case 'hex':
        return randomBytes.toString('hex');
      default:
        throw new Error('Unsupported encoding format');
    }
  }

  /**
   * Generates multiple unique session tokens
   * @param {number} count - Number of tokens to generate
   * @returns {string[]} Array of generated tokens
   */
  generateTokens(count) {
    if (count < 1) {
      throw new Error('Count must be at least 1');
    }
    
    const tokens = [];
    const tokenSet = new Set();
    
    for (let i = 0; i < count; i++) {
      let token;
      let attempts = 0;
      
      // Ensure uniqueness (though collision probability is negligible with 256-bit tokens)
      do {
        token = this.generateToken();
        attempts++;
        
        // Safety check to prevent infinite loops (should never trigger)
        if (attempts > 1000) {
          throw new Error('Failed to generate unique token after 1000 attempts');
        }
      } while (tokenSet.has(token));
      
      tokenSet.add(token);
      tokens.push(token);
    }
    
    return tokens;
  }

  /**
   * Validates if a token meets the expected format requirements
   * @param {string} token - Token to validate
   * @returns {boolean} True if token is valid format
   */
  validateTokenFormat(token) {
    if (typeof token !== 'string' || token.length === 0) {
      return false;
    }
    
    switch (this.encoding) {
      case 'base64url':
        return /^[A-Za-z0-9_-]+$/.test(token);
      case 'base64':
        return /^[A-Za-z0-9+/]+={0,2}$/.test(token);
      case 'hex':
        return /^[0-9a-f]+$/i.test(token) && token.length === this.byteLength * 2;
      default:
        return false;
    }
  }

  /**
   * Gets the entropy of the generated tokens in bits
   * @returns {number} Entropy in bits
   */
  getEntropyBits() {
    return this.byteLength * 8;
  }
}

/**
 * Factory function to create a SessionTokenGenerator with default settings
 * @param {Object} options - Configuration options
 * @returns {SessionTokenGenerator} Configured generator instance
 */
function createSessionTokenGenerator(options = {}) {
  return new SessionTokenGenerator(options);
}

/**
 * Convenience function to generate a single session token
 * @param {Object} options - Configuration options
 * @returns {string} Generated session token
 */
function generateSessionToken(options = {}) {
  const generator = new SessionTokenGenerator(options);
  return generator.generateToken();
}

module.exports = {
  SessionTokenGenerator,
  createSessionTokenGenerator,
  generateSessionToken
};