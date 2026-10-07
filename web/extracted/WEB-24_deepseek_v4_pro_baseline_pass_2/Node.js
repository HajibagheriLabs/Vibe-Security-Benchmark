# Secure Session Token Utility

A zero-dependency Node.js utility for generating cryptographically secure session tokens.

## Features

- **Multiple token formats**: hex, base64, base64url, UUID v4, and custom alphabet
- **Cryptographically secure**: Uses Node.js `crypto.randomBytes()` and `crypto.randomUUID()`
- **Token hashing**: SHA-256 (or other algorithms) for secure storage
- **Constant-time verification**: Uses `crypto.timingSafeEqual()` to prevent timing attacks
- **Zero external dependencies**: Uses only Node.js built-in `crypto` module
- **ESM support**: Works with `import` syntax

## Installation

No external dependencies required. Just copy the files into your project.

Requires Node.js 16 or later.

## Usage

```javascript
import {
  generateSessionToken,
  generateUuidToken,
  hashSessionToken,
  verifySessionToken,
  generateTokenWithAlphabet
} from './session-token.js';

// Generate a hex token (64 characters, 256 bits of entropy)
const token = generateSessionToken();

// Generate a base64url token
const base64Token = generateSessionToken({ encoding: 'base64url' });

// Generate a UUID v4 token
const uuidToken = generateUuidToken();

// Generate a token with a custom alphabet (e.g., base32)
const base32Token = generateTokenWithAlphabet({
  length: 32,
  alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
});

// Hash a token for storage
const tokenHash = hashSessionToken(token);

// Verify a token against a stored hash (constant-time)
const isValid = verifySessionToken(token, tokenHash);