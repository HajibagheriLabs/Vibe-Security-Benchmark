// src/services/auth/TokenRefresher.ts
import AuthService from './AuthService';

/**
 * Handles automatic token refresh using the persisted refresh token.
 * 
 * SECURITY DECISIONS:
 * - Refresh endpoint must be HTTPS (enforced by network layer)
 * - Refresh token sent only to our authenticated endpoint
 * - On refresh failure (401/403), all tokens are cleared
 * - New refresh token rotation is handled securely
 */

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

class TokenRefresher {
  private static instance: TokenRefresher;
  private refreshPromise: Promise<string | null> | null = null;

  private constructor() {}

  static getInstance(): TokenRefresher {
    if (!TokenRefresher.instance) {
      TokenRefresher.instance = new TokenRefresher();
    }
    return TokenRefresher.instance;
  }

  /**
   * Attempt to refresh the access token using the stored refresh token.
   * Returns new access token or null if refresh fails.
   */
  async refreshAccessToken(): Promise<string | null> {
    // Prevent concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh();
    
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<string | null> {
    const authService = AuthService;
    const refreshToken = await authService.getRefreshToken();

    if (!refreshToken) {
      return null;
    }

    try {
      // SECURITY: This endpoint must be HTTPS. The network layer enforces TLS.
      // The refresh token is sent in the request body, never in URL parameters.
      const response = await fetch('https://api.yourapp.com/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken,
        }),
      });

      if (!response.ok) {
        // Invalid or expired refresh token - clear everything
        await authService.clearAllTokens();
        return null;
      }

      const data: RefreshResponse = await response.json();

      // Validate response contains required fields
      if (!data.accessToken || !data.refreshToken || !data.expiresIn) {
        await authService.clearAllTokens();
        return null;
      }

      // Store new access token in memory
      authService.setAccessToken(data.accessToken, data.expiresIn);

      // Rotate refresh token in secure storage
      await authService.persistRefreshToken(data.refreshToken);

      return data.accessToken;
    } catch (error) {
      // Network errors - don't clear tokens, allow retry
      return null;
    }
  }
}

export default TokenRefresher.getInstance();