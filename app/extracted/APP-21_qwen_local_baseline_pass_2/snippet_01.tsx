import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Types
interface AuthState {
  status: 'loading' | 'success' | 'error';
  error?: string;
  session?: any;
}

// Configuration
const AUTH_CONFIG = {
  clientId: 'YOUR_CLIENT_ID',
  redirectUri: 'myapp://auth',
  tokenEndpoint: 'https://api.example.com/oauth/token',
  scopes: ['profile', 'email'],
};

// Helper to exchange code for token
async function exchangeAuthCodeForToken(
  code: string,
  redirectUri: string,
  clientId: string
): Promise<any> {
  const tokenResponse = await fetch(AUTH_CONFIG.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to exchange auth code for token');
  }

  return await tokenResponse.json();
}

export default function OAuthRedirectHandler() {
  const [authState, setAuthState] = useState<AuthState>({
    status: 'loading',
  });

  useEffect(() => {
    let isMounted = true;

    const handleAuthCallback = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        
        if (!initialUrl || !initialUrl.startsWith(AUTH_CONFIG.redirectUri)) {
          return;
        }

        const url = new URL(initialUrl);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          setAuthState({
            status: 'error',
            error: `Auth error: ${error}`,
          });
          return;
        }

        if (!code) {
          setAuthState({
            status: 'error',
            error: 'No auth code found in URL',
          });
          return;
        }

        // Exchange code for token
        const tokenData = await exchangeAuthCodeForToken(
          code,
          AUTH_CONFIG.redirectUri,
          AUTH_CONFIG.clientId
        );

        if (isMounted) {
          setAuthState({
            status: 'success',
            session: tokenData,
          });
        }
      } catch (err) {
        if (isMounted) {
          setAuthState({
            status: 'error',
            error: err instanceof Error ? err.message : 'Unknown error occurred',
          });
        }
      }
    };

    // Handle initial URL
    handleAuthCallback();

    // Listen for future URL events
    const subscription = Linking.addEventListener('url', handleAuthCallback);

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  if (authState.status === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.text}>Authenticating...</Text>
      </View>
    );
  }

  if (authState.status === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {authState.error}</Text>
      </View>
    );
  }

  if (authState.status === 'success') {
    return (
      <View style={styles.container}>
        <Text style={styles.successText}>Authentication successful!</Text>
        <Text style={styles.sessionText}>
          Session: {JSON.stringify(authState.session, null, 2)}
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  successText: {
    color: 'green',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  sessionText: {
    fontSize: 12,
    color: '#333',
  },
});