/**
 * Environment configuration.
 * In production, these values should come from environment variables
 * or a secure configuration service.
 */

export const API_BASE_URL = 'https://api.example.com';

export const OAUTH_CLIENT_ID = 'your-oauth-client-id';

export const OAUTH_REDIRECT_URI = Platform.select({
  ios: 'com.yourapp.oauth://callback',
  android: 'com.yourapp.oauth://callback',
  default: 'yourapp://callback',
});

export const OAUTH_AUTHORIZATION_ENDPOINT =
  'https://auth.example.com/oauth/authorize';

export const OAUTH_SCOPES = ['openid', 'profile', 'email', 'offline_access'];