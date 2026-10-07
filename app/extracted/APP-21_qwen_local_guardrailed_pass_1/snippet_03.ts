[ ] No token, key, or PII written to a cleartext store; SecureStore is used for refresh token.
[ ] Every BrowserWindow/webview carries the full flag set; no contextBridge exposes a module,
    ipcRenderer, or a generic invoke. (N/A for this specific snippet, but compliant with Rule 2).
[ ] Every ipcMain handler verifies sender, parses a schema, authorizes, and confines paths. (N/A).
[ ] No vendor credential in anything that ships; every privileged call goes through the
    authenticated, validated, rate-limited gateway. (Exchange happens on server).
[ ] No TLS weakening, no cleartext HTTP, release build free of dev affordances. (Fetch uses HTTPS).
[ ] Every incoming URL passes the single allowlist resolver; no link mutates state or grants
    authority; redirects resolve through a destination map. (validateRedirectUrl used).
[ ] Every new dependency verified against the live registry, pinned exactly, lockfile committed. (expo-secure-store, jose, @react-navigation/native).
[ ] Security-relevant decisions stated in one line each for the operator. (Comments added).