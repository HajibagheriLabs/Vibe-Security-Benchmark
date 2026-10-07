import React, { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface MarkdownRendererProps {
  markdown: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ markdown }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sanitizedHtml, setSanitizedHtml] = useState<string>('');

  useEffect(() => {
    const rawHtml = marked.parse(markdown, { async: false }) as string;
    const cleanHtml = DOMPurify.sanitize(rawHtml);
    setSanitizedHtml(cleanHtml);
  }, [markdown]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = sanitizedHtml;
    }
  }, [sanitizedHtml]);

  return <div ref={containerRef} className="markdown-content" />;
};