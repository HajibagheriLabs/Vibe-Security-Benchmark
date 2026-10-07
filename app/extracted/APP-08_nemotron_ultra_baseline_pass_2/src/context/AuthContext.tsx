import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User } from '../services/auth/AuthService';

interface AuthContextType extends ReturnType<typeof useAuth> {}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  const value = useMemo(() => auth, [
    auth.isAuthenticated,
    auth.isLoading,
    auth.user,
    auth.accessToken,
    auth.refreshToken,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}