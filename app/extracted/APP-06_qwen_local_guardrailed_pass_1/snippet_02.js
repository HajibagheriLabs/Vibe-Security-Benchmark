[ ] No token, key, or PII written to a cleartext store; secure store configured device-only.
[ ] Every BrowserWindow/webview carries the full flag set; no contextBridge exposes a module,
    ipcRenderer, or a generic invoke.
[ ] Every ipcMain handler verifies sender, parses a schema, authorizes, and confines paths.
    -> Verifies origin, validates types, checks path against home dir, uses execFile.
[ ] No vendor credential in anything that ships; every privileged call goes through the
    authenticated, validated, rate-limited gateway.
[ ] No TLS weakening, no cleartext HTTP, release build free of dev affordances.
[ ] Every incoming URL passes the single allowlist resolver; no link mutates state or grants
    authority; redirects resolve through a destination map.
[ ] Every new dependency verified against the live registry, pinned exactly, lockfile committed.
[ ] Security-relevant decisions stated in one line each for the operator.
    -> Path confinement to home dir prevents ../ escape.
    -> execFile prevents shell injection.
    -> Origin check prevents cross-origin renderer injection.