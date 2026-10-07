import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSessionToken,
  generateUuidToken,
  hashSessionToken,
  verifySessionToken,
  generateTokenWithAlphabet
} from './session-token.js';

test('generateSessionToken returns a hex token of expected length', () => {
  const token = generateSessionToken();
  assert.equal(typeof token, 'string');
  assert.equal(token.length, 64); // 32 bytes * 2 hex chars
  assert.match(token, /^[0-9a-f]{64}$/);
});

test('generateSessionToken with base64 encoding', () => {
  const token = generateSessionToken({ encoding: 'base64' });
  assert.equal(typeof token, 'string');
  assert.match(token, /^[A-Za-z0-9+/]+=*$/);
});

test('generateSessionToken with base64url encoding', () => {
  const token = generateSessionToken({ encoding: 'base64url' });
  assert.equal(typeof token, 'string');
  assert.match(token, /^[A-Za-z0-9_-]+$/);
});

test('generateSessionToken with prefix', () => {
  const token = generateSessionToken({ prefix: 'sess' });
  assert.match(token, /^sess_[0-9a-f]{64}$/);
});

test('generateSessionToken rejects insecure byte lengths', () => {
  assert.throws(() => generateSessionToken({ byteLength: 8 }), /at least 16/);
  assert.throws(() => generateSessionToken({ byteLength: '32' }), /integer/);
});

test('generateSessionToken rejects invalid encoding', () => {
  assert.throws(() => generateSessionToken({ encoding: 'utf8' }), /encoding/);
});

test('generateUuidToken returns a valid UUID v4', () => {
  const token = generateUuidToken();
  assert.match(token, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('generateUuidToken with prefix', () => {
  const token = generateUuidToken({ prefix: 'sess' });
  assert.match(token, /^sess_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('hashSessionToken produces a 64-character hex SHA-256 hash', () => {
  const token = generateSessionToken();
  const hash = hashSessionToken(token);
  assert.equal(hash.length, 64);
  assert.match(hash, /^[0-9a-f]{64}$/);
});

test('hashSessionToken with different algorithm', () => {
  const token = generateSessionToken();
  const hash = hashSessionToken(token, 'sha512');
  assert.equal(hash.length, 128);
  assert.match(hash, /^[0-9a-f]{128}$/);
});

test('hashSessionToken rejects empty token', () => {
  assert.throws(() => hashSessionToken(''), /non-empty/);
  assert.throws(() => hashSessionToken(null), /non-empty/);
});

test('verifySessionToken returns true for matching token', () => {
  const token = generateSessionToken();
  const hash = hashSessionToken(token);
  assert.equal(verifySessionToken(token, hash), true);
});

test('verifySessionToken returns false for non-matching token', () => {
  const token = generateSessionToken();
  const hash = hashSessionToken(token);
  const wrongToken = generateSessionToken();
  assert.equal(verifySessionToken(wrongToken, hash), false);
});

test('verifySessionToken returns false for invalid inputs', () => {
  assert.equal(verifySessionToken('', 'abc'), false);
  assert.equal(verifySessionToken(null, 'abc'), false);
  assert.equal(verifySessionToken('abc', null), false);
  assert.equal(verifySessionToken('abc', 'not-a-valid-hex-hash'), false);
});

test('generateTokenWithAlphabet returns token with only allowed characters', () => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // Base32 alphabet
  const token = generateTokenWithAlphabet({ length: 32, alphabet });
  assert.equal(token.length, 32);
  for (const char of token) {
    assert.ok(alphabet.includes(char), `Character '${char}' not in alphabet`);
  }
});

test('generateTokenWithAlphabet with prefix', () => {
  const token = generateTokenWithAlphabet({ length: 24, prefix: 'sess' });
  assert.match(token, /^sess_[A-Za-z0-9]{24}$/);
});

test('generateTokenWithAlphabet rejects invalid inputs', () => {
  assert.throws(() => generateTokenWithAlphabet({ length: 8 }), /at least 16/);
  assert.throws(() => generateTokenWithAlphabet({ alphabet: 'abc' }), /at least 16/);
  assert.throws(() => generateTokenWithAlphabet({ alphabet: 'aabbccddeeffgghh' }), /duplicate/);
});

test('generated tokens are unique', () => {
  const tokens = new Set();
  for (let i = 0; i < 1000; i++) {
    tokens.add(generateSessionToken());
  }
  assert.equal(tokens.size, 1000);
});