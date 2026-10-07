import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AuthService from './AuthService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children, config = {} }) => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    accessToken: null,
    refreshToken: null,
    user: null,
    isTokenExpired: true,
    isLoading: true,
  });

  useEffect(() => {
    const initAuth = async () => {
      await AuthService.initialize();
      setAuthState(AuthService.getAuthState());
    };

    initAuth();

    const unsubscribe = AuthService.subscribe((state) => {
      setAuthState(prev => ({ ...prev, ...state, isLoading: false }));
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (credentials) => {
    const { authEndpoint, tokenEndpoint, clientId, clientSecret, redirectUri, scopes } = config;
    
    if (authEndpoint && redirectUri) {
      const authUrl = `${authEndpoint}?${new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scopes?.join(' ') || 'openid profile email offline_access',
        state: Math.random().toString(36).substring(7),
        code_challenge_method: 'S256',
      })}`;
      
      return { authUrl, requiresBrowser: true };
    }

    const body = new URLSearchParams({
      grant_type: 'password',
      username: credentials.username,
      password: credentials.password,
      scope: scopes?.join(' ') || 'openid profile email offline_access',
    });

    if (clientId) body.append('client_id', clientId);
    if (clientSecret) body.append('client_secret', clientSecret);

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error_description || error.message || 'Login failed');
    }

    const data = await response.json();
    
    await AuthService.setTokens(
      data.access_token,
      data.refresh_token,
      data.expires_in || 3600,
      data.user || null
    );

    return AuthService.getAuthState();
  }, [config]);

  const register = useCallback(async (userData) => {
    const { registerEndpoint, tokenEndpoint, clientId, clientSecret, scopes } = config;

    const response = await fetch(registerEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Registration failed');
    }

    const data = await response.json();

    if (data.access_token) {
      await AuthService.setTokens(
        data.access_token,
        data.refresh_token,
        data.expires_in || 3600,
        data.user || null
      );
    } else if (tokenEndpoint) {
      return login({ username: userData.email, password: userData.password });
    }

    return AuthService.getAuthState();
  }, [config, login]);

  const logout = useCallback(async () => {
    const { revokeEndpoint, clientId, clientSecret } = config;
    await AuthService.logout(revokeEndpoint, clientId, clientSecret);
  }, [config]);

  const refreshToken = useCallback(async () => {
    const { tokenEndpoint, clientId, clientSecret } = config;
    return AuthService.refreshAccessToken(tokenEndpoint, clientId, clientSecret);
  }, [config]);

  const updateUser = useCallback(async (userData) => {
    await AuthService.updateUserData(userData);
  }, []);

  const value = {
    ...authState,
    login,
    register,
    logout,
    refreshToken,
    updateUser,
    getAccessToken: AuthService.getAccessToken.bind(AuthService),
    getRefreshToken: AuthService.getRefreshToken.bind(AuthService),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const withAuth = (Component) => (props) => (
  <AuthProvider>
    <Component {...props} />
  </AuthProvider>
);