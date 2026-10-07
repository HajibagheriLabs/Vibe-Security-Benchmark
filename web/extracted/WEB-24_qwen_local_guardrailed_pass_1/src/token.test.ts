import { SessionTokenGenerator } from './token';
import { config } from './config';

jest.mock('./config', () => ({
  SESSION_SECRET_KEY: 'a'.repeat(32),
  SESSION_EXPIRY_MS: 3600000, // 1 hour
}));

describe('SessionTokenGenerator', () => {
  const generator = new SessionTokenGenerator();

  test('generates a token with correct structure', () => {
    const token = generator.generate();
    expect(token.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(token.secret).toMatch(/^[0-9a-f]{64}$/); // 32 bytes hex
    expect(token.expiresAt).toBeInstanceOf(Date);
    expect(token.createdAt).toBeInstanceOf(Date);
  });

  test('verifies a correct secret', () => {
    const token = generator.generate();
    const isValid = generator.verify(token.id, token.secret, token.secret);
    expect(isValid).toBe(true);
  });

  test('rejects an incorrect secret', () => {
    const token = generator.generate();
    const isValid = generator.verify(token.id, 'incorrect', token.secret);
    expect(isValid).toBe(false);
  });

  test('encodes and decodes correctly', () => {
    const token = generator.generate();
    const encoded = generator.encode(token);
    const decoded = generator.decode(encoded);
    expect(decoded.id).toBe(token.id);
    expect(decoded.secret).toBe(token.secret);
  });

  test('rejects invalid encoded format', () => {
    expect(() => generator.decode('invalid')).toThrow('Invalid token format');
  });
});