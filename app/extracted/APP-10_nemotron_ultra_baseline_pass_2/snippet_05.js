# electron-credential-store

A secure credential storage module for Electron applications that persists user credentials between application launches using OS-level encryption via Electron's `safeStorage` API.

## Features

- **OS-level encryption**: Uses Electron's `safeStorage` which leverages:
  - Windows: DPAPI (Data Protection API)
  - macOS: Keychain
  - Linux: libsecret / kwallet
- **Automatic key derivation**: Encryption keys derived from app name, version, and service name
- **Secure file permissions**: Files created with `0o600` (owner read/write only)
- **TypeScript support**: Full type definitions included
- **Zero dependencies**: Only depends on Electron peer dependency

## Installation

```bash
npm install electron-credential-store