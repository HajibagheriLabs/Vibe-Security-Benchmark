[ ] No credential in any client-reachable file (NEXT_PUBLIC_SUPABASE_ANON_KEY is standard anon key, NEXT_PUBLIC_SUPABASE_URL is public).
[ ] Privileged third-party call (select users) runs client-side but backed by RLS policies defined in migration.
[ ] .gitignore covers .env (assumed present in repo root).
[ ] Every data access derives identity from verified session (middleware checks session, RLS checks auth.uid()).
[ ] Every new table (public.users) has RLS enabled + forced, with per-operation policies and no USING (true).
[ ] SQL statement uses bound parameters (implicit in Supabase client) and identifiers from allowlist (table name is literal).
[ ] No banned DOM sink; rich text sanitized (none present); CSP present (assumed in next.config).
[ ] Every logged user value is CRLF-stripped (handled by Supabase client/server).
[ ] Every dependency was verified against the live registry, pinned exactly, and lockfile-committed.
[ ] Negative-path authorization tests exist for every protected resource (middleware redirects unauthenticated).