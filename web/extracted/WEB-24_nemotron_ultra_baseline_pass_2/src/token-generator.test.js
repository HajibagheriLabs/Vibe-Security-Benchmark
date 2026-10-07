'use strict';

const {
  generateSessionToken,
  validateTokenFormat,
  constantTimeCompare,
  generateSessionTokens,
  TOKEN_CONFIG
} = require('./token-generator');

const { test, describe, assert, beforeEach } = require('node:test');

describe('generateSessionToken', () => {
  test('generates a token with default options', () => {
    const token = generateSessionToken();
    assert.ok(typeof token === 'string');
    assert.ok(token.startsWith('sess_'));
    assert.strictEqual(token.length, TOKEN_CONFIG.PREFIX.length + TOKEN_CONFIG.EXPECTED_LENGTH);
  });

  test('generates unique tokens on each call', () => {
    const tokens = new Set();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateSessionToken());
    }
    assert.strictEqual(tokens.size, 100);
  });

  test('generates token with custom entropy bytes', () => {
    const token = generateSessionToken({ entropyBytes: 16 });
    assert.ok(token.startsWith('sess_'));
    // 16 bytes base64url = 22 chars
    assert.strictEqual(token.length, 5 + 22);
  });

  test('generates token with custom prefix', () => {
    const token = generateSessionToken({ prefix: 'custom_' });
    assert.ok(token.startsWith('custom_'));
  });

  test('generates token with hex encoding', () => {
    const token = generateSessionToken({ encoding: 'hex' });
    assert.ok(token.startsWith('sess_'));
    // 32 bytes hex = 64 chars
    assert.strictEqual(token.length, 5 + 64);
    assert.ok(/^sess_[0-9a-f]{64}$/.test(token));
  });

  test('generates token with base64 encoding', () => {
    const token = generateSessionToken({ encoding: 'base64' });
    assert.ok(token.startsWith('sess_'));
    assert.ok(/^sess_[A-Za-z0-9+/]+=*$/.test(token));
  });

  test('throws on invalid entropy bytes (too low)', () => {
    assert.throws(() => generateSessionToken({ entropyBytes: 8 }), /entropyBytes must be an integer between 16 and 64/);
  });

  test('throws on invalid entropy bytes (too high)', () => {
    assert.throws(() => generateSessionToken({ entropyBytes: 128 }), /entropyBytes must be an integer between 16 and 64/);
  });

  test('throws on non-integer entropy bytes', () => {
    assert.throws(() => generateSessionToken({ entropyBytes: 32.5 }), /entropyBytes must be an integer between 16 and 64/);
  });

  test('throws on empty prefix', () => {
    assert.throws(() => generateSessionToken({ prefix: '' }), /prefix must be a non-empty string/);
  });

  test('throws on invalid encoding', () => {
    assert.throws(() => generateSessionToken({ encoding: 'invalid' }), /encoding must be one of/);
  });
});

describe('validateTokenFormat', () => {
  test('validates correct default token', () => {
    const token = generateSessionToken();
    assert.strictEqual(validateTokenFormat(token), true);
  });

  test('validates correct custom token', () => {
    const token = generateSessionToken({ prefix: 'custom_', entropyBytes: 16, encoding: 'hex' });
    assert.strictEqual(validateTokenFormat(token, { prefix: 'custom_', entropyBytes: 16, encoding: 'hex' }), true);
  });

  test('rejects token with wrong prefix', () => {
    const token = generateSessionToken({ prefix: 'other_' });
    assert.strictEqual(validateTokenFormat(token, { prefix: 'sess_' }), false);
  });

  test('rejects token with wrong length', () => {
    assert.strictEqual(validateTokenFormat('sess_short'), false);
  });

  test('rejects token with invalid characters', () => {
    assert.strictEqual(validateTokenFormat('sess_!!!invalid!!!'), false);
  });

  test('rejects non-string input', () => {
    assert.strictEqual(validateTokenFormat(null), false);
    assert.strictEqual(validateTokenFormat(123), false);
    assert.strictEqual(validateTokenFormat(undefined), false);
  });

  test('validates hex encoded token', () => {
    const token = generateSessionToken({ encoding: 'hex' });
    assert.strictEqual(validateTokenFormat(token, { encoding: 'hex' }), true);
  });

  test('validates base64 encoded token', () => {
    const token = generateSessionToken({ encoding: 'base64' });
    assert.strictEqual(validateTokenFormat(token, { encoding: 'base64' }), true);
  });
});

describe('constantTimeCompare', () => {
  test('returns true for identical tokens', () => {
    const token = generateSessionToken();
    assert.strictEqual(constantTimeCompare(token, token), true);
  });

  test('returns false for different tokens', () => {
    const token1 = generateSessionToken();
    const token2 = generateSessionToken();
    assert.strictEqual(constantTimeCompare(token1, token2), false);
  });

  test('returns false for different length tokens', () => {
    assert.strictEqual(constantTimeCompare('sess_short', 'sess_very_long_token_here'), false);
  });

  test('returns false for non-string inputs', () => {
    assert.strictEqual(constantTimeCompare(null, 'token'), false);
    assert.strictEqual(constantTimeCompare('token', undefined), false);
    assert.strictEqual(constantTimeCompare(123, 'token'), false);
  });

  test('handles empty strings', () => {
    assert.strictEqual(constantTimeCompare('', ''), true);
    assert.strictEqual(constantTimeCompare('', 'a'), false);
  });
});

describe('generateSessionTokens', () => {
  test('generates requested number of tokens', () => {
    const tokens = generateSessionTokens(5);
    assert.strictEqual(tokens.length, 5);
    tokens.forEach(token => {
      assert.ok(token.startsWith('sess_'));
    });
  });

  test('generates unique tokens in batch', () => {
    const tokens = generateSessionTokens(50);
    const uniqueTokens = new Set(tokens);
    assert.strictEqual(uniqueTokens.size, 50);
  });

  test('respects custom options in batch', () => {
    const tokens = generateSessionTokens(3, { prefix: 'batch_', encoding: 'hex' });
    tokens.forEach(token => {
      assert.ok(token.startsWith('batch_'));
      assert.ok(/^batch_[0-9a-f]{64}$/.test(token));
    });
  });

  test('throws on invalid count (zero)', () => {
    assert.throws(() => generateSessionTokens(0), /count must be an integer between 1 and 1000/);
  });

  test('throws on invalid count (negative)', () => {
    assert.throws(() => generateSessionTokens(-1), /count must be an integer between 1 and 1000/);
  });

  test('throws on invalid count (too high)', () => {
    assert.throws(() => generateSessionTokens(1001), /count must be an integer between 1 and 1000/);
  });

  test('throws on non-integer count', () => {
    assert.throws(() => generateSessionTokens(5.5), /count must be an integer between 1 and 1000/);
  });
});

describe('TOKEN_CONFIG', () => {
  test('exports expected configuration constants', () => {
    assert.strictEqual(TOKEN_CONFIG.ENTROPY_BYTES, 32);
    assert.strictEqual(TOKEN_CONFIG.ENCODING, 'base64url');
    assert.strictEqual(TOKEN_CONFIG.PREFIX, 'sess_');
    assert.strictEqual(TOKEN_CONFIG.EXPECTED_LENGTH, 43);
  });
});

describe('Entropy quality', () => {
  test('tokens have high entropy (statistical check)', () => {
    // Generate many tokens and check character distribution
    const tokens = generateSessionTokens(1000);
    const charCounts = {};
    
    tokens.forEach(token => {
      const body = token.slice(5); // Remove 'sess_' prefix
      for (const char of body) {
        charCounts[char] = (charCounts[char] || 0) + 1;
      }
    });

    // Base64url uses 64 characters (A-Z, a-z, 0-9, -, _)
    // With 1000 tokens * 43 chars = 43000 chars, each should appear ~672 times
    // Allow wide variance due to randomness
    const expectedChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const totalChars = Object.values(charCounts).reduce((a, b) => a + b, 0);
    const expectedPerChar = totalChars / 64;
    
    // Each character should appear at least 10% of expected (very loose bound)
    for (const char of expectedChars) {
      assert.ok(charCounts[char] > expectedPerChar * 0.1, `Character ${char} underrepresented`);
    }
  });
});