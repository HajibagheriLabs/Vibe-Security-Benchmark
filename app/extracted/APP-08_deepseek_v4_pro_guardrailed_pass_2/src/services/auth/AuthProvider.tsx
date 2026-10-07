// src/services/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AuthService from './AuthService';
import TokenRefresher from './TokenRefresher';

/**
 * React context provider for authentication state.
 * 
 * SECURITY DECISIONS:
 * - Handles first-launch-after-install token wipe
 * - Restores session from secure storage on mount
 * - Exposes only typed methods, never raw tokens to components
 */

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, expiresIn: number) => Promise<void>;
  logout: () => Promise<void>;
  getValidAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  async function initializeAuth(): Promise<void> {
    try {
      // Handle first launch after install (clears stale Keychain data)
      await AuthService.handleFirstLaunchAfterInstall();

      // Attempt to restore session
      const hasSession = await AuthService.hasStoredSession();
      
      if (hasSession) {
        // Try to refresh the access token
        const accessToken = await TokenRefresher.refreshAccessToken();
        setIsAuthenticated(accessToken !== null);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ): Promise<void> {
    // Persist refresh token to secure storage
    await AuthService.persistRefreshToken(refreshToken);
    
    // Keep access token in memory
    AuthService.setAccessToken(accessToken, expiresIn);
    
    setIsAuthenticated(true);
  }

  async function logout(): Promise<void> {
    await AuthService.clearAllTokens();
    setIsAuthenticated(false);
  }

  async function getValidAccessToken(): Promise<string | null> {
    // Check if current access token is valid
    const currentToken = AuthService.getAccessToken();
    if (currentToken) {
      return currentToken;
    }

    // Try to refresh
    return TokenRefresher.refreshAccessToken();
  }

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    login,
    logout,
    getValidAccessToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}