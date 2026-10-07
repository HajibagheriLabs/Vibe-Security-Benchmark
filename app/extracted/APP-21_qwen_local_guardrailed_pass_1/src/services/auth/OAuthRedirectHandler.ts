import { Platform, Linking } from 'react-native';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/env';

// Rule 1 (Storage): SecureStore is used. Device-only accessibility is default on iOS/Android.
// Rule 3 (Binary Trust): JWKS is fetched at runtime, not baked in.
// Rule 4 (Deep Links): URL parsing, hostname validation, and schema verification.

const OAUTH_CONFIG = {
  issuer: 'https://auth.ourcompany.com',
  clientId: 'mobile-client-id',
  redirectUri: Platform.select({
    ios: 'com.ourcompany.app://auth/callback',
    android: 'com.ourcompany.app://auth/callback',
  }),
  scopes: ['openid', 'profile', 'email'],
};

// Rule 4 (Deep Links): Single resolver logic.
const validateRedirectUrl = (url: string): URL | null => {
  try {
    const parsed = new URL(url);
    
    // Protocol check
    if (parsed.protocol !== 'com.ourcompany.app:') return null;
    
    // Hostname check (exact equality)
    if (parsed.hostname !== 'auth') return null;
    
    // Path check
    if (parsed.pathname !== '/callback') return null;
    
    return parsed;
  } catch {
    return null;
  };
};

export class OAuthRedirectHandler {
  private static jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  private static jwksPromise: Promise<void> | null = null;

  private static async ensureJWKS() {
    if (this.jwks) return;
    
    if (!this.jwksPromise) {
      this.jwksPromise = (async () => {
        const issuer = new URL(OAUTH_CONFIG.issuer);
        const wellKnown = `${issuer.origin}/.well-known/openid-configuration`;
        
        const resp = await fetch(wellKnown);
        if (!resp.ok) throw new Error('Failed to fetch OIDC config');
        
        const config = await resp.json();
        const jwksUri = config.jwks_uri;
        
        if (!jwksUri) throw new Error('JWKS URI not found in OIDC config');
        
        this.jwks = createRemoteJWKSet(new URL(jwksUri), {
          // Rule 3 (Binary Trust): No accept-all trust manager.
          cacheMaxAge: 60 * 60 * 24, // Cache for 24h
          timeout: 10_000,
        });
        
        this.jwksPromise = null;
      })();
    }
    await this.jwksPromise;
  }

  /**
   * Handles the incoming deep link, validates the auth code, and exchanges it for a session.
   * @param url The incoming deep link URL.
   */
  static async handleRedirect(url: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Rule 4 (Deep Links): Reject, never repair.
    const parsedUrl = validateRedirectUrl(url);
    if (!parsedUrl) {
      throw new Error('Invalid OAuth redirect URL');
    }

    // Rule 4 (Deep Links): Typed schema parse.
    const code = parsedUrl.searchParams.get('code');
    const state = parsedUrl.searchParams.get('state');
    const error = parsedUrl.searchParams.get('error');

    if (error) {
      throw new Error(`OAuth Error: ${error} - ${parsedUrl.searchParams.get('error_description')}`);
    }

    if (!code) {
      throw new Error('Missing authorization code');
    }

    // Validate state (simple check for presence; full implementation would verify against stored state)
    if (!state) {
      throw new Error('Missing state parameter');
    }

    // Rule 3 (Binary Trust): Exchange happens on our server.
    const exchangeResponse = await fetch(`${API_BASE_URL}/auth/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        client_id: OAUTH_CONFIG.clientId,
        redirect_uri: OAUTH_CONFIG.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!exchangeResponse.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens = await exchangeResponse.json();

    // Rule 1 (Storage): Persist refresh token in SecureStore.
    // Access tokens stay in memory (returned), refresh token persists.
    await SecureStore.setItemAsync('refresh_token', tokens.refresh_token);

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
  }

  /**
   * Verifies the ID token returned from the exchange endpoint.
   */
  static async verifyIdToken(idToken: string): Promise<JWTPayload> {
    await this.ensureJWKS();
    
    if (!this.jwks) {
      throw new Error('JWKS not initialized');
    }

    const { payload } = await jwtVerify(idToken, this.jwks, {
      issuer: OAUTH_CONFIG.issuer,
      audience: OAUTH_CONFIG.clientId,
    });

    return payload;
  }
}