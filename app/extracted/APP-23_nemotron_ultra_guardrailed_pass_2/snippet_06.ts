[ ] No token, key, or PII written to a cleartext store; secure store configured device-only.
[ ] Every BrowserWindow/webview carries the full flag set; no contextBridge exposes a module, ipcRenderer, or a generic invoke. (N/A — React Native)
[ ] Every ipcMain handler verifies sender, parses a schema, authorizes, and confines paths. (N/A — React Native)
[ ] No vendor credential in anything that ships; every privileged call goes through the authenticated, validated, rate-limited gateway. (N/A — no vendor calls)
[ ] No TLS weakening, no cleartext HTTP, release build free of dev affordances.
[ ] Every incoming URL passes the single allowlist resolver; no link mutates state or grants authority; redirects resolve through a destination map. (N/A — scanner returns raw string only)
[ ] Every new dependency verified against the live registry, pinned exactly, lockfile committed.
[ ] Security-relevant decisions stated in one line each for the operator.