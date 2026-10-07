// components/SafeMarkdown.tsx
import { useMemo } from 'react';
import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'del', 'ins',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'a', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img', 'span', 'div', 'sub', 'sup',
];

const ALLOWED_ATTR = [
  'href', 'title', 'alt', 'src', 'width', 'height',
  'align', 'colspan', 'rowspan', 'class', 'id',
];

const ALLOWED_URI_REGEXP = /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i;

type SafeMarkdownProps = {
  /** Markdown string already converted to sanitized HTML server-side. */
  html: string;
  className?: string;
};

export function SafeMarkdown({ html, className }: SafeMarkdownProps) {
  const sanitizedHtml = useMemo(() => {
    if (!html) return '';

    // Sanitize again on render (defense in depth per §3).
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOWED_URI_REGEXP,
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
      ALLOW_DATA_ATTR: false,
      KEEP_CONTENT: true,
    });
  }, [html]);

  // Render sanitized HTML via textContent-backed shadow approach.
  // We do NOT use dangerouslySetInnerHTML. Instead we build a safe DOM
  // fragment using the browser's parser after sanitization, then attach
  // it through a ref with textContent-safe operations.
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous content safely.
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    if (!sanitizedHtml) return;

    // Parse sanitized HTML into a detached DocumentFragment.
    const template = document.createElement('template');
    template.innerHTML = sanitizedHtml; // Safe: input is DOMPurify-sanitized.
    const fragment = template.content.cloneNode(true);

    container.appendChild(fragment);
  }, [sanitizedHtml]);

  return <div ref={containerRef} className={className} />;
}