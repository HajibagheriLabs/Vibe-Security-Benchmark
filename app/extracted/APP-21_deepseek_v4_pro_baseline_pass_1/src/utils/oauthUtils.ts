/**
 * Utilities for parsing OAuth redirect callback URLs.
 */

export interface ParsedOAuthCallback {
  /** The authorization code, if present */
  code?: string;
  /** OAuth error code, if the authorization failed */
  error?: string;
  /** Human-readable error description */
  errorDescription?: string;
  /** Additional state parameter if present */
  state?: string;
}

/**
 * Parse an incoming deep-link URL and extract OAuth callback parameters.
 *
 * @param url - The full deep-link URL received by the app
 * @param expectedRedirectUri - The registered redirect URI to match against
 * @returns Parsed OAuth parameters, or null if the URL is not an OAuth redirect
 */
export function parseOAuthCallbackUrl(
  url: string,
  expectedRedirectUri: string,
): ParsedOAuthCallback | null {
  if (!url || !expectedRedirectUri) {
    return null;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    // Not a valid URL — cannot be an OAuth redirect
    return null;
  }

  // Normalize both URLs for comparison (strip trailing slashes, lowercase host)
  const normalizedIncoming = normalizeRedirectUri(
    `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`,
  );
  const normalizedExpected = normalizeRedirectUri(expectedRedirectUri);

  if (normalizedIncoming !== normalizedExpected) {
    return null;
  }

  const params = parsedUrl.searchParams;

  // Check for OAuth error response (RFC 6749 §4.1.2.1)
  const error = params.get('error') ?? undefined;
  const errorDescription = params.get('error_description') ?? undefined;
  const code = params.get('code') ?? undefined;
  const state = params.get('state') ?? undefined;

  // If neither code nor error is present, this is not a valid OAuth callback
  if (!code && !error) {
    return null;
  }

  return {
    code,
    error,
    errorDescription,
    state,
  };
}

/**
 * Normalize a redirect URI for comparison.
 * Strips trailing slashes and converts host to lowercase.
 */
function normalizeRedirectUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    const path = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${path}`;
  } catch {
    // Fallback: simple string normalization
    return uri.trim().replace(/\/+$/, '').toLowerCase();
  }
}

/**
 * Build the OAuth authorization URL for initiating the login flow.
 *
 * @param config - OAuth client configuration
 * @returns The full authorization URL to open in the browser
 */
export function buildAuthorizationUrl(config: {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state?: string;
  additionalParams?: Record<string, string>;
}): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
  });

  if (config.state) {
    params.set('state', config.state);
  }

  if (config.additionalParams) {
    for (const [key, value] of Object.entries(config.additionalParams)) {
      params.set(key, value);
    }
  }

  const separator = config.authorizationEndpoint.includes('?') ? '&' : '?';
  return `${config.authorizationEndpoint}${separator}${params.toString()}`;
}