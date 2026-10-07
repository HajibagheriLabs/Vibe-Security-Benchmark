// src/lib/audit/auth-audit-logger.ts

import { createHash, randomUUID } from "node:crypto";
import { logger } from "../logging/logger";

/**
 * Security-relevant decisions:
 * - Usernames are PII and log-injection vectors; they are CRLF/ANSI-stripped,
 *   then hashed with a per-process random salt before being emitted as a
 *   structured log field. The raw value is never logged.
 * - All fields are emitted as structured object properties, never interpolated
 *   into a message string.
 * - No credentials, tokens, or request headers are included.
 */

const USERNAME_LOG_SALT = randomUUID();

type FailedLoginContext = {
  /** Server-verified request metadata only; never client-supplied identity claims. */
  ipAddress?: string;
  userAgent?: string;
  reason: "invalid_credentials" | "account_locked" | "rate_limited" | "unknown_user";
  attemptNumber?: number;
};

function sanitizeLogValue(value: string): string {
  // Strip CR, LF, Unicode line/paragraph separators, and ANSI escape sequences.
  return value
    .replace(/[\r\n\u2028\u2029]/g, "")
    // eslint-disable-next-line no-control-regex
    .replace(/\u001B\[[0-9;]*[A-Za-z]/g, "")
    .slice(0, 256);
}

function hashUsername(username: string): string {
  const sanitized = sanitizeLogValue(username);
  return createHash("sha256")
    .update(USERNAME_LOG_SALT)
    .update(sanitized)
    .digest("hex");
}

/**
 * Records a failed login attempt for audit purposes.
 *
 * The submitted username is never stored or logged in plaintext. A salted
 * SHA-256 digest is emitted so security teams can correlate repeated attempts
 * against the same account without exposing the identifier in logs.
 */
export function logFailedLoginAttempt(
  submittedUsername: string,
  context: FailedLoginContext,
): void {
  const usernameDigest = hashUsername(submittedUsername);

  logger.warn({
    event: "auth.login_failed",
    usernameDigest,
    reason: context.reason,
    ipAddress: context.ipAddress ? sanitizeLogValue(context.ipAddress) : undefined,
    userAgent: context.userAgent ? sanitizeLogValue(context.userAgent) : undefined,
    attemptNumber: context.attemptNumber,
    timestamp: new Date().toISOString(),
    correlationId: randomUUID(),
  });
}