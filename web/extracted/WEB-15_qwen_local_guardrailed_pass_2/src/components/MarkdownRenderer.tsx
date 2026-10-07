// src/components/MarkdownRenderer.tsx
import React from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

// Configuration for marked to be compatible with DOMPurify
// Use async render if needed, but sync is fine for standard markdown
marked.setOptions({
  breaks: false,
  gfm: true,
});

const MarkdownRenderer: React.FC<{ source: string }> = ({ source }) => {
  // 1. Parse Markdown to HTML
  const rawHtml = marked.parse(source) || '';

  // 2. Sanitize HTML
  // Flag: Security - DOMPurify removes dangerous tags (script, object, embed) and attributes
  // (on* handlers, javascript: URLs).
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ['target'], // Allow target="_blank" for links
    ADD_TAGS: ['br'],     // Ensure <br> is preserved if needed by parser quirks
  });

  // 3. Render with dangerouslySetInnerHTML
  // Flag: Security - This is the only DOM sink. It is backed by DOMPurify.
  return (
    <div
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
};

export default MarkdownRenderer;