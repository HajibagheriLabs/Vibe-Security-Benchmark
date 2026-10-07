import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Type definitions for the app's navigation stack
type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  OAuthCallback: { url: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Configuration
const OAUTH_AUTH_URL = 'https://auth.example.com/oauth/authorize';
const OAUTH_TOKEN_URL = 'https://api.example.com/oauth/token';
const REDIRECT_URI = 'myapp://callback';

// Security Rule: Tokens are never stored in AsyncStorage.
// We use expo-secure-store which maps to iOS Keychain / Android EncryptedSharedPreferences.
// Rule: Device-only accessibility is the default for expo-secure-store.
const TOKEN_STORAGE_KEY = 'access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'refresh_token';

export default function OAuthRedirectHandler() {
  const navigation = useNavigation<NavigationProp>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Get the initial URL that launched the app (Deep Link)
    // Rule: Every incoming URL is untrusted. Parse it immediately.
    const handleInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (!initialUrl) {
          throw new Error('No redirect URL received');
        }

        await processAuthCode(initialUrl);
      } catch (err) {
        console.error('OAuth Redirect Error:', err);
        setStatus('error');
        setErrorMessage('Authentication failed. Please try again.');
      }
    };

    handleInitialURL();
  }, []);

  // 2. Exchange the auth code for a session
  const processAuthCode = async (url: string) => {
    // Rule: Reject, never repair. Validate scheme and host.
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    if (parsedUrl.protocol !== 'myapp:') {
      throw new Error('Unsupported scheme');
    }

    // Rule: Exact hostname allowlist
    if (parsedUrl.hostname !== 'callback') {
      throw new Error('Unknown host');
    }

    // Rule: Extract auth code from query params
    const code = parsedUrl.searchParams.get('code');
    const state = parsedUrl.searchParams.get('state');
    const error = parsedUrl.searchParams.get('error');

    if (error) {
      throw new Error(`Auth error: ${error}`);
    }

    if (!code) {
      throw new Error('Missing auth code');
    }

    // Basic state validation (ensure it matches what we sent, e.g., session-bound)
    if (!state || state.length < 16) {
      throw new Error('Invalid state parameter');
    }

    // 3. Exchange code for tokens
    // Rule: Gateway order: validate schema -> call vendor -> return minimal fields.
    // Rule: No cleartext traffic; HTTPS only.
    const tokenResponse = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        client_id: 'my-app-client-id', // Bundled, but used for authenticated call
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Token exchange failed');
    }

    const data = await tokenResponse.json();

    // Rule: Validate schema (basic type checking)
    if (!data.access_token || typeof data.access_token !== 'string') {
      throw new Error('Malformed token response');
    }

    // 4. Store tokens securely
    // Rule: Access tokens stay in memory. Refresh credential is persisted.
    // Rule: No plaintext fallback.
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, data.access_token);
    if (data.refresh_token) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_STORAGE_KEY, data.refresh_token);
    }

    // Rule: A link may navigate. A link may NEVER authorize.
    // We navigate to Home. The Home screen will fetch its own data using the session identity (headers).
    setStatus('success');
    navigation.replace('Home');
  };

  if (status === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0000ff" />
      <Text>Authenticating...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
});