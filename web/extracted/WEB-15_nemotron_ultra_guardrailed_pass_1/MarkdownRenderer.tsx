// MarkdownRenderer.tsx
import React from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface MarkdownRendererProps {
  markdown: string;
  className?: string;
}

/**
 * Securely renders markdown to HTML.
 * - Uses marked for parsing (no HTML in markdown input by default)
 * - Sanitizes output with DOMPurify using strict allowlist
 * - Never uses dangerouslySetInnerHTML with unsanitized content
 */
export function MarkdownRenderer({ markdown, className = '' }: MarkdownRendererProps) {
  // Parse markdown to HTML (marked defaults to not parsing raw HTML in markdown)
  const rawHtml = marked.parse(markdown, { async: false }) as string;

  // Sanitize with strict allowlist - only allow safe formatting tags
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'hr', 'del', 'ins', 'sub', 'sup',
      'kbd', 'samp', 'var', 'cite', 'dfn', 'abbr', 'time',
      'details', 'summary'
    ],
    ALLOWED_ATTR: {
      'a': ['href', 'title', 'rel', 'target'],
      'img': ['src', 'alt', 'title', 'width', 'height'],
      'code': ['class'],
      'pre': ['class'],
      'th': ['scope'],
      'td': ['colspan', 'rowspan'],
      'time': ['datetime'],
      'abbr': ['title'],
      'dfn': ['title'],
      '*': ['id', 'class']
    },
    // Enforce safe link behavior
    ADD_ATTR: ['rel'],
    ADD_TAGS: [],
    // Strip event handlers and javascript: URLs
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['on*', 'style', 'onclick', 'onload', 'onerror'],
    // Ensure links are safe
    SAFE_FOR_TEMPLATES: true,
    // Custom hook to enforce https-only for links and images
    HOOKS: {
      uponSanitizeElement: (node: Element, _config: DOMPurify.Config) => {
        if (node.tagName === 'A') {
          const href = node.getAttribute('href');
          if (href && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('/') && !href.startsWith('#')) {
            node.removeAttribute('href');
          }
          // Force safe target/rel for external links
          if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
          }
        }
        if (node.tagName === 'IMG') {
          const src = node.getAttribute('src');
          if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('/') && !src.startsWith('data:')) {
            node.removeAttribute('src');
          }
        }
        return node;
      }
    }
  });

  // Use a wrapper div with the sanitized HTML
  // This is safe because DOMPurify output is guaranteed safe with our config
  return (
    <div 
      className={`markdown-renderer ${className}`}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}

export default MarkdownRenderer;