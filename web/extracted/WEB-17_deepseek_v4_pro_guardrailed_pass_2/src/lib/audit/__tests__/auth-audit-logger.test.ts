// src/lib/audit/__tests__/auth-audit-logger.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logFailedLoginAttempt } from '../auth-audit-logger';

describe('logFailedLoginAttempt', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it('logs a structured entry with the submitted username', () => {
    logFailedLoginAttempt('alice@example.com', 'invalid_credentials');

    const output = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);

    expect(parsed.event).toBe('auth.login.failed');
    expect(parsed.submittedUsername).toBe('alice@example.com');
    expect(parsed.reason).toBe('invalid_credentials');
    expect(parsed.correlationId).toBeDefined();
    expect(parsed.timestamp).toBeDefined();
  });

  it('strips CRLF characters from the submitted username', () => {
    logFailedLoginAttempt('evil\r\nuser\ninjected', 'invalid_credentials');

    const output = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);

    expect(parsed.submittedUsername).toBe('eviluserinjected');
    expect(parsed.submittedUsername).not.toContain('\r');
    expect(parsed.submittedUsername).not.toContain('\n');
  });

  it('strips ANSI escape sequences from the submitted username', () => {
    logFailedLoginAttempt('user\x1B[31mRED\x1B[0m', 'invalid_credentials');

    const output = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);

    expect(parsed.submittedUsername).toBe('userRED');
    expect(parsed.submittedUsername).not.toContain('\x1B');
  });

  it('truncates overly long usernames', () => {
    const longUsername = 'a'.repeat(1000);
    logFailedLoginAttempt(longUsername, 'invalid_credentials');

    const output = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);

    expect(parsed.submittedUsername.length).toBeLessThanOrEqual(254);
  });

  it('never logs passwords or tokens', () => {
    logFailedLoginAttempt('alice@example.com', 'invalid_credentials', {
      sourceIp: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    });

    const output = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);

    expect(parsed).not.toHaveProperty('password');
    expect(parsed).not.toHaveProperty('passwordHash');
    expect(parsed).not.toHaveProperty('token');
    expect(parsed).not.toHaveProperty('secret');
  });

  it('redacts sensitive keys even if present in the entry', () => {
    // Simulate a developer accidentally including a password field
    const maliciousEntry = {
      event: 'auth.login.failed',
      timestamp: new Date().toISOString(),
      correlationId: 'test-id',
      submittedUsername: 'alice@example.com',
      reason: 'invalid_credentials' as const,
      password: 'should-be-redacted',
    };

    // Direct logger test to verify redaction
    const { logger } = await import('../logging/logger');
    logger.info(maliciousEntry as unknown as Record<string, unknown>);

    const output = stdoutSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);

    expect(parsed.password).toBe('[REDACTED]');
  });
});