// test-session-token.js
'use strict';

const assert = require('assert');
const { SessionTokenGenerator, generateSessionToken } = require('./session-token');

// Test 1: Default token generation
console.log('Test 1: Default token generation');
const defaultGenerator = new SessionTokenGenerator();
const token1 = defaultGenerator.generateToken();
assert.strictEqual(typeof token1, 'string');
assert.ok(token1.length > 0);
assert.strictEqual(defaultGenerator.getEntropyBits(), 256);
console.log(`  Generated token (${defaultGenerator.getEntropyBits()} bits): ${token1.substring(0, 20)}...`);

// Test 2: Custom byte length
console.log('Test 2: Custom byte length');
const customGenerator = new SessionTokenGenerator({ byteLength: 64 });
const token2 = customGenerator.generateToken();
assert.strictEqual(customGenerator.getEntropyBits(), 512);
assert.ok(customGenerator.validateTokenFormat(token2));
console.log(`  Generated token (${customGenerator.getEntropyBits()} bits): ${token2.substring(0, 20)}...`);

// Test 3: Different encodings
console.log('Test 3: Different encodings');
const hexGenerator = new SessionTokenGenerator({ encoding: 'hex' });
const hexToken = hexGenerator.generateToken();
assert.ok(hexGenerator.validateTokenFormat(hexToken));
assert.strictEqual(hexToken.length, 64); // 32 bytes * 2 hex chars
console.log(`  Hex token: ${hexToken.substring(0, 20)}...`);

const base64Generator = new SessionTokenGenerator({ encoding: 'base64' });
const base64Token = base64Generator.generateToken();
assert.ok(base64Generator.validateTokenFormat(base64Token));
console.log(`  Base64 token: ${base64Token.substring(0, 20)}...`);

// Test 4: Token uniqueness
console.log('Test 4: Token uniqueness');
const tokens = defaultGenerator.generateTokens(1000);
assert.strictEqual(tokens.length, 1000);
const uniqueTokens = new Set(tokens);
assert.strictEqual(uniqueTokens.size, 1000);
console.log('  Generated 1000 unique tokens');

// Test 5: Token format validation
console.log('Test 5: Token format validation');
assert.ok(defaultGenerator.validateTokenFormat(token1));
assert.ok(!defaultGenerator.validateTokenFormat('invalid token with spaces'));
assert.ok(!defaultGenerator.validateTokenFormat(''));
assert.ok(!defaultGenerator.validateTokenFormat(null));
console.log('  Format validation working correctly');

// Test 6: Convenience function
console.log('Test 6: Convenience function');
const quickToken = generateSessionToken();
assert.ok(typeof quickToken === 'string');
assert.ok(quickToken.length > 0);
console.log(`  Quick token: ${quickToken.substring(0, 20)}...`);

// Test 7: Security validation
console.log('Test 7: Security validation');
assert.throws(() => new SessionTokenGenerator({ byteLength: 8 }), /at least 16 bytes/);
assert.throws(() => new SessionTokenGenerator({ encoding: 'invalid' }), /Invalid encoding/);
console.log('  Security validations working correctly');

console.log('\n✅ All tests passed successfully!');
console.log(`Generated tokens provide ${defaultGenerator.getEntropyBits()} bits of entropy (recommended minimum: 128 bits)`);