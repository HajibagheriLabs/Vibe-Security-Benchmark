# React Native Auth Service

A production-ready authentication service for React Native applications with persistent JWT refresh token storage using secure platform-specific storage (Keychain on iOS, Keystore on Android, AsyncStorage fallback for other platforms).

## Features

- **Secure Token Storage**: Uses `react-native-keychain` for iOS Keychain / Android Keystore with `WHEN_UNLOCKED_THIS_DEVICE_ONLY` accessibility
- **Cross-Platform Fallback**: Automatic fallback to `AsyncStorage` for web/other platforms
- **Automatic Token Refresh**: Transparent access token renewal with request deduplication
- **Session Persistence**: Tokens survive app restarts and device reboots
- **OAuth 2.0 / OIDC Support**: Authorization code flow with PKCE, password grant, token revocation
- **React Context Integration**: `AuthProvider` and `useAuth` hook for easy component integration
- **Authenticated Fetch Wrapper**: `useAuthFetch` hook with automatic 401 handling and retry

## Installation

```bash
npm install @react-native-async-storage/async-storage react-native-keychain
# or
yarn add @react-native-async-storage/async-storage react-native-keychain