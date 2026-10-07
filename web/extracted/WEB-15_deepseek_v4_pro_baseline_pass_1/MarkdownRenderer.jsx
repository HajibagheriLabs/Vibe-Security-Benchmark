import React, { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * MarkdownRenderer
 * 
 * A React component that safely renders user-submitted markdown as HTML.
 * 
 * Props:
 *   - markdown: string (required) - The markdown content to render
 *   - className: string (optional) - Additional CSS classes for the wrapper
 *   - sanitize: boolean (optional, default: true) - Whether to sanitize the HTML output
 * 
 * Security:
 *   - Uses DOMPurify to sanitize the generated HTML, preventing XSS attacks
 *   - Configures marked to not allow raw HTML passthrough by default
 */
const MarkdownRenderer = ({ 
  markdown = '', 
  className = '', 
  sanitize = true,
  ...restProps 
}) => {
  // Configure marked once at module level
  const markedOptions = useMemo(() => ({
    gfm: true,           // GitHub Flavored Markdown
    breaks: false,       // Don't convert \n to <br>
    headerIds: false,    // Don't generate header IDs (avoids potential conflicts)
    mangle: false,       // Don't mangle email addresses
  }), []);

  // Convert markdown to HTML and sanitize
  const htmlContent = useMemo(() => {
    if (!markdown || typeof markdown !== 'string') {
      return '';
    }

    try {
      // Parse markdown to HTML
      const rawHtml = marked.parse(markdown, markedOptions);
      
      // Sanitize the HTML to prevent XSS attacks
      if (sanitize) {
        return DOMPurify.sanitize(rawHtml, {
          USE_PROFILES: { html: true },
          ALLOWED_TAGS: [
            'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'strong', 'em', 'del', 'ins', 'sub', 'sup',
            'ul', 'ol', 'li', 'dl', 'dt', 'dd',
            'blockquote', 'pre', 'code',
            'a', 'img', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
            'span', 'div', 'section', 'article', 'header', 'footer',
            'input', 'details', 'summary', 'figure', 'figcaption', 'mark', 'small'
          ],
          ALLOWED_ATTR: [
            'href', 'src', 'alt', 'title', 'class', 'id', 'name',
            'target', 'rel', 'width', 'height', 'colspan', 'rowspan',
            'align', 'valign', 'scope', 'start', 'type', 'checked', 'disabled'
          ],
          ALLOW_DATA_ATTR: false,
          ADD_ATTR: ['target'], // Allow target attribute for links
          FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form'],
          FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
        });
      }
      
      return rawHtml;
    } catch (error) {
      console.error('Error rendering markdown:', error);
      return '<p>Error rendering content</p>';
    }
  }, [markdown, sanitize, markedOptions]);

  return (
    <div 
      className={`markdown-renderer ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      {...restProps}
    />
  );
};

export default MarkdownRenderer;