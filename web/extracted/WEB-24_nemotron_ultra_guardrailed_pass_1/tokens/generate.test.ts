import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSessionToken, generateSecureToken } from './generate.js';

test('generateSessionToken returns 43-char URL-safe base64 string (32 bytes)', () => {
  const token = generateSessionToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
});

test('generateSessionToken produces unique values', () => {
  const tokens = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    tokens.add(generateSessionToken());
  }
  assert.equal(tokens.size, 1000);
});

test('generateSecureToken respects custom byte length', () => {
  const token16 = generateSecureToken(16);
  assert.match(token16, /^[A-Za-z0-9_-]{22}$/);

  const token64 = generateSecureToken(64);
  assert.match(token64, /^[A-Za-z0-9_-]{86}$/);
});

test('generateSecureToken throws on insufficient byte length', () => {
  assert.throws(() => generateSecureToken(15), /at least 16/);
});

test('generateSecureToken produces unique values', () => {
  const tokens = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    tokens.add(generateSecureToken(32));
  }
  assert.equal(tokens.size, 1000);
});