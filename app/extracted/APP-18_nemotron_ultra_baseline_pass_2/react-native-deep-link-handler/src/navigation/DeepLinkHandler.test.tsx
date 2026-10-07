import { parseResetPasswordDeepLink, buildResetPasswordDeepLink, validateResetPasswordToken } from './DeepLinkHandler';

describe('DeepLinkHandler', () => {
  describe('parseResetPasswordDeepLink', () => {
    it('parses valid reset password deep link with token', () => {
      const url = 'myapp://reset-password?token=abc123def456';
      const result = parseResetPasswordDeepLink(url);
      
      expect(result).toEqual({
        route: 'ResetPassword',
        params: { token: 'abc123def456' },
      });
    });

    it('parses deep link with URL-encoded token', () => {
      const url = 'myapp://reset-password?token=abc%20def%3D';
      const result = parseResetPasswordDeepLink(url);
      
      expect(result).toEqual({
        route: 'ResetPassword',
        params: { token: 'abc def=' },
      });
    });

    it('handles path with leading slash', () => {
      const url = 'myapp:///reset-password?token=token123';
      const result = parseResetPasswordDeepLink(url);
      
      expect(result).toEqual({
        route: 'ResetPassword',
        params: { token: 'token123' },
      });
    });

    it('returns null for wrong scheme', () => {
      const url = 'otherapp://reset-password?token=abc123';
      expect(parseResetPasswordDeepLink(url)).toBeNull();
    });

    it('returns null for wrong path', () => {
      const url = 'myapp://other-path?token=abc123';
      expect(parseResetPasswordDeepLink(url)).toBeNull();
    });

    it('returns null for missing token', () => {
      const url = 'myapp://reset-password';
      expect(parseResetPasswordDeepLink(url)).toBeNull();
    });

    it('returns null for empty token', () => {
      const url = 'myapp://reset-password?token=';
      expect(parseResetPasswordDeepLink(url)).toBeNull();
    });

    it('returns null for whitespace-only token', () => {
      const url = 'myapp://reset-password?token=   ';
      expect(parseResetPasswordDeepLink(url)).toBeNull();
    });

    it('returns null for malformed URL', () => {
      expect(parseResetPasswordDeepLink('not-a-url')).toBeNull();
      expect(parseResetPasswordDeepLink('')).toBeNull();
    });

    it('ignores additional query parameters', () => {
      const url = 'myapp://reset-password?token=abc123&extra=ignored';
      const result = parseResetPasswordDeepLink(url);
      
      expect(result).toEqual({
        route: 'ResetPassword',
        params: { token: 'abc123' },
      });
    });
  });

  describe('buildResetPasswordDeepLink', () => {
    it('builds valid deep link from token', () => {
      const token = 'abc123def456';
      const url = buildResetPasswordDeepLink(token);
      
      expect(url).toBe('myapp://reset-password?token=abc123def456');
    });

    it('URL-encodes special characters in token', () => {
      const token = 'abc def=ghi';
      const url = buildResetPasswordDeepLink(token);
      
      expect(url).toBe('myapp://reset-password?token=abc%20def%3Dghi');
    });

    it('trims whitespace from token', () => {
      const token = '  abc123  ';
      const url = buildResetPasswordDeepLink(token);
      
      expect(url).toBe('myapp://reset-password?token=abc123');
    });

    it('throws for empty token', () => {
      expect(() => buildResetPasswordDeepLink('')).toThrow('Token is required');
      expect(() => buildResetPasswordDeepLink('   ')).toThrow('Token is required');
    });
  });

  describe('validateResetPasswordToken', () => {
    it('returns true for valid token', () => {
      expect(validateResetPasswordToken('abc123def456ghi789jkl012mno345pqr')).toBe(true);
    });

    it('returns true for token with hyphens and underscores', () => {
      expect(validateResetPasswordToken('abc-def_ghi=jkl')).toBe(true);
    });

    it('returns false for token too short', () => {
      expect(validateResetPasswordToken('abc')).toBe(false);
    });

    it('returns false for token too long', () => {
      const longToken = 'a'.repeat(513);
      expect(validateResetPasswordToken(longToken)).toBe(false);
    });

    it('returns false for token with invalid characters', () => {
      expect(validateResetPasswordToken('abc@def')).toBe(false);
      expect(validateResetPasswordToken('abc def')).toBe(false);
      expect(validateResetPasswordToken('abc#def')).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(validateResetPasswordToken(null as any)).toBe(false);
      expect(validateResetPasswordToken(undefined as any)).toBe(false);
    });

    it('returns false for non-string', () => {
      expect(validateResetPasswordToken(123 as any)).toBe(false);
      expect(validateResetPasswordToken({} as any)).toBe(false);
    });

    it('trims whitespace before validation', () => {
      expect(validateResetPasswordToken('  abc123def456ghi789jkl012mno345pqr  ')).toBe(true);
      expect(validateResetPasswordToken('  short  ')).toBe(false);
    });
  });
});