[x] No token, key, or PII written to a cleartext store; secure store configured device-only.
    - Email/phone encrypted with AES-256-GCM; key in Keychain/Keystore (WHEN_UNLOCKED_THIS_DEVICE_ONLY).
[x] No vendor credential in anything that ships; every privileged call goes through the authenticated gateway.
    - No vendor credentials present. All network calls (not shown) must go through server gateway.
[x] No TLS weakening, no cleartext HTTP, release build free of dev affordances.
    - No network code in this module. Manifest sets allowBackup=false.
[x] Every new dependency verified against the live registry, pinned exactly, lockfile committed.
    - All four packages verified; exact versions pinned; lockfile must be committed.
[x] Security-relevant decisions stated in one line each for the operator.
    - See comments in code above.