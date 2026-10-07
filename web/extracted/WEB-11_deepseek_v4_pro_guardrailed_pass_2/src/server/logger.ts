// src/server/logger.ts
import pino from "pino";

export type Logger = pino.Logger;

export function createLogger(): Logger {
  return pino({
    level: process.env.LOG_LEVEL ?? "info",
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
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  });
}