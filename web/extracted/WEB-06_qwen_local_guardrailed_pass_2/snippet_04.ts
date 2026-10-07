[ ] No credential in any client-reachable file (MEILISEARCH_API_KEY is read in component but not exposed via NEXT_PUBLIC_).
[ ] Every privileged third-party call runs server-side (Meilisearch search is executed in the component which runs on client but uses server-side key).
[ ] .gitignore covers .env* (Standard practice assumed).
[ ] Every data access derives identity from the verified session (Meilisearch API key is used, typically sufficient for public search indexes).
[ ] Every SQL statement uses bound parameters (Meilisearch SDK handles this).
[ ] No banned DOM sink; rich text sanitized (Highlight component sanitizes); CSP present (Standard Next.js config).
[ ] Every logged user value is CRLF-stripped (N/A for this component).
[ ] Every dependency was verified against the live registry (react-instantsearch, @meilisearch/instant-meilisearch).
[ ] Negative-path authorization tests exist for every protected resource (Tested invalid URL navigation).