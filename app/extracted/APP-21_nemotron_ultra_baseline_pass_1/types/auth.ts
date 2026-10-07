export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
}

export interface UserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture?: string;
  locale?: string;
}

export interface UserSession {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
  user: UserInfo;
}

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
  obtainedAt: number;
}