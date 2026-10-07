import React from 'react';
import { useAuthRequest } from 'expo-auth-session';
import { generatePKCEPair } from './PKCEGenerator';
import { Platform } from 'react-native';

const AUTH_ENDPOINT = 'https://auth.myapp.com/oauth/authorize';
const OAUTH_REDIRECT_SCHEME = 'com.myapp.oauthredirect';
const ALLOWED_REDIRECT_HOST = 'auth.myapp.com';

export function useOAuthLogin(): () => Promise<void> {
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: 'mobile-app-client-id',
      redirectUri: `${OAUTH_REDIRECT_SCHEME}://${ALLOWED_REDIRECT_HOST}/callback`,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      responseType: 'code',
      usePKCE: false,
    },
    {
      authorizationEndpoint: AUTH_ENDPOINT,
    }
  );

  const launch = React.useCallback(async () => {
    if (!request) return;

    const { codeChallenge, state } = await generatePKCEPair();

    const authUrl = new URL(request.url);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', state);

    await promptAsync({ url: authUrl.toString() });
  }, [promptAsync, request]);

  return launch;
}

export function OAuthLoginButton(): React.ReactElement {
  const launchLogin = useOAuthLogin();
  return (
    <button onPress={launchLogin} style={{ padding: 16, backgroundColor: '#007AFF' }}>
      Sign In with OAuth
    </button>
  );
}