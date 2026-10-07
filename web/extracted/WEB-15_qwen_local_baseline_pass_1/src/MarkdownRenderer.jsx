import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * MarkdownRenderer Component
 * 
 * Takes a user-submitted markdown string and renders the resulting HTML.
 * Uses react-markdown for parsing and rendering, with remark-gfm for GitHub Flavored Markdown support.
 */
const MarkdownRenderer = ({ markdownString, className = '' }) => {
  // Memoize the parsed content to avoid re-parsing on every render unless markdownString changes
  const parsedContent = useMemo(() => {
    if (!markdownString || typeof markdownString !== 'string') {
      return null;
    }
    return markdownString;
  }, [markdownString]);

  if (!parsedContent) {
    return <div className={className}>No content provided.</div>;
  }

  return (
    <div className={`markdown-renderer ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {parsedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;