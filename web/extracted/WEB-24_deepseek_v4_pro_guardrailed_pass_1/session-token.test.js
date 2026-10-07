// session-token.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  generateSessionToken, 
  generatePrefixedSessionToken,
  safeTokenCompare,
  hashSessionToken 
} from './session-token.js';

test('generateSessionToken generates unique tokens', () => {
  const token1 = generateSessionToken();
  const token2 = generateSessionToken();
  
  assert.notEqual(token1, token2);
  assert.equal(typeof token1, 'string');
  assert.ok(token1.length >= 43); // 32 bytes base64url encoded
});

test('generateSessionToken validates byteLength parameter', () => {
  assert.throws(() => generateSessionToken(8), RangeError);
  assert.throws(() => generateSessionToken(1024), RangeError);
  assert.throws(() => generateSessionToken('32'), RangeError);
  assert.throws(() => generateSessionToken(32.5), RangeError);
});

test('generateSessionToken produces base64url-safe characters', () => {
  const token = generateSessionToken();
  assert.match(token, /^[A-Za-z0-9_-]+$/);
});

test('generatePrefixedSessionToken adds prefix correctly', () => {
  const token = generatePrefixedSessionToken('sess_');
  assert.ok(token.startsWith('sess_'));
  assert.match(token.slice(5), /^[A-Za-z0-9_-]+$/);
});

test('generatePrefixedSessionToken validates prefix', () => {
  assert.throws(() => generatePrefixedSessionToken(''), TypeError);
  assert.throws(() => generatePrefixedSessionToken('bad prefix!'), TypeError);
  assert.throws(() => generatePrefixedSessionToken(null), TypeError);
});

test('safeTokenCompare returns true for matching tokens', () => {
  const token = generateSessionToken();
  assert.equal(safeTokenCompare(token, token), true);
});

test('safeTokenCompare returns false for non-matching tokens', () => {
  const token1 = generateSessionToken();
  const token2 = generateSessionToken();
  assert.equal(safeTokenCompare(token1, token2), false);
});

test('safeTokenCompare validates input types', () => {
  assert.throws(() => safeTokenCompare(null, 'test'), TypeError);
  assert.throws(() => safeTokenCompare('test', undefined), TypeError);
});

test('hashSessionToken produces consistent hashes', () => {
  const token = generateSessionToken();
  const hash1 = hashSessionToken(token);
  const hash2 = hashSessionToken(token);
  
  assert.equal(hash1, hash2);
  assert.match(hash1, /^[a-f0-9]{64}$/); // SHA-256 hex output
});

test('hashSessionToken validates input', () => {
  assert.throws(() => hashSessionToken(''), TypeError);
  assert.throws(() => hashSessionToken(null), TypeError);
});