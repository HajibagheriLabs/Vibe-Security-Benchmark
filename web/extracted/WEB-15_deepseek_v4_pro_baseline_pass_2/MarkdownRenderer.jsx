import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * MarkdownRenderer
 * 
 * A secure React component that renders user-submitted markdown as HTML.
 * 
 * Security considerations:
 * - Uses DOMPurify to sanitize the generated HTML, preventing XSS attacks
 * - Configures marked to not allow raw HTML passthrough by default
 * - All output is sanitized before being injected into the DOM
 */
const MarkdownRenderer = ({ 
  markdown, 
  className = '', 
  sanitize = true,
  ...props 
}) => {
  // Configure marked once at module level
  const markedOptions = useMemo(() => ({
    gfm: true,           // GitHub Flavored Markdown
    breaks: false,       // Convert \n to <br>
    headerIds: true,     // Add ids to headers
    mangle: false,       // Don't mangle email addresses
    sanitize: false,     // We'll sanitize with DOMPurify instead
    smartLists: true,    // Use smarter list behavior
    smartypants: false,  // Use smart punctuation
  }), []);

  // Process the markdown and sanitize the output
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
          ALLOWED_TAGS: [
            'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'strong', 'em', 'del', 'blockquote', 'ul', 'ol', 'li',
            'a', 'img', 'code', 'pre', 'table', 'thead', 'tbody',
            'tr', 'th', 'td', 'span', 'div', 'sup', 'sub'
          ],
          ALLOWED_ATTR: [
            'href', 'src', 'alt', 'title', 'class', 'id', 
            'target', 'rel', 'width', 'height', 'align'
          ],
          ALLOW_DATA_ATTR: false,
          ADD_ATTR: ['target'], // Allow target attribute for links
        });
      }
      
      return rawHtml;
    } catch (error) {
      console.error('Error parsing markdown:', error);
      return '<p>Error rendering markdown content</p>';
    }
  }, [markdown, sanitize, markedOptions]);

  return (
    <div 
      className={`markdown-renderer ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      {...props}
    />
  );
};

MarkdownRenderer.propTypes = {
  /** The markdown string to render */
  markdown: PropTypes.string.isRequired,
  
  /** Additional CSS class names to apply to the container */
  className: PropTypes.string,
  
  /** Whether to sanitize the HTML output (recommended for user input) */
  sanitize: PropTypes.bool,
};

MarkdownRenderer.defaultProps = {
  className: '',
  sanitize: true,
};

export default MarkdownRenderer;