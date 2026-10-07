import pino from 'pino';

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  '*.password',
  '*.token',
  '*.apiKey',
  '*.secret',
];

export function createLogger(name: string) {
  return pino({
    name,
    level: process.env.LOG_LEVEL || 'info',
    redact: {
      paths: redactPaths,
      censor: '[REDACTED]',
    },
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
  });
}

export const logger = createLogger('app');