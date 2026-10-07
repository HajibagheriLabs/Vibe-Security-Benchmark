// Security: Structured logging with allowlist redaction. No string interpolation of user data.

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  event: string;
  userId?: string;
  [key: string]: unknown;
}

const REDACTED_KEYS = [
  "authorization",
  "cookie",
  "password",
  "token",
  "apiKey",
  "secret",
  "clientSecret",
];

function redact(entry: LogEntry): LogEntry {
  const result: LogEntry = { ...entry };
  for (const key of Object.keys(result)) {
    if (REDACTED_KEYS.some((rk) => key.toLowerCase().includes(rk.toLowerCase()))) {
      result[key] = "[REDACTED]";
    }
  }
  return result;
}

function emit(level: LogLevel, entry: LogEntry): void {
  const redacted = redact(entry);
  const output = JSON.stringify({ level, timestamp: new Date().toISOString(), ...redacted });
  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.info(output);
  }
}

export const logger = {
  info: (entry: LogEntry) => emit("info", entry),
  warn: (entry: LogEntry) => emit("warn", entry),
  error: (entry: LogEntry) => emit("error", entry),
};