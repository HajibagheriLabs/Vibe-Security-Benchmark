// src/auth/oauthRedirectHandler.ts
import { Alert, Linking } from 'react-native';
import { parse, URL } from 'react-native-url-polyfill';
import { exchangeAuthCode } from './tokenExchange';
import { secureStore } from '../storage/secureStore';
import { navigationService } from '../navigation/navigationService';

/**
 * Security rules applied:
 * - §4 Deep Links: single resolver, exact hostname allowlist, https-only,
 *   no authority/identity from URL, no mutation from link handling.
 * - §1 Storage: refresh credential only in secure store (Keychain/Keystore),
 *   access token in memory only.
 * - §3 Binary Trust: no client secret in bundle; PKCE code exchange via our gateway.
 */

type OAuthRoute = 'callback' | 'reauth';

interface OAuthCallbackParams {
  code: string;
  state: string;
  error?: string;
  error_description?: string;
}

interface ParsedOAuthLink {
  route: OAuthRoute;
  params: OAuthCallbackParams;
}

const ALLOWED_HOSTS = new Set(['auth.example.com', 'login.example.com']);
const ALLOWED_PATHS: Record<string, OAuthRoute> = {
  '/oauth/callback': 'callback',
  '/oauth/reauth': 'reauth',
};

const CODE_REGEX = /^[A-Za-z0-9\-._~]{20,512}$/;
const STATE_REGEX = /^[A-Za-z0-9\-._~]{32,128}$/;

// Session-bound, single-use state generated at authorization request time.
// Stored in memory only; cleared after successful exchange.
let pendingOAuthState: string | null = null;

export function setPendingOAuthState(state: string): void {
  pendingOAuthState = state;
}

export function clearPendingOAuthState(): void {
  pendingOAuthState = null;
}

/**
 * Single resolver for all incoming OAuth redirect URLs.
 * Rejects anything that is not an exact-match https URL on an allowlisted host.
 */
export function parseOAuthRedirect(rawUrl: string): ParsedOAuthLink | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  // Protocol must be https exactly
  if (parsed.protocol !== 'https:') {
    return null;
  }

  // Exact hostname match — never startsWith/includes/endsWith
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return null;
  }

  // No credentials in URL
  if (parsed.username !== '' || parsed.password !== '') {
    return null;
  }

  const route = ALLOWED_PATHS[parsed.pathname];
  if (!route) {
    return null;
  }

  const code = parsed.searchParams.get('code');
  const state = parsed.searchParams.get('state');
  const error = parsed.searchParams.get('error');
  const errorDescription = parsed.searchParams.get('error_description');

  if (error) {
    return {
      route,
      params: {
        code: '',
        state: state ?? '',
        error,
        error_description: errorDescription ?? undefined,
      },
    };
  }

  if (!code || !state) {
    return null;
  }

  // Typed, bounded validation — reject, never repair
  if (!CODE_REGEX.test(code) || !STATE_REGEX.test(state)) {
    return null;
  }

  return {
    route,
    params: { code, state },
  };
}

/**
 * Main entry point for handling an OAuth redirect.
 * Called from the app's single deep-link handler.
 */
export async function handleOAuthRedirect(rawUrl: string): Promise<void> {
  const parsed = parseOAuthRedirect(rawUrl);
  if (!parsed) {
    // Reject silently — do not navigate, do not show attacker-controlled data
    navigationService.navigateToFallback();
    return;
  }

  const { route, params } = parsed;

  if (params.error) {
    clearPendingOAuthState();
    Alert.alert(
      'Authentication Failed',
      'The authorization request was denied or failed. Please try again.',
    );
    navigationService.navigateToFallback();
    return;
  }

  // State validation: must match the pending state exactly, single-use
  if (!pendingOAuthState || params.state !== pendingOAuthState) {
    clearPendingOAuthState();
    navigationService.navigateToFallback();
    return;
  }

  // Clear state immediately — single-use, prevents replay
  clearPendingOAuthState();

  try {
    // Exchange code via our backend gateway (never call the OAuth provider
    // directly from the device — no client secret in the bundle)
    const session = await exchangeAuthCode(params.code, route);

    // Persist only the refresh credential in secure storage
    await secureStore.saveRefreshCredential(session.refreshCredential);

    // Access token lives in memory only
    navigationService.setSession({
      accessToken: session.accessToken,
      userId: session.userId,
      expiresAt: session.expiresAt,
    });

    navigationService.navigateToAuthenticatedHome();
  } catch (err) {
    Alert.alert(
      'Authentication Failed',
      'Unable to complete sign-in. Please try again.',
    );
    navigationService.navigateToFallback();
  }
}

/**
 * Attach this handler to the app's single deep-link entry point.
 * In App.tsx or index.js:
 *
 *   Linking.addEventListener('url', ({ url }) => {
 *     handleOAuthRedirect(url);
 *   });
 *
 * Also handle the initial URL on cold start:
 *   Linking.getInitialURL().then(url => {
 *     if (url) handleOAuthRedirect(url);
 *   });
 */