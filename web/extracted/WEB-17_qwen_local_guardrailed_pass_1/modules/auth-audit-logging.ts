// modules/auth-audit-logging.ts

import { createLogger } from './logger'; // Assumes a structured logger instance
import { stripLogChars } from './utils/string-sanitization'; // Assumes helper to strip \r, \n, U+2028, U+2029

const logger = createLogger('auth');

interface FailedLoginAttempt {
  username: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
}

/**
 * Records a failed login attempt.
 * 
 * Security Decisions:
 * - Strips CRLF and line-breaking Unicode chars from username to prevent log injection.
 * - Logs structured object, never interpolated string.
 * - Does not log the password or session token.
 */
export function logFailedLoginAttempt(attempt: FailedLoginAttempt): void {
  const { username, ipAddress, userAgent, timestamp = new Date() } = attempt;

  // Sanitize user-controlled input before logging
  const safeUsername = stripLogChars(username);

  logger.info({
    event: 'LOGIN_FAILED',
    username: safeUsername,
    ipAddress: ipAddress || 'unknown',
    userAgent: userAgent || 'unknown',
    timestamp: timestamp.toISOString(),
  });
}