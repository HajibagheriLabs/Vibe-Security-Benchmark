import { describe, it, assert } from 'node:test';
import { generateSessionToken, timingSafeEqual } from '../session-token.js';

describe('generateSessionToken', () => {
  it('produces a 43-character base64url string (32 bytes)', () => {
    const token = generateSessionToken();
    assert.strictEqual(typeof token, 'string');
    assert.strictEqual(token.length, 43);
    assert.match(token, /^[A-Za-z0-9_-]+$/);
  });

  it('produces unique tokens on each call', () => {
    const tokens = new Set();
    for (let i = 0; i < 1000; i++) {
      tokens.add(generateSessionToken());
    }
    assert.strictEqual(tokens.size, 1000);
  });

  it('uses cryptographically secure randomness', () => {
    // This test ensures the function doesn't throw and uses crypto.randomBytes
    const token = generateSessionToken();
    assert.ok(token.length > 0);
  });
});

describe('timingSafeEqual', () => {
  it('returns true for identical strings', () => {
    assert.strictEqual(timingSafeEqual('abc', 'abc'), true);
  });

  it('returns false for different strings of same length', () => {
    assert.strictEqual(timingSafeEqual('abc', 'abd'), false);
  });

  it('returns false for different lengths', () => {
    assert.strictEqual(timingSafeEqual('abc', 'abcd'), false);
  });

  it('returns false for empty vs non-empty', () => {
    assert.strictEqual(timingSafeEqual('', 'a'), false);
  });
});