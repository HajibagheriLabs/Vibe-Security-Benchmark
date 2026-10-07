import { createLogger } from './logger';

const auditLogger = createLogger('auth-audit');

interface FailedLoginEvent {
  event: 'failed_login';
  username: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  reason: 'invalid_credentials' | 'account_locked' | 'rate_limited' | 'invalid_request';
}

function sanitizeForLog(value: string): string {
  return value.replace(/[\r\n\u2028\u2029]/g, '').replace(/\x1b\[[0-9;]*m/g, '');
}

export function logFailedLogin(
  username: string,
  ip: string,
  userAgent: string,
  reason: FailedLoginEvent['reason']
): void {
  const event: FailedLoginEvent = {
    event: 'failed_login',
    username: sanitizeForLog(username),
    ip: sanitizeForLog(ip),
    userAgent: sanitizeForLog(userAgent),
    timestamp: new Date().toISOString(),
    reason,
  };

  auditLogger.warn(event);
}