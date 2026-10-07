[ ] No credential in any client-reachable file, and no secret behind a public env prefix.
[ ] Every privileged third-party call runs server-side behind an authenticated, validated,
    rate-limited proxy. (N/A: this is a client-side hook)
[ ] .gitignore covers .env* and key material. (N/A: no env files)
[ ] Every data access derives identity from the verified session, with the ownership
    predicate inside the WHERE clause. (N/A: no data access)
[ ] Every new table has RLS enabled + forced, with per-operation policies and no USING (true). (N/A: no tables)
[ ] Every SQL statement uses bound parameters; identifiers come from allowlists. (N/A: no SQL)
[ ] No banned DOM sink; rich text sanitized; CSP present with no 'unsafe-inline'. (N/A: no DOM)
[ ] Every logged user value is CRLF-stripped and emitted as a structured field. (N/A: no logging)
[ ] Every dependency was verified against the live registry, pinned exactly, and lockfile-committed. (N/A: no new deps)
[ ] Negative-path authorization tests exist for every protected resource. (N/A: no auth)