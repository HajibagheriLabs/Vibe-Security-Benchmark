import AuthService, { AuthTokens } from './authService';

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Attempts to refresh the access token using the stored refresh token.
 * Returns updated tokens or null if refresh fails.
 */
export async function refreshAccessToken(
  refreshEndpoint: string,
  onRefreshFailed?: () => void
): Promise<AuthTokens | null> {
  const authService = AuthService;
  const refreshToken = await authService.getRefreshToken();

  if (!refreshToken) {
    onRefreshFailed?.();
    return null;
  }

  try {
    const response = await fetch(refreshEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error(`Refresh failed with status ${response.status}`);
    }

    const data: RefreshResponse = await response.json();

    const tokens: AuthTokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };

    await authService.updateTokens(tokens);
    return tokens;
  } catch (error) {
    console.error('Token refresh error', error);
    onRefreshFailed?.();
    return null;
  }
}