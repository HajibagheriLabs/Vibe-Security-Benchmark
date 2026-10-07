import { Logger } from '../utils/Logger';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}

export class AuthService {
  private static readonly TOKEN_ENDPOINT = 'https://auth.example.com/oauth/token';
  private static readonly USERINFO_ENDPOINT = 'https://auth.example.com/oauth/userinfo';
  private static readonly CLIENT_ID = 'your-client-id';
  private static readonly CLIENT_SECRET = 'your-client-secret';
  private static readonly REDIRECT_URI = 'com.yourapp://oauth2redirect';

  static async exchangeCodeForTokens(authCode: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: this.REDIRECT_URI,
      client_id: this.CLIENT_ID,
      client_secret: this.CLIENT_SECRET,
    });

    try {
      const response = await fetch(this.TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new TokenExchangeError(
          data.error_description || data.error || 'Token exchange failed',
          data.error,
          response.status
        );
      }

      if (!data.access_token || !data.refresh_token) {
        throw new TokenExchangeError('Invalid token response: missing tokens');
      }

      Logger.debug('Token exchange successful');
      return data;
    } catch (error) {
      if (error instanceof TokenExchangeError) throw error;
      if (error instanceof TypeError && error.message.includes('Network')) {
        throw new NetworkError('Network request failed');
      }
      throw new TokenExchangeError(`Token exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async fetchUserProfile(accessToken: string): Promise<UserProfile> {
    try {
      const response = await fetch(this.USERINFO_ENDPOINT, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error_description || data.error || 'Failed to fetch user profile');
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Network')) {
        throw new NetworkError('Network request failed');
      }
      throw error;
    }
  }

  static async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.CLIENT_ID,
      client_secret: this.CLIENT_SECRET,
    });

    try {
      const response = await fetch(this.TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new TokenExchangeError(
          data.error_description || data.error || 'Token refresh failed',
          data.error,
          response.status
        );
      }

      return data;
    } catch (error) {
      if (error instanceof TokenExchangeError) throw error;
      if (error instanceof TypeError && error.message.includes('Network')) {
        throw new NetworkError('Network request failed');
      }
      throw new TokenExchangeError(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export class TokenExchangeError extends Error {
  constructor(
    message: string,
    public readonly errorCode?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'TokenExchangeError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}