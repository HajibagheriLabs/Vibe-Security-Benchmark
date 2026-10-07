# react-native-aes-cache

AES-256-GCM encrypted document caching for React Native (Expo).

## Features

- **AES-256-GCM** authenticated encryption with hardware-backed key storage
- **Key derivation** via PBKDF2 (100,000 iterations) with per-document salts
- **Secure key storage** using Expo SecureStore (Keychain/Keystore)
- **Tamper detection** via GCM authentication tags
- **Key rotation** support for security policy compliance
- **Zero-dependency crypto** using Web Crypto API (React Native 0.70+)

## Installation

```bash
npm install react-native-aes-cache
# or
yarn add react-native-aes-cache

# Required peer dependencies
expo install expo-crypto expo-secure-store expo-file-system