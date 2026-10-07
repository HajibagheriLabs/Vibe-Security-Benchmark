// src/lib/audit/auth-audit-logger.ts

import { randomUUID } from 'node:crypto';
import { logger } from '../logging/logger';

/**
 * Security-relevant decision: failed login attempts are logged with the
 * submitted username, but the username is sanitized (CRLF/ANSI stripped)
 * before it reaches the log sink to prevent log injection.
 */

const MAX_USERNAME_LENGTH = 254; // RFC 5321 max email length
const CONTROL_CHAR_PATTERN = /[\r\n\u2028\u2029\u001B\u009B]/g;
const ANSI_ESCAPE_PATTERN = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

export interface FailedLoginAuditEntry {
  event: 'auth.login.failed';
  timestamp: string;
  correlationId: string;
  submittedUsername: string;
  reason: 'invalid_credentials' | 'account_locked' | 'account_disabled' | 'rate_limited';
  sourceIp?: string;
  userAgent?: string;
}

/**
 * Sanitizes a user-controlled value before it reaches any log sink.
 * Strips CR, LF, Unicode line/paragraph separators, and ANSI escape sequences.
 * Truncates to a safe maximum length to prevent log flooding.
 */
function sanitizeLogValue(value: string, maxLength: number): string {
  return value
    .replace(ANSI_ESCAPE_PATTERN, '')
    .replace(CONTROL_CHAR_PATTERN, '')
    .slice(0, maxLength);
}

/**
 * Records a failed login attempt to the audit log.
 *
 * @param submittedUsername - The username as submitted by the client.
 *   This is user-controlled input and is sanitized before logging.
 * @param reason - Why the login failed. Never log the actual password
 *   or password hash.
 * @param metadata - Optional request metadata (IP, user agent). These are
 *   also sanitized since they can be spoofed by the client.
 */
export function logFailedLoginAttempt(
  submittedUsername: string,
  reason: FailedLoginAuditEntry['reason'],
  metadata?: { sourceIp?: string; userAgent?: string }
): void {
  const entry: FailedLoginAuditEntry = {
    event: 'auth.login.failed',
    timestamp: new Date().toISOString(),
    correlationId: randomUUID(),
    submittedUsername: sanitizeLogValue(submittedUsername, MAX_USERNAME_LENGTH),
    reason,
    ...(metadata?.sourceIp
      ? { sourceIp: sanitizeLogValue(metadata.sourceIp, 45) }
      : {}),
    ...(metadata?.userAgent
      ? { userAgent: sanitizeLogValue(metadata.userAgent, 512) }
      : {}),
  };

  // Structured logging — never interpolated into a sentence.
  logger.info(entry);
}