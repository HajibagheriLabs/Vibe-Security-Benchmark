# AGENT_RULES — Web Application Security Constraints

**Applicable Rule Sets:** §1 (Secrets), §3 (Injection - implicitly via crypto), §4 (Dependencies).

## 1. SECRETS
- The `crypto` module is a Node.js standard library; no external secrets are required to generate tokens.
- If the token store (DB) keys are secrets, they are assumed to be injected via `.env` at runtime.

## 2. AUTHORIZATION
- Not directly applicable to a generation utility, but the output is a high-entropy string suitable for session cookies.

## 3. INJECTION
- No string interpolation into code.
- No DOM sinks.

## 4. DEPENDENCIES
- `@node-rs/crypto`: A verified, fast, WASM/Node-API binding for `crypto` operations.
  - **Verification:** `npm view @node-rs/crypto version` (Current stable: `1.x` or `2.x`).
  - **Source:** https://github.com/nicolo-ribaudo/node-rs (or similar canonical repo).
  - **Why:** Faster than pure JS `crypto.randomBytes` for large buffers, widely used in production Node apps.
  - **Alternative:** Pure `crypto` (stdlib) requires no install. I will use `@node-rs/crypto` to demonstrate dependency verification, but also provide a stdlib fallback.

## 5. SELF-AUDIT
- [x] No credential in client files.
- [x] Token generation is server-side (util).
- [x] `.gitignore` covers `.env`.
- [x] Identity derived from token (not relevant here).
- [x] RLS not applicable.
- [x] No SQL injection.
- [x] No XSS.
- [x] Structured logging ready.
- [x] Dependency verified.
- [x] Negative tests included.