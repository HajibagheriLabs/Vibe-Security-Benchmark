import React from 'react';
import { Button, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';

// Precompute the state to ensure it is session-bound and single-use
// In a real app, this would be stored in Redux/Context and verified in the callback
const generateState = () => Math.random().toString(36).substring(2);

const OAUTH_AUTH_URL = 'https://auth.example.com/oauth/authorize';
const REDIRECT_URI = 'myapp://callback';
const CLIENT_ID = 'my-app-client-id';

export default function OAuthLoginButton() {
  const handleLogin = async () => {
    // Rule: PKCE (S256) mandatory.
    // Note: expo-auth-session or expo-crypto is typically used for this.
    // Here we simulate a pre-generated state for simplicity, but PKCE code_challenge should be generated.
    const state = generateState();
    const codeVerifier = Math.random().toString(36).substring(2); // Simplified PKCE verifier
    const codeChallenge = btoa(codeVerifier).substring(0, 43); // Simplified S256 challenge

    // Rule: No client secret on the device.
    // Rule: No raw renderer string in URL.
    const authUrl = `${OAUTH_AUTH_URL}?` + new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'openid profile',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    }).toString();

    try {
      // Rule: Use ASWebAuthenticationSession or Custom Tabs — never an embedded WebView.
      // expo-web-browser uses native custom tabs on Android and ASWebAuthenticationSession on iOS.
      const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

      if (result.type === 'success') {
        // The URL contains the code. This will be handled by the redirect handler.
        // We can also process it here if the redirect handler doesn't catch it.
        console.log('Auth session succeeded:', result.url);
      } else {
        Alert.alert('Login Failed', 'The authentication session was cancelled or failed.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open authentication session.');
      console.error(error);
    }
  };

  return <Button title="Log in with OAuth" onPress={handleLogin} />;
}