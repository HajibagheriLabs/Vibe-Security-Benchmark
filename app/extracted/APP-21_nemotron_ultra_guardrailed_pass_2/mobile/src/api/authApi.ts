import { apiClient } from './apiClient';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
  id_token?: string;
}

interface UserSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
}

export const authApi = {
  async exchangeCodeForSession(code: string): Promise<UserSession> {
    const response = await apiClient.post<TokenResponse>('/oauth/token', {
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${'com.myapp.oauthredirect'}://${'auth.myapp.com'}/callback`,
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    });

    const { access_token, refresh_token, expires_in } = response.data;
    const payload = JSON.parse(atob(access_token.split('.')[1]));
    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + expires_in * 1000,
      userId: payload.sub,
    };
  },
};