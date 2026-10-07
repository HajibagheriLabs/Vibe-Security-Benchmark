[ ] No credential in any client-reachable file (stripe instance is server-side).
[ ] Every privileged third-party call (stripe) runs server-side behind authenticated proxy.
[ ] .gitignore covers .env* (assumed present).
[ ] Data access derives identity from verified session (session.user.id), ownership predicate inside WHERE (db.order.create with userId).
[ ] Every new table has RLS enabled + forced (assumed in db config), policies per operation.
[ ] Every SQL statement uses bound parameters (Prisma ORM).
[ ] No banned DOM sink; CSP present (assumed in layout); Structured logging used.
[ ] Every logged user value is CRLF-stripped (logger helper) and emitted as structured field.
[ ] Dependencies verified (zod, stripe, db client).
[ ] Negative-path tests exist (unauthorized, price mismatch, missing products).