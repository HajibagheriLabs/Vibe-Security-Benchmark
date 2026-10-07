// src/lib/logging/logger.ts

/**
 * Structured JSON logger with allowlist-based redaction.
 * Security-relevant decisions:
 * - Redacts any field whose key matches authorization, cookie, password,
 *   token, apiKey, or secret patterns before serialization.
 * - Emits structured objects only; no string interpolation.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const REDACT_KEY_PATTERN =
  /(authorization|cookie|password|token|apiKey|apikey|secret)/i;

function redactRecord(record: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (REDACT_KEY_PATTERN.test(key)) {
      redacted[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      redacted[key] = redactRecord(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

function emit(level: LogLevel, record: Record<string, unknown>): void {
  const safeRecord = redactRecord(record);
  const output = JSON.stringify({ level, ...safeRecord });
  // Write to stdout/stderr as structured JSON for log aggregation.
  if (level === "error" || level === "warn") {
    process.stderr.write(output + "\n");
  } else {
    process.stdout.write(output + "\n");
  }
}

export const logger = {
  debug: (record: Record<string, unknown>) => emit("debug", record),
  info: (record: Record<string, unknown>) => emit("info", record),
  warn: (record: Record<string, unknown>) => emit("warn", record),
  error: (record: Record<string, unknown>) => emit("error", record),
};