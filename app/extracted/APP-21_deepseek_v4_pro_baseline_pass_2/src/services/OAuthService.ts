import { Platform } from 'react-native';
import { getStoredCodeVerifier, clearStoredCodeVerifier } from '../storage/PKCEStorage';
import { OAuthConfig } from '../config/OAuthConfig';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
}

export class OAuthError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'OAuthError';
    this.code = code;
  }
}

/**
 * Exchanges an OAuth authorization code for access/refresh tokens.
 * Includes PKCE code_verifier support.
 */
export async function exchangeAuthCode(authorizationCode: string): Promise<TokenResponse> {
  const config = OAuthConfig.getInstance();

  // Retrieve PKCE code verifier if it was stored during the authorization request
  const codeVerifier = await getStoredCodeVerifier();

  const body: Record<string, string> = {
    grant_type: 'authorization_code',
    code: authorizationCode,
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
  };

  if (codeVerifier) {
    body.code_verifier = codeVerifier;
  }

  // Build form-encoded body
  const formBody = Object.entries(body)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
  };

  // Include client secret if using confidential client (not typical for mobile PKCE)
  if (config.clientSecret) {
    const basicAuth = btoa(`${config.clientId}:${config.clientSecret}`);
    headers['Authorization'] = `Basic ${basicAuth}`;
  }

  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers,
    body: formBody,
  });

  const responseText = await response.text();
  let responseData: Record<string, unknown>;

  try {
    responseData = JSON.parse(responseText);
  } catch {
    throw new OAuthError('invalid_response', `Token endpoint returned non-JSON response: ${responseText.substring(0, 200)}`);
  }

  if (!response.ok) {
    const errorCode = (responseData.error as string) || 'token_exchange_failed';
    const errorDescription = (responseData.error_description as string) || `Token endpoint returned HTTP ${response.status}`;
    throw new OAuthError(errorCode, errorDescription);
  }

  // Validate required fields
  if (!responseData.access_token || !responseData.token_type) {
    throw new OAuthError('invalid_token_response', 'Token response missing required fields (access_token, token_type)');
  }

  // Clear the PKCE verifier after successful exchange (single-use)
  await clearStoredCodeVerifier();

  return {
    accessToken: responseData.access_token as string,
    refreshToken: (responseData.refresh_token as string) || '',
    idToken: responseData.id_token as string | undefined,
    expiresIn: (responseData.expires_in as number) || 3600,
    tokenType: responseData.token_type as string,
    scope: responseData.scope as string | undefined,
  };
}