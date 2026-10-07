// src/lib/logging/logger.ts

/**
 * Structured logger with allowlist-based redaction.
 * Security-relevant decision: redaction is configured at the logger level
 * so sensitive fields are stripped even if a developer forgets to sanitize.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  redactKeys: string[];
  minLevel: LogLevel;
}

const DEFAULT_REDACT_KEYS = [
  'authorization',
  'cookie',
  'password',
  'token',
  'apiKey',
  'secret',
  '*.password',
  '*.token',
  '*.apiKey',
  '*.secret',
];

const REDACTED_VALUE = '[REDACTED]';

function isRedactableKey(key: string, redactKeys: string[]): boolean {
  const lowerKey = key.toLowerCase();
  return redactKeys.some((pattern) => {
    const normalized = pattern.toLowerCase();
    if (normalized.startsWith('*.')) {
      return lowerKey.endsWith(normalized.slice(1));
    }
    return lowerKey === normalized || lowerKey.includes(normalized);
  });
}

function deepRedact(value: unknown, redactKeys: string[], depth = 0): unknown {
  if (depth > 10) return REDACTED_VALUE;

  if (Array.isArray(value)) {
    return value.map((item) => deepRedact(item, redactKeys, depth + 1));
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (isRedactableKey(key, redactKeys)) {
        result[key] = REDACTED_VALUE;
      } else {
        result[key] = deepRedact(val, redactKeys, depth + 1);
      }
    }
    return result;
  }

  return value;
}

class StructuredLogger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      redactKeys: [...DEFAULT_REDACT_KEYS, ...(config?.redactKeys ?? [])],
      minLevel: config?.minLevel ?? 'info',
    };
  }

  private emit(level: LogLevel, data: Record<string, unknown>): void {
    if (this.shouldLog(level)) {
      const redacted = deepRedact(data, this.config.redactKeys) as Record<
        string,
        unknown
      >;
      // In production this would write to a structured sink (JSON lines,
      // pino, winston, etc.). Never use console.log with string interpolation
      // of user data.
      process.stdout.write(
        JSON.stringify({ level, ...redacted, _redacted: true }) + '\n'
      );
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.config.minLevel);
  }

  debug(data: Record<string, unknown>): void {
    this.emit('debug', data);
  }

  info(data: Record<string, unknown>): void {
    this.emit('info', data);
  }

  warn(data: Record<string, unknown>): void {
    this.emit('warn', data);
  }

  error(data: Record<string, unknown>): void {
    this.emit('error', data);
  }
}

export const logger = new StructuredLogger();