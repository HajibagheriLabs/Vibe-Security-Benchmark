// lib/security/html-escape.ts
/**
 * HTML escape utility - prevents XSS by escaping special characters.
 * This is a critical security function - do not modify without security review.
 */

/**
 * Escapes HTML special characters to prevent XSS.
 * Must be used on ALL user-controlled data before HTML interpolation.
 */
export function escapeHtml(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Escapes for use in HTML attribute values (double-quoted).
 * Use when interpolating into attribute="VALUE" contexts.
 */
export function escapeHtmlAttribute(input: string): string {
  return escapeHtml(input).replace(/"/g, '&quot;');
}

/**
 * Escapes for use in URL contexts.
 * Validates protocol is http/https only.
 */
export function escapeUrl(input: string): string {
  const trimmed = input.trim();
  
  // Only allow http/https protocols
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '#'; // Safe fallback
    }
    // Escape for HTML attribute context
    return escapeHtmlAttribute(trimmed);
  } catch {
    return '#'; // Safe fallback for invalid URLs
  }
}

/**
 * Strips all HTML tags - for plain text extraction.
 * Not a security function, just utility.
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}