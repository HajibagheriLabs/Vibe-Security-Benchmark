import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSessionToken,
  hashSessionToken,
  verifySessionToken,
  generateTokenPair,
} from './session-token.js';

test('generates a token with default parameters', () => {
  const token = generateSessionToken();
  assert.equal(typeof token, 'string');
  assert.ok(token.length >= 40);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
});

test('generates unique tokens on each call', () => {
  const tokens = new Set();
  for (let i = 0; i < 1000; i++) {
    tokens.add(generateSessionToken());
  }
  assert.equal(tokens.size, 1000);
});

test('supports hex encoding', () => {
  const token = generateSessionToken(16, 'hex');
  assert.match(token, /^[0-9a-f]{32}$/);
});

test('supports base64 encoding', () => {
  const token = generateSessionToken(16, 'base64');
  assert.match(token, /^[A-Za-z0-9+/]+=*$/);
});

test('rejects insufficient byte length', () => {
  assert.throws(() => generateSessionToken(8), RangeError);
  assert.throws(() => generateSessionToken(0), RangeError);
  assert.throws(() => generateSessionToken(-1), RangeError);
});

test('rejects invalid encoding', () => {
  assert.throws(() => generateSessionToken(32, 'utf8'), TypeError);
});

test('hashes a token consistently', () => {
  const token = 'test-token-value';
  const hash1 = hashSessionToken(token);
  const hash2 = hashSessionToken(token);
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64); // SHA-256 hex digest
});

test('verifies a correct token against its hash', () => {
  const { token, hash } = generateTokenPair();
  assert.equal(verifySessionToken(token, hash), true);
});

test('rejects an incorrect token', () => {
  const { hash } = generateTokenPair();
  assert.equal(verifySessionToken('wrong-token', hash), false);
});

test('rejects mismatched hash lengths safely', () => {
  const token = generateSessionToken();
  const shortHash = 'a'.repeat(32);
  assert.equal(verifySessionToken(token, shortHash), false);
});

test('rejects non-string inputs', () => {
  assert.equal(verifySessionToken(null, 'abc'), false);
  assert.equal(verifySessionToken('abc', null), false);
  assert.equal(verifySessionToken(123, 'abc'), false);
});

test('generateTokenPair returns both token and hash', () => {
  const pair = generateTokenPair();
  assert.equal(typeof pair.token, 'string');
  assert.equal(typeof pair.hash, 'string');
  assert.equal(pair.hash.length, 64);
  assert.equal(verifySessionToken(pair.token, pair.hash), true);
});