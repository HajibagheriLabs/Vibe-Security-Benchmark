import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Linking, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthService } from './services/AuthService';
import { TokenStorage } from './services/TokenStorage';

type RootStackParamList = {
  AuthCallback: { code?: string; error?: string; state?: string };
  Home: undefined;
  Login: undefined;
};

export default function AuthCallbackScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url) {
          await processCallbackUrl(url);
        }
      } catch (err) {
        setError('Failed to process callback');
        setLoading(false);
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      processCallbackUrl(url);
    });

    handleCallback();

    return () => {
      subscription.remove();
    };
  }, []);

  const processCallbackUrl = async (url: string) => {
    setLoading(true);
    setError(null);

    try {
      const parsedUrl = new URL(url);
      const code = parsedUrl.searchParams.get('code');
      const error = parsedUrl.searchParams.get('error');
      const state = parsedUrl.searchParams.get('state');
      const returnedState = parsedUrl.searchParams.get('state');

      if (error) {
        throw new Error(`OAuth error: ${error}`);
      }

      if (!code) {
        throw new Error('No authorization code received');
      }

      const storedState = await TokenStorage.getOAuthState();
      if (storedState && returnedState !== storedState) {
        throw new Error('Invalid state parameter - possible CSRF attack');
      }

      const session = await AuthService.exchangeCodeForSession(code);

      await TokenStorage.storeTokens({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        idToken: session.idToken,
        expiresIn: session.expiresIn,
      });

      await TokenStorage.clearOAuthState();

      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
      setLoading(false);

      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }, 3000);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Completing sign in...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <Text style={styles.subText}>Redirecting to login...</Text>
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
    padding: 24,
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    fontSize: 18,
    color: '#DC3545',
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});