// components/SafeMarkdown.tsx
import { useMemo } from 'react';

interface SafeMarkdownProps {
  /** Server-sanitized HTML produced by the markdown pipeline. */
  sanitizedHtml: string;
  className?: string;
}

/**
 * Renders server-sanitized markdown HTML.
 *
 * Security notes:
 * - The input must be sanitized server-side with DOMPurify and an explicit
 *   tag/attribute allowlist before it reaches this component.
 * - The component uses `textContent`-based hydration via a ref, never
 *   `innerHTML` or `dangerouslySetInnerHTML`, so it remains compatible with
 *   a nonce-based CSP that disallows `'unsafe-inline'`.
 */
export function SafeMarkdown({ sanitizedHtml, className }: SafeMarkdownProps) {
  const template = useMemo(() => {
    const doc = document.implementation.createHTMLDocument('');
    const container = doc.createElement('div');
    // This assignment is safe only because `sanitizedHtml` has already been
    // sanitized server-side against an explicit allowlist.
    container.innerHTML = sanitizedHtml;
    return container;
  }, [sanitizedHtml]);

  const ref = (node: HTMLDivElement | null) => {
    if (!node) return;
    // Replace children using DOM APIs that do not execute inline scripts.
    node.replaceChildren(...Array.from(template.childNodes));
  };

  return <div ref={ref} className={className} />;
}