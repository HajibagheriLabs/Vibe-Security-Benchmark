// lib/log-sanitizer.ts
export function sanitizeForLog(value: string): string {
  return value
    .replace(/[\r\n\u2028\u2029]/g, '')
    .replace(/\u001b\[[0-9;]*m/g, '');
}