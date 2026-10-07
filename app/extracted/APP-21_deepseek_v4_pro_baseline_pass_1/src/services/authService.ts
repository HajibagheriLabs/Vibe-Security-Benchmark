/**
 * Authentication service for exchanging OAuth authorization codes
 * for user sessions.
 */

import { Platform } from 'react-native';
import { API_BASE_URL, OAUTH_CLIENT_ID } from '../config/environment';

export interface TokenExchangeResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  id_token?: string;
}

export interface UserSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
}

/**
 * Exchange an OAuth authorization code for a user session.
 *
 * @param code - The authorization code from the redirect callback
 * @param redirectUri - The redirect URI used in the authorization request
 * @returns A fully-formed user session
 * @throws If the token exchange fails
 */
export async function exchangeAuthCodeForSession(
  code: string,
  redirectUri: string,
): Promise<UserSession> {
  const tokenEndpoint = `${API_BASE_URL}/oauth/token`;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: OAUTH_CLIENT_ID,
  });

  let response: Response;

  try {
    response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'X-Platform': Platform.OS,
      },
      body: body.toString(),
    });
  } catch (networkError) {
    throw new Error(
      `Network error during token exchange: ${
        networkError instanceof Error ? networkError.message : 'Unknown error'
      }`,
    );
  }

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}`;
    try {
      const errorBody = await response.json();
      if (errorBody?.error_description) {
        errorDetail = errorBody.error_description;
      } else if (errorBody?.error) {
        errorDetail = errorBody.error;
      }
    } catch {
      // Non-JSON error response — use status code only
    }
    throw new Error(`Token exchange failed: ${errorDetail}`);
  }

  let tokenData: TokenExchangeResponse;

  try {
    tokenData = (await response.json()) as TokenExchangeResponse;
  } catch {
    throw new Error('Token exchange returned invalid JSON response');
  }

  if (!tokenData.access_token) {
    throw new Error('Token exchange response missing access_token');
  }

  // Extract user ID from ID token if available, otherwise use a placeholder
  // In production, decode the JWT or call a userinfo endpoint
  const userId = extractUserIdFromToken(tokenData);

  const session: UserSession = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || '',
    expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
    userId,
  };

  return session;
}

/**
 * Extract the user ID from the token response.
 * Attempts to decode the ID token JWT payload if present.
 */
function extractUserIdFromToken(tokenData: TokenExchangeResponse): string {
  if (tokenData.id_token) {
    try {
      const payload = decodeJwtPayload(tokenData.id_token);
      if (payload?.sub) {
        return payload.sub;
      }
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: use a hash of the access token as a temporary identifier
  // In production, call the userinfo endpoint or decode the access token
  return `user_${hashString(tokenData.access_token)}`;
}

/**
 * Decode the payload portion of a JWT without verifying the signature.
 * Used only for extracting non-sensitive claims like `sub`.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const payload = parts[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );
    const decoded = atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Simple string hash for generating a fallback user identifier.
 */
function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}