'use strict';

const {
  generateSessionToken,
  generateSessionTokens,
  validateTokenFormat,
  constantTimeCompare
} = require('../src/index.js');

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

describe('generateSessionToken', () => {
  it('generates a token with default config', () => {
    const token = generateSessionToken();
    assert.strictEqual(typeof token, 'string');
    assert.ok(token.length > 0);
  });

  it('generates tokens with custom byte length', () => {
    const token16 = generateSessionToken({ bytes: 16 });
    const token32 = generateSessionToken({ bytes: 32 });
    const token64 = generateSessionToken({ bytes: 64 });

    // base64url encoding: ceil(bytes * 8 / 6) chars
    assert.strictEqual(token16.length, 22);
    assert.strictEqual(token32.length, 43);
    assert.strictEqual(token64.length, 86);
  });

  it('generates tokens with hex encoding', () => {
    const token = generateSessionToken({ bytes: 32, encoding: 'hex' });
    assert.strictEqual(token.length, 64);
    assert.ok(/^[0-9a-f]{64}$/.test(token));
  });

  it('generates tokens with base64 encoding', () => {
    const token = generateSessionToken({ bytes: 32, encoding: 'base64' });
    assert.strictEqual(token.length, 44); // with padding
    assert.ok(/^[A-Za-z0-9+/]+={0,2}$/.test(token));
  });

  it('generates tokens with prefix', () => {
    const token = generateSessionToken({ prefix: 'sess_' });
    assert.ok(token.startsWith('sess_'));
  });

  it('produces unique tokens', () => {
    const tokens = new Set();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateSessionToken());
    }
    assert.strictEqual(tokens.size, 100);
  });

  it('throws on invalid bytes', () => {
    assert.throws(() => generateSessionToken({ bytes: 8 }), /bytes must be an integer between 16 and 256/);
    assert.throws(() => generateSessionToken({ bytes: 300 }), /bytes must be an integer between 16 and 256/);
    assert.throws(() => generateSessionToken({ bytes: '32' }), /bytes must be an integer between 16 and 256/);
  });

  it('throws on invalid encoding', () => {
    assert.throws(() => generateSessionToken({ encoding: 'invalid' }), /encoding must be one of/);
  });

  it('throws on invalid prefix', () => {
    assert.throws(() => generateSessionToken({ prefix: 123 }), /prefix must be a string/);
  });
});

describe('generateSessionTokens', () => {
  it('generates multiple tokens', () => {
    const tokens = generateSessionTokens(5);
    assert.strictEqual(tokens.length, 5);
    tokens.forEach(t => assert.strictEqual(typeof t, 'string'));
  });

  it('throws on invalid count', () => {
    assert.throws(() => generateSessionTokens(0), /count must be an integer between 1 and 1000/);
    assert.throws(() => generateSessionTokens(1001), /count must be an integer between 1 and 1000/);
    assert.throws(() => generateSessionTokens('5'), /count must be an integer between 1 and 1000/);
  });
});

describe('validateTokenFormat', () => {
  it('validates default base64url tokens', () => {
    const token = generateSessionToken();
    assert.ok(validateTokenFormat(token));
  });

  it('validates hex tokens', () => {
    const token = generateSessionToken({ encoding: 'hex' });
    assert.ok(validateTokenFormat(token, { encoding: 'hex' }));
  });

  it('validates base64 tokens', () => {
    const token = generateSessionToken({ encoding: 'base64' });
    assert.ok(validateTokenFormat(token, { encoding: 'base64' }));
  });

  it('validates prefixed tokens', () => {
    const token = generateSessionToken({ prefix: 'sess_' });
    assert.ok(validateTokenFormat(token, { prefix: 'sess_' }));
  });

  it('rejects mismatched config', () => {
    const token = generateSessionToken({ encoding: 'hex' });
    assert.ok(!validateTokenFormat(token, { encoding: 'base64url' }));
  });

  it('rejects invalid tokens', () => {
    assert.ok(!validateTokenFormat('invalid-token!'));
    assert.ok(!validateTokenFormat(''));
    assert.ok(!validateTokenFormat(null));
    assert.ok(!validateTokenFormat(123));
  });
});

describe('constantTimeCompare', () => {
  it('returns true for identical strings', () => {
    assert.ok(constantTimeCompare('abc', 'abc'));
    assert.ok(constantTimeCompare('', ''));
  });

  it('returns false for different strings', () => {
    assert.ok(!constantTimeCompare('abc', 'abd'));
    assert.ok(!constantTimeCompare('abc', 'abcd'));
    assert.ok(!constantTimeCompare('', 'a'));
  });

  it('returns false for non-strings', () => {
    assert.ok(!constantTimeCompare(null, 'abc'));
    assert.ok(!constantTimeCompare('abc', undefined));
    assert.ok(!constantTimeCompare(123, '123'));
  });
});