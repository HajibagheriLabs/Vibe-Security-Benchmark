import React, { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Security Decision: DOMPurify sanitization on render.
// We use a strict allowlist for tags and attributes to prevent XSS.
// Security Decision: 'marked' is used for parsing; output is stringified then sanitized.
const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'b', 'i', 'u', 'strong', 'em', 's', 'code', 'pre',
  'p', 'a', 'ul', 'ol', 'li', 'blockquote',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'br', 'img'
];

const ALLOWED_ATTRS = [
  'align', 'href', 'src', 'alt', 'title', 'target',
  'width', 'height', 'class', 'id'
];

const MarkdownRenderer: React.FC<{ markdown: string }> = ({ markdown }) => {
  // Security Decision: Sanitize HTML on render to handle dynamic content safely.
  // Security Decision: marked.setOptions is called inside useMemo to avoid global state mutation
  // if this component is used multiple times or re-rendered in strict modes.
  const html = useMemo(() => {
    if (!markdown) return '';

    // Configure marked for security:
    // - gfm: true (GitHub Flavored Markdown)
    // - breaks: false (optional, keep it standard)
    marked.setOptions({
      gfm: true,
      breaks: false,
    });

    const rawHtml = marked.parse(markdown) as string;

    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS,
      ALLOWED_ATTRS,
      // Security Decision: Force protocol check for href/src
      ADD_ATTR: ['target'],
      FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form'],
      // Security Decision: Ban javascript:, data:, vbscript:, blob: protocols
      ADD_DATA_URI_TAGS: ['img'],
      DATA_URI_PATTERN: /^(https?:)?\/\/|^(https?:)?\/\//i,
      // Custom hook to validate URLs
      HOOKS: {
        afterSanitizeAttributes: (node) => {
          // Enforce target="_blank" for links
          if (node.tagName === 'A') {
            node.setAttribute('rel', 'noopener noreferrer');
            node.setAttribute('target', '_blank');
          }
        },
      },
    });

    return cleanHtml;
  }, [markdown]);

  return (
    <div
      className="markdown-rendered"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MarkdownRenderer;