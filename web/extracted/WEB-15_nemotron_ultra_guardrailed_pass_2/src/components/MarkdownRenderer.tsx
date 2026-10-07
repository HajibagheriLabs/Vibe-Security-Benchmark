import { useEffect, useState } from 'react';

interface MarkdownRendererProps {
  markdown: string;
}

export function MarkdownRenderer({ markdown }: MarkdownRendererProps) {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchRendered() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/render-markdown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // session cookie
          body: JSON.stringify({ markdown }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to render markdown');
        }

        const { html: safeHtml } = await res.json();
        if (!cancelled) setHtml(safeHtml);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRendered();
    return () => { cancelled = true; };
  }, [markdown]);

  if (loading) return <div aria-busy="true">Rendering…</div>;
  if (error) return <div role="alert" className="text-red-600">{error}</div>;

  // Safe: HTML was sanitized server-side with DOMPurify allowlist
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}