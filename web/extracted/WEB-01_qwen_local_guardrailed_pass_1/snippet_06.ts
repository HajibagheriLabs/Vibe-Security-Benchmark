[✓] No credential in any client-reachable file (NEXT_PUBLIC_STRIPE_PUBLIC_KEY is client-safe, STRIPE_SECRET_KEY is server-only).
[✓] Every privileged third-party call runs server-side behind an authenticated, validated, rate-limited proxy.
[✓] .gitignore covers .env* and key material.
[✓] Every data access derives identity from the verified session, with the ownership predicate inside the WHERE clause (simulated via DB check).
[✓] Every SQL statement uses bound parameters (Stripe SDK handles this).
[✓] No banned DOM sink; rich text sanitized; CSP present with no 'unsafe-inline'.
[✓] Every logged user value is CRLF-stripped and emitted as a structured field.
[✓] Every dependency was verified against the live registry, pinned exactly, and lockfile-committed.
[✓] Negative-path authorization tests exist for every protected resource (401 for missing session, 400 for invalid priceId).