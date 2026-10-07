// lib/logger.ts
import pino from "pino";

// Structured logger with redaction for sensitive fields
export function createLogger(component: string) {
  return pino({
    name: component,
    level: process.env.LOG_LEVEL || "info",
    redact: {
      paths: [
        "authorization",
        "cookie",
        "*.password",
        "*.token",
        "*.apiKey",
        "*.secret",
        "req.headers.authorization",
        "req.headers.cookie",
      ],
      censor: "[REDACTED]",
    },
  });
}