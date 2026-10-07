import { useAuth } from './AuthProvider';

export const useAuthFetch = () => {
  const { getAccessToken, refreshToken, isTokenExpired, logout } = useAuth();

  const authFetch = async (url, options = {}) => {
    let accessToken = getAccessToken();

    if (isTokenExpired && accessToken) {
      try {
        accessToken = await refreshToken();
      } catch (error) {
        await logout();
        throw new Error('Session expired. Please log in again.');
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      try {
        const newToken = await refreshToken();
        headers.Authorization = `Bearer ${newToken}`;
        
        return fetch(url, {
          ...options,
          headers,
        });
      } catch (error) {
        await logout();
        throw new Error('Session expired. Please log in again.');
      }
    }

    return response;
  };

  return authFetch;
};

export const createAuthFetch = (authService) => {
  return async (url, options = {}) => {
    let accessToken = authService.getAccessToken();

    if (authService.isTokenExpired() && accessToken) {
      try {
        const { tokenEndpoint, clientId, clientSecret } = authService._config || {};
        accessToken = await authService.refreshAccessToken(tokenEndpoint, clientId, clientSecret);
      } catch (error) {
        await authService.clearTokens();
        throw new Error('Session expired. Please log in again.');
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      try {
        const { tokenEndpoint, clientId, clientSecret } = authService._config || {};
        const newToken = await authService.refreshAccessToken(tokenEndpoint, clientId, clientSecret);
        headers.Authorization = `Bearer ${newToken}`;
        
        return fetch(url, {
          ...options,
          headers,
        });
      } catch (error) {
        await authService.clearTokens();
        throw new Error('Session expired. Please log in again.');
      }
    }

    return response;
  };
};