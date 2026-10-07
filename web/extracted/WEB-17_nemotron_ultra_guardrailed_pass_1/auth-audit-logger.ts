import { createLogger } from './logger';

const logger = createLogger('auth-audit');

/**
 * Records a failed login attempt for audit purposes.
 * Username is sanitized to prevent log injection (CRLF/ANSI stripping).
 * Logs are structured for SIEM ingestion.
 */
export function logFailedLoginAttempt(
  username: string,
  metadata: {
    ip?: string;
    userAgent?: string;
    reason: 'invalid_credentials' | 'account_locked' | 'mfa_failed' | 'rate_limited';
    timestamp?: Date;
  }
): void {
  const sanitizedUsername = sanitizeForLog(username);
  const sanitizedIp = metadata.ip ? sanitizeForLog(metadata.ip) : undefined;
  const sanitizedUserAgent = metadata.userAgent ? sanitizeForLog(metadata.userAgent) : undefined;

  logger.warn({
    event: 'auth.login.failed',
    username: sanitizedUsername,
    ip: sanitizedIp,
    userAgent: sanitizedUserAgent,
    reason: metadata.reason,
    timestamp: metadata.timestamp?.toISOString() ?? new Date().toISOString(),
  });
}

/**
 * Records a successful login for audit trail.
 */
export function logSuccessfulLogin(
  userId: string,
  metadata: {
    ip?: string;
    userAgent?: string;
    mfaUsed: boolean;
    timestamp?: Date;
  }
): void {
  const sanitizedIp = metadata.ip ? sanitizeForLog(metadata.ip) : undefined;
  const sanitizedUserAgent = metadata.userAgent ? sanitizeForLog(metadata.userAgent) : undefined;

  logger.info({
    event: 'auth.login.success',
    userId,
    ip: sanitizedIp,
    userAgent: sanitizedUserAgent,
    mfaUsed: metadata.mfaUsed,
    timestamp: metadata.timestamp?.toISOString() ?? new Date().toISOString(),
  });
}

/**
 * Records account lockout events.
 */
export function logAccountLocked(
  username: string,
  metadata: {
    ip?: string;
    lockoutDurationMs: number;
    timestamp?: Date;
  }
): void {
  const sanitizedUsername = sanitizeForLog(username);
  const sanitizedIp = metadata.ip ? sanitizeForLog(metadata.ip) : undefined;

  logger.warn({
    event: 'auth.account.locked',
    username: sanitizedUsername,
    ip: sanitizedIp,
    lockoutDurationMs: metadata.lockoutDurationMs,
    timestamp: metadata.timestamp?.toISOString() ?? new Date().toISOString(),
  });
}

/**
 * Strips CRLF, Unicode line/paragraph separators, and ANSI escape sequences
 * to prevent log injection attacks.
 */
function sanitizeForLog(input: string): string {
  return input
    .replace(/[\r\n\u2028\u2029]/g, '')
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
    .slice(0, 256); // Reasonable length limit
}