import { TokenResponse, UserSession } from '../types/auth';

const TOKEN_ENDPOINT = 'https://auth.example.com/oauth/token';
const CLIENT_ID = 'your-client-id';
const CLIENT_SECRET = 'your-client-secret';
const REDIRECT_URI = 'com.yourapp://oauth2redirect';

export class AuthService {
  static async exchangeCodeForSession(code: string): Promise<UserSession> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    });

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Token exchange failed: ${errorData.error_description || response.statusText}`
      );
    }

    const tokenData: TokenResponse = await response.json();

    const userInfo = await this.fetchUserInfo(tokenData.access_token);

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      idToken: tokenData.id_token,
      expiresIn: tokenData.expires_in,
      user: userInfo,
    };
  }

  static async refreshAccessToken(refreshToken: string): Promise<Pick<UserSession, 'accessToken' | 'expiresIn'>> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    });

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  }

  static async revokeToken(token: string): Promise<void> {
    await fetch('https://auth.example.com/oauth/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }).toString(),
    });
  }

  private static async fetchUserInfo(accessToken: string) {
    const response = await fetch('https://auth.example.com/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    return response.json();
  }
}