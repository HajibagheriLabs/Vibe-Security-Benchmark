import { generateToken, hashToken } from '../generateToken';

describe('generateToken', () => {
  it('generates a token of correct length', () => {
    const token = generateToken(32);
    expect(token).toHaveLength(64); // 32 bytes * 2 hex chars/byte
    expect(token).toMatch(/^[a-f0-9]+$/);
  });

  it('generates unique tokens', () => {
    const token1 = generateToken();
    const token2 = generateToken();
    expect(token1).not.toBe(token2);
  });

  it('throws on invalid length', () => {
    expect(() => generateToken(0)).toThrow('Token length must be a positive integer');
    expect(() => generateToken(-1)).toThrow('Token length must be a positive integer');
  });
});

describe('hashToken', () => {
  it('generates a consistent hash', () => {
    const token = generateToken();
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
  });

  it('generates SHA-256 hash', () => {
    const token = 'test-token';
    const hash = hashToken(token);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });
});