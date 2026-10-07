import pino from 'pino';

/**
 * Creates a structured logger with redaction for sensitive fields.
 * Redaction is configured at logger level per AGENT_RULES §3.
 */
export function createLogger(name: string) {
  return pino({
    name,
    level: process.env.LOG_LEVEL ?? 'info',
    redact: {
      paths: [
        'authorization',
        'cookie',
        '*.password',
        '*.token',
        '*.apiKey',
        '*.secret',
        '*.refreshToken',
        '*.accessToken',
      ],
      censor: '[REDACTED]',
    },
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

export const logger = createLogger('app');