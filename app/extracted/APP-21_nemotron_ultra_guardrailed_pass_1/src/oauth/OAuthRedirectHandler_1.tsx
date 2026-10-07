import React, { useEffect, useCallback } from 'react';
import { Linking, Platform, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthSession } from 'expo-auth-session';
import { router } from 'expo-router';

const OAUTH_REDIRECT_SCHEME = 'com.myapp.oauthredirect';
const ALLOWED_REDIRECT_HOST = 'auth.myapp.com';
const TOKEN_ENDPOINT = 'https://api.myapp.com/v1/oauth/token';
const SESSION_ENDPOINT = 'https://api.myapp.com/v1/session';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
  scope: string;
}

interface SessionResponse {
  user_id: string;
  email: string;
  roles: string[];
  entitlements: string[];
}

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'com.myapp.secure',
  keychainAccessible: Platform.OS === 'ios'
    ? SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    : SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

async function storeTokensSecurely(tokens: TokenResponse): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync('access_token', tokens.access_token, SECURE_STORE_OPTIONS),
    SecureStore.setItemAsync('refresh_token', tokens.refresh_token, SECURE_STORE_OPTIONS),
    SecureStore.setItemAsync('token_expires_at', String(Date.now() + tokens.expires_in * 1000), SECURE_STORE_OPTIONS),
  ]);
}

async function clearTokenStore(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync('access_token', SECURE_STORE_OPTIONS),
    SecureStore.deleteItemAsync('refresh_token', SECURE_STORE_OPTIONS),
    SecureStore.deleteItemAsync('token_expires_at', SECURE_STORE_OPTIONS),
    SecureStore.deleteItemAsync('pkce_verifier', SECURE_STORE_OPTIONS),
  ]);
}

async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TokenResponse> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${OAUTH_REDIRECT_SCHEME}://${ALLOWED_REDIRECT_HOST}/callback`,
      code_verifier: codeVerifier,
      client_id: 'mobile-app-client-id',
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Token exchange failed: ${response.status} ${error.error_description ?? ''}`);
  }

  const data = await response.json();
  if (!data.access_token || !data.refresh_token || !data.expires_in) {
    throw new Error('Invalid token response');
  }
  return data as TokenResponse;
}

async function fetchSession(accessToken: string): Promise<SessionResponse> {
  const response = await fetch(SESSION_ENDPOINT, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Session fetch failed: ${response.status}`);
  }
  return response.json() as Promise<SessionResponse>;
}

function validateRedirectUrl(url: string): { code: string; state: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== `${OAUTH_REDIRECT_SCHEME}:`) return null;
    if (parsed.host !== ALLOWED_REDIRECT_HOST) return null;
    if (parsed.pathname !== '/callback') return null;

    const code = parsed.searchParams.get('code');
    const state = parsed.searchParams.get('state');
    if (!code || !state) return null;

    if (!/^[A-Za-z0-9\-._~]{10,128}$/.test(code)) return null;
    if (!/^[A-Za-z0-9\-._~]{16,128}$/.test(state)) return null;

    return { code, state };
  } catch {
    return null;
  }
}

export function useOAuthRedirectHandler(): void {
  const handleRedirect = useCallback(async (url: string) => {
    const validated = validateRedirectUrl(url);
    if (!validated) {
      await clearTokenStore();
      router.replace('/login?error=invalid_redirect');
      return;
    }

    const { code, state } = validated;

    const storedVerifier = await SecureStore.getItemAsync('pkce_verifier', SECURE_STORE_OPTIONS);
    const storedState = await SecureStore.getItemAsync('pkce_state', SECURE_STORE_OPTIONS);

    if (!storedVerifier || !storedState || storedState !== state) {
      await clearTokenStore();
      router.replace('/login?error=pkce_mismatch');
      return;
    }

    await SecureStore.deleteItemAsync('pkce_verifier', SECURE_STORE_OPTIONS);
    await SecureStore.deleteItemAsync('pkce_state', SECURE_STORE_OPTIONS);

    try {
      const tokens = await exchangeCodeForTokens(code, storedVerifier);
      await storeTokensSecurely(tokens);
      const session = await fetchSession(tokens.access_token);

      router.replace('/app', { params: { user_id: session.user_id } });
    } catch (error) {
      await clearTokenStore();
      const message = error instanceof Error ? error.message : 'Authentication failed';
      router.replace(`/login?error=${encodeURIComponent(message)}`);
    }
  }, []);

  useEffect(() => {
    const subscription = Linking.addListener('url', ({ url }) => handleRedirect(url));
    Linking.getInitialURL().then((url) => url && handleRedirect(url));
    return () => subscription.remove();
  }, [handleRedirect]);
}

export function OAuthRedirectCallbackScreen(): React.ReactElement {
  useOAuthRedirectHandler();
  return null;
}