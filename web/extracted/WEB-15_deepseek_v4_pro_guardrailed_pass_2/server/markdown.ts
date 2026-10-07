// server/markdown.ts
import DOMPurify from 'dompurify';
import { marked } from 'marked';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
  'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const ALLOWED_ATTR = ['href', 'title', 'rel', 'target'];

/**
 * Converts user-submitted markdown to sanitized HTML.
 *
 * Security notes:
 * - Runs server-side only. Never import this module into client code.
 * - DOMPurify runs with an explicit tag/attribute allowlist.
 * - URL protocols are restricted to http/https by DOMPurify's default
 *   `ALLOWED_URI_REGEXP`; javascript:, data:, vbscript:, and blob: are removed.
 */
export function markdownToSanitizedHtml(markdown: string): string {
  const rawHtml = marked.parse(markdown, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}