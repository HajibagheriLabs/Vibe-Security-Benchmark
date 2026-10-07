// src/auth/oauthAuthorization.ts
import { secureStore } from '../storage/secureStore';
import { setPendingOAuthState } from './oauthRedirectHandler';
import { Linking } from 'react-native';

/**
 * Security rules applied:
 * - §4 Deep Links: PKCE S256, random session-bound state, Custom Tabs
 *   (never embedded WebView), no client secret on device.
 * - §3 Binary Trust: authorization endpoint is https-only.
 */

const AUTHORIZATION_ENDPOINT = 'https://auth.example.com/oauth/authorize';
const CLIENT_ID = 'com.example.app'; // Public identifier only — not a secret
const REDIRECT_URI = 'https://auth.example.com/oauth/callback';

function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint8Array(length);
  // Use crypto.getRandomValues for secure randomness
  crypto.getRandomValues(randomValues);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  return result;
}

async function generatePkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = generateRandomString(64);

  // SHA-256 hash, base64url-encoded
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const challenge = btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return { verifier, challenge };
}

export async function beginOAuthFlow(): Promise<void> {
  const state = generateRandomString(48);
  const { verifier, challenge } = await generatePkcePair();

  // Store PKCE verifier in secure store (needed for code exchange)
  await secureStore.savePkceVerifier(verifier);

  // Store state in memory only — session-bound, single-use
  setPendingOAuthState(state);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    scope: 'openid profile',
  });

  const authUrl = `${AUTHORIZATION_ENDPOINT}?${params.toString()}`;

  // Opens in Custom Tabs / external browser — never embedded WebView
  await Linking.openURL(authUrl);
}