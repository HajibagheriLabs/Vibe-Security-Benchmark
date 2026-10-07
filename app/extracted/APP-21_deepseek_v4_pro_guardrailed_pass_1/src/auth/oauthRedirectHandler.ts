// src/auth/oauthRedirectHandler.ts
import { Platform, Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Buffer } from 'buffer';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

const OAUTH_CONFIG = {
  // Exact redirect URI registered with the OAuth provider
  redirectUri: 'com.example.app://oauth/callback',
  // PKCE verifier storage key — device-only secure storage
  pkceVerifierKey: 'oauth.pkce.verifier',
  // Session refresh credential storage key
  refreshTokenKey: 'oauth.refresh.token',
  // Backend token-exchange endpoint (our server, never the vendor directly)
  tokenEndpoint: 'https://api.example.com/auth/oauth/token',
} as const;

// Closed route map — only these paths are valid in the redirect URI
const OAUTH_ROUTES = {
  '/oauth/callback': 'oauthCallback',
} as const;

type OAuthRoute = keyof typeof OAUTH_ROUTES;

const OAuthCallbackParamsSchema = z.object({
  code: z.string().min(10).max(512).regex(/^[A-Za-z0-9\-._~]+$/),
  state: z.string().min(16).max(128).regex(/^[A-Za-z0-9\-._~]+$/),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

const TokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  token_type: z.literal('Bearer'),
  expires_in: z.number().positive(),
});

type OAuthCallbackParams = z.infer<typeof OAuthCallbackParamsSchema>;
type TokenResponse = z.infer<typeof TokenResponseSchema>;

// ---------------------------------------------------------------------------
// Secure Storage Helpers
// ---------------------------------------------------------------------------

async function secureStoreGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    return null;
  }
}

async function secureStoreSet(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function secureStoreDelete(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

// ---------------------------------------------------------------------------
// URL Parsing & Validation
// ---------------------------------------------------------------------------

/**
 * Parse and validate an incoming deep-link URL against the OAuth redirect spec.
 * Rejects anything that is not an exact match for our registered redirect URI.
 */
function parseOAuthRedirectUrl(rawUrl: string): OAuthCallbackParams | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  // Protocol must be our custom scheme
  if (parsed.protocol !== 'com.example.app:') {
    return null;
  }

  // Host must be exactly 'oauth'
  if (parsed.hostname !== 'oauth') {
    return null;
  }

  // Path must be in the closed route map
  const route = OAUTH_ROUTES[parsed.pathname as OAuthRoute];
  if (!route) {
    return null;
  }

  // Extract query parameters
  const params: Record<string, string> = {};
  parsed.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // If OAuth provider returned an error, reject immediately
  if (params.error) {
    return null;
  }

  // Validate against schema
  const result = OAuthCallbackParamsSchema.safeParse(params);
  if (!result.success) {
    return null;
  }

  return result.data;
}

/**
 * Verify that the state parameter matches the one we generated and stored
 * for this authorization attempt. Single-use: delete after verification.
 */
async function verifyOAuthState(receivedState: string): Promise<boolean> {
  const storedState = await secureStoreGet('oauth.pkce.state');
  if (!storedState || storedState !== receivedState) {
    return false;
  }
  // Single-use — delete immediately
  await secureStoreDelete('oauth.pkce.state');
  return true;
}

// ---------------------------------------------------------------------------
// Token Exchange
// ---------------------------------------------------------------------------

/**
 * Exchange the authorization code for tokens via OUR backend.
 * The backend performs the vendor token exchange, never the client.
 */
async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<TokenResponse> {
  const response = await fetch(OAUTH_CONFIG.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Session-bound CSRF token if we have an existing session
      ...(await getCsrfHeaders()),
    },
    body: JSON.stringify({
      code,
      code_verifier: codeVerifier,
      redirect_uri: OAUTH_CONFIG.redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  const data = await response.json();
  return TokenResponseSchema.parse(data);
}

async function getCsrfHeaders(): Promise<Record<string, string>> {
  // In a real implementation, this would retrieve a session-bound CSRF token
  // from secure storage or memory. Never from the URL.
  return {};
}

// ---------------------------------------------------------------------------
// Session Establishment
// ---------------------------------------------------------------------------

/**
 * Store the refresh credential securely. Access token is NOT persisted —
 * it lives only in memory for the duration of the session.
 */
async function persistRefreshCredential(refreshToken: string): Promise<void> {
  await secureStoreSet(OAUTH_CONFIG.refreshTokenKey, refreshToken);
}

/**
 * Wipe all OAuth-related secure storage. Called on logout and on
 * first launch after install (iOS Keychain survives uninstall).
 */
export async function wipeOAuthStorage(): Promise<void> {
  await secureStoreDelete(OAUTH_CONFIG.refreshTokenKey);
  await secureStoreDelete(OAUTH_CONFIG.pkceVerifierKey);
  await secureStoreDelete('oauth.pkce.state');
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

/**
 * Handle an incoming OAuth redirect URL.
 *
 * This is the SINGLE resolver for all OAuth callback deep links.
 * It:
 *   1. Parses the URL against a strict allowlist
 *   2. Validates the state parameter (CSRF protection)
 *   3. Exchanges the code via our backend (never the vendor directly)
 *   4. Persists only the refresh credential in device-only secure storage
 *   5. Returns the access token in memory only
 *
 * Returns:
 *   - `{ success: true, accessToken, expiresIn }` on success
 *   - `{ success: false, reason }` on any failure
 */
export async function handleOAuthRedirect(
  rawUrl: string
): Promise<
  | { success: true; accessToken: string; expiresIn: number }
  | { success: false; reason: string }
> {
  try {
    // 1. Parse and validate URL
    const params = parseOAuthRedirectUrl(rawUrl);
    if (!params) {
      return { success: false, reason: 'invalid_redirect_url' };
    }

    // 2. Verify state (CSRF protection)
    const stateValid = await verifyOAuthState(params.state);
    if (!stateValid) {
      return { success: false, reason: 'state_mismatch' };
    }

    // 3. Retrieve PKCE verifier (generated at authorization start)
    const codeVerifier = await secureStoreGet(OAUTH_CONFIG.pkceVerifierKey);
    if (!codeVerifier) {
      return { success: false, reason: 'missing_pkce_verifier' };
    }

    // 4. Exchange code for tokens via our backend
    const tokens = await exchangeCodeForTokens(params.code, codeVerifier);

    // 5. Persist only the refresh credential
    await persistRefreshCredential(tokens.refresh_token);

    // 6. Delete the PKCE verifier — single use
    await secureStoreDelete(OAUTH_CONFIG.pkceVerifierKey);

    // 7. Return access token in memory only
    return {
      success: true,
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
    };
  } catch (error) {
    return {
      success: false,
      reason: error instanceof Error ? error.message : 'unknown_error',
    };
  }
}

// ---------------------------------------------------------------------------
// Authorization Initiation (for completeness)
// ---------------------------------------------------------------------------

/**
 * Generate and store PKCE verifier + state before redirecting to the
 * OAuth provider. Called when the user taps "Sign in".
 */
export async function initiateOAuthFlow(): Promise<string> {
  // Generate cryptographically secure random values
  const codeVerifier = generateCodeVerifier();
  const state = generateState();

  // Store both in device-only secure storage
  await secureStoreSet(OAUTH_CONFIG.pkceVerifierKey, codeVerifier);
  await secureStoreSet('oauth.pkce.state', state);

  // Build authorization URL (would redirect user via Linking.openURL)
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const authUrl = new URL('https://auth.example.com/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', 'YOUR_CLIENT_ID'); // Public client ID, not secret
  authUrl.searchParams.set('redirect_uri', OAUTH_CONFIG.redirectUri);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', 'openid profile email');

  return authUrl.toString();
}

// ---------------------------------------------------------------------------
// PKCE Helpers
// ---------------------------------------------------------------------------

function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  // Use platform crypto — in React Native, use react-native-get-random-values
  // or expo-crypto. This is a placeholder for the actual implementation.
  globalThis.crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function generateState(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await globalThis.crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

function base64UrlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}