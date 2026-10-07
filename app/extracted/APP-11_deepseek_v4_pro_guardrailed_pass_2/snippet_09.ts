[x] No token, key, or PII written to a cleartext store; secure store configured device-only.
    — Email/phone stored as AES-256-GCM ciphertext in SQLite; key in Keychain/Keystore with
      WHEN_UNLOCKED_THIS_DEVICE_ONLY.
[x] Every BrowserWindow/webview carries the full flag set — N/A (React Native, not Electron).
[x] Every ipcMain handler verifies sender — N/A (React Native, not Electron).
[x] No vendor credential in anything that ships — no vendor calls in this module.
[x] No TLS weakening, no cleartext HTTP — no network calls in this module.
[x] Every incoming URL passes the single allowlist resolver — N/A (no deep links in this module).
[x] Every new dependency verified against the live registry, pinned exactly, lockfile committed.
    — All four dependencies verified on npm registry; exact versions pinned.
[x] Security-relevant decisions stated in one line each for the operator.
    — Encryption key in platform secure store; PII encrypted at rest; key wiped on logout.