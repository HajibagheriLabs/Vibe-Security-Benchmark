// src/auth/tokenExchange.ts
import { secureStore } from '../storage/secureStore';

/**
 * Security rules applied:
 * - §3 Binary Trust: code exchange happens on our server; the app never
 *   holds a client secret. PKCE verifier is sent to our gateway, which
 *   completes the exchange with the OAuth provider.
 * - §1 Storage: refresh credential returned to secure store only.
 */

const GATEWAY_URL = 'https://api.example.com/v1/oauth/exchange';

export interface OAuthSession {
  accessToken: string;
  refreshCredential: string;
  userId: string;
  expiresAt: number;
}

interface ExchangeResponse {
  access_token: string;
  refresh_credential: string;
  user_id: string;
  expires_in: number;
}

export async function exchangeAuthCode(
  code: string,
  route: 'callback' | 'reauth',
): Promise<OAuthSession> {
  // Retrieve PKCE verifier from secure store (set during authorization request)
  const pkceVerifier = await secureStore.getPkceVerifier();

  if (!pkceVerifier) {
    throw new Error('PKCE verifier not found');
  }

  const response = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      route,
      code_verifier: pkceVerifier,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  const data: ExchangeResponse = await response.json();

  // Clear PKCE verifier after successful exchange
  await secureStore.clearPkceVerifier();

  return {
    accessToken: data.access_token,
    refreshCredential: data.refresh_credential,
    userId: data.user_id,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}