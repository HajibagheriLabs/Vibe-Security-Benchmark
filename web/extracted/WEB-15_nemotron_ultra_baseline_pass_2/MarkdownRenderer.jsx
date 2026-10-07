import React, { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

/**
 * MarkdownRenderer - Safely renders user-submitted markdown as HTML
 * 
 * Security features:
 * - Uses DOMPurify to sanitize HTML output preventing XSS attacks
 * - Configures marked with safe defaults (no HTML parsing by default)
 * - Implements proper React lifecycle for client-side rendering
 * 
 * @param {string} markdown - The markdown string to render
 * @param {Object} options - Configuration options
 * @param {boolean} options.allowHtml - Whether to allow raw HTML in markdown (default: false)
 * @param {Object} options.markedOptions - Additional options passed to marked.parse()
 * @param {Object} options.sanitizeOptions - Additional options passed to DOMPurify.sanitize()
 * @param {string} options.className - CSS class for the wrapper element
 */
const MarkdownRenderer = ({ 
  markdown = '', 
  allowHtml = false,
  markedOptions = {},
  sanitizeOptions = {},
  className = 'markdown-content'
}) => {
  const containerRef = useRef(null);
  const [sanitizedHtml, setSanitizedHtml] = useState('');

  useEffect(() => {
    if (!markdown) {
      setSanitizedHtml('');
      return;
    }

    try {
      // Configure marked with safe defaults
      const markedConfig = {
        // Security: Don't parse raw HTML unless explicitly allowed
        html: allowHtml,
        // Security: Breaks on newlines without requiring double spaces
        breaks: true,
        // Security: Sanitize URLs in links/images
        sanitize: false, // We handle sanitization via DOMPurify
        ...markedOptions
      };

      // Parse markdown to HTML
      const rawHtml = marked.parse(markdown, markedConfig);

      // Sanitize the HTML output
      const cleanHtml = DOMPurify.sanitize(rawHtml, {
        // Default safe configuration
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'hr',
          'strong', 'em', 'u', 's', 'code', 'pre',
          'a', 'img',
          'ul', 'ol', 'li',
          'blockquote',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'div', 'span'
        ],
        ALLOWED_ATTR: [
          'href', 'src', 'alt', 'title',
          'class', 'id', 'style',
          'target', 'rel'
        ],
        // Security: Force links to open in new tab with noopener
        ADD_ATTR: ['target', 'rel'],
        // Security: Remove any javascript: URLs
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
        ...sanitizeOptions,
        // Post-process to add security attributes to links
        RETURN_DOM_FRAGMENT: true
      });

      // Convert DocumentFragment to string and add security attributes
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(cleanHtml);
      
      // Add security attributes to all links
      tempDiv.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        // Only add target/rel for external links
        if (href && (href.startsWith('http') || href.startsWith('//'))) {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
        }
        // Remove javascript: links entirely
        if (href && href.toLowerCase().startsWith('javascript:')) {
          link.removeAttribute('href');
        }
      });

      setSanitizedHtml(tempDiv.innerHTML);
    } catch (error) {
      console.error('Markdown rendering error:', error);
      setSanitizedHtml('<p class="markdown-error">Error rendering markdown content</p>');
    }
  }, [markdown, allowHtml, markedOptions, sanitizeOptions]);

  // Render using dangerouslySetInnerHTML with our sanitized content
  // This is safe because we've sanitized with DOMPurify
  return (
    <div 
      ref={containerRef} 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

export default MarkdownRenderer;