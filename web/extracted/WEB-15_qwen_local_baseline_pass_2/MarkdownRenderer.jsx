import React from 'react';
import ReactMarkdown from 'react-markdown';

const MarkdownRenderer = ({ markdown }) => {
  return (
    <div className="markdown-renderer">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;