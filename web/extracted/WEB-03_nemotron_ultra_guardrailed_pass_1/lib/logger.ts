// lib/logger.ts
import pino from "pino";

const redactPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "*.password",
  "*.token",
  "*.apiKey",
  "*.secret",
  "*.accessKeyId",
  "*.secretAccessKey",
];

function sanitizeLogValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/[\r\n\u2028\u2029]/g, "")
      .replace(/\x1b\[[0-9;]*m/g, "");
  }
  return value;
}

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: { paths: redactPaths, censor: "[REDACTED]" },
  formatters: {
    level(label) {
      return { level: label };
    },
    log(object) {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(object)) {
        sanitized[key] = sanitizeLogValue(value);
      }
      return sanitized;
    },
  },
});