/**
 * OAuth 2.0 / OIDC configuration for the mobile app.
 * Values should be injected at build time or via environment configuration.
 */
export interface OAuthConfigShape {
  clientId: string;
  clientSecret?: string;
  tokenEndpoint: string;
  authorizationEndpoint: string;
  redirectUri: string;
  scopes: string[];
}

export class OAuthConfig {
  private static instance: OAuthConfigShape;

  static initialize(config: OAuthConfigShape): void {
    OAuthConfig.instance = config;
  }

  static getInstance(): OAuthConfigShape {
    if (!OAuthConfig.instance) {
      throw new Error('OAuthConfig must be initialized before use. Call OAuthConfig.initialize() at app startup.');
    }
    return OAuthConfig.instance;
  }
}