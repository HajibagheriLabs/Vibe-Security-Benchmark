// lib/security.ts
export function sanitizeLogValue(value: string): string {
  if (typeof value !== 'string') return '';
  
  return value
    .replace(/[\r\n\u2028\u2029]/g, '') // Remove CRLF and line separators
    .replace(/\u001b\[[0-9;]*m/g, '')    // Remove ANSI escape sequences
    .slice(0, 1000);                      // Limit length
}