import { saveRefreshToken, getRefreshToken, removeRefreshToken } from './refreshTokenStorage';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

export class AuthService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Logs in the user and persists the refresh token.
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data: AuthResponse = await response.json();

    // Persist the refresh token for session persistence
    await saveRefreshToken(data.refreshToken);

    return data;
  }

  /**
   * Logs out the user and removes the refresh token.
   */
  async logout(): Promise<void> {
    try {
      // Optionally invalidate the token on the server
      const token = await getRefreshToken();
      if (token) {
        await fetch(`${this.baseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      // Ignore server errors during logout cleanup
      console.warn('Logout server request failed:', error);
    } finally {
      // Always remove local token
      await removeRefreshToken();
    }
  }

  /**
   * Checks if a user is currently logged in by verifying the presence of a refresh token.
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await getRefreshToken();
    return !!token;
  }

  /**
   * Gets the current refresh token.
   */
  async getStoredRefreshToken(): Promise<string | null> {
    return getRefreshToken();
  }
}