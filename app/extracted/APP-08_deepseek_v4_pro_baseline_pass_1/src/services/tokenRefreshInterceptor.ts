import AuthService from './authService';

/**
 * Wrapper for authenticated API requests that automatically
 * refreshes the access token when it expires (401 response).
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const authService = AuthService;

  // Attach access token
  const accessToken = await authService.getAccessToken();
  const headers = new Headers(options.headers || {});
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let response = await fetch(url, { ...options, headers });

  // If unauthorized, try refreshing the token and retry once
  if (response.status === 401) {
    const refreshedSession = await authService.refreshAccessToken();

    if (refreshedSession) {
      const newHeaders = new Headers(options.headers || {});
      newHeaders.set('Authorization', `Bearer ${refreshedSession.tokens.accessToken}`);
      response = await fetch(url, { ...options, headers: newHeaders });
    }
  }

  return response;
}