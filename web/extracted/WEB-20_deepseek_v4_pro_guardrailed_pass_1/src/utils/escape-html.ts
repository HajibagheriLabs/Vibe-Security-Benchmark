// src/utils/escape-html.ts
/**
 * HTML entity escaping utility
 * Prevents XSS by converting special characters to their HTML entities
 */
export function escapeHtml(value: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  return value.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char);
}