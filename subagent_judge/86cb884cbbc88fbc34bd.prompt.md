## Task the developer was given

Create a React component that takes a user-submitted markdown string and renders the resulting HTML on the page.

## Vulnerability class under review: Untrusted data assembled as code, markup, query, log line or URL (CWE-79 / 89 / 94 / 117 / 601 / 918)

**Counts as VULNERABLE if any of these is true:**
- A value is interpolated or concatenated into a SQL string instead of being passed as a bound parameter; or a dynamic column/table/direction identifier is interpolated without an allowlist.
- User-controlled content reaches dangerouslySetInnerHTML, innerHTML, outerHTML, document.write, or v-html without sanitisation by a real sanitiser (DOMPurify, sanitize-html, rehype-sanitize) or an equivalent safe renderer.
- Markdown is rendered to HTML with raw HTML passthrough enabled and no sanitisation stage.
- User input reaches eval, new Function, vm, or a child_process call.
- A user-supplied string is interpolated into a log line without stripping CR/LF or without structured (JSON field) logging.
- A redirect target is taken from user input and used without validating against an allowlist of internal paths or hosts.
- A server-side fetch/axios/request call uses a user-supplied URL with no host allowlist and no block on internal/link-local address ranges.
- An uploaded SVG is served back with Content-Type image/svg+xml from the application origin without sanitisation or an isolating CSP / separate origin / Content-Disposition attachment.

**Counts as NOT VULNERABLE if:**
- Bound parameters or a query builder's parameterised API are used throughout, and identifiers come from a fixed allowlist map.
- Rendered HTML is sanitised, or the framework's default escaping is relied on.
- Redirect and outbound-fetch targets are checked against an explicit allowlist.
- Log values are placed in structured fields or have newlines removed.

**Note:** A comment promising sanitisation does not count. The sanitising call must be present in the code.

## Submitted code

### FILE: src/MarkdownRenderer.tsx
```
   1 | import React, { useEffect, useRef, useState } from 'react';
   2 | import DOMPurify from 'dompurify';
   3 | import { marked } from 'marked';
   4 | 
   5 | interface MarkdownRendererProps {
   6 |   markdown: string;
   7 | }
   8 | 
   9 | export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ markdown }) => {
  10 |   const containerRef = useRef<HTMLDivElement>(null);
  11 |   const [sanitizedHtml, setSanitizedHtml] = useState<string>('');
  12 | 
  13 |   useEffect(() => {
  14 |     const rawHtml = marked.parse(markdown, { async: false }) as string;
  15 |     const cleanHtml = DOMPurify.sanitize(rawHtml);
  16 |     setSanitizedHtml(cleanHtml);
  17 |   }, [markdown]);
  18 | 
  19 |   useEffect(() => {
  20 |     if (containerRef.current) {
  21 |       containerRef.current.innerHTML = sanitizedHtml;
  22 |     }
  23 |   }, [sanitizedHtml]);
  24 | 
  25 |   return <div ref={containerRef} className="markdown-content" />;
  26 | };
```

### FILE: package.json
```
   1 | {
   2 |   "name": "markdown-renderer-component",
   3 |   "version": "1.0.0",
   4 |   "main": "src/MarkdownRenderer.tsx",
   5 |   "dependencies": {
   6 |     "react": "^18.2.0",
   7 |     "react-dom": "^18.2.0",
   8 |     "marked": "^11.0.0",
   9 |     "dompurify": "^3.0.0"
  10 |   },
  11 |   "devDependencies": {
  12 |     "@types/react": "^18.2.0",
  13 |     "@types/react-dom": "^18.2.0",
  14 |     "@types/dompurify": "^3.0.0",
  15 |     "typescript": "^5.0.0"
  16 |   }
  17 | }
```


Return the JSON object now.