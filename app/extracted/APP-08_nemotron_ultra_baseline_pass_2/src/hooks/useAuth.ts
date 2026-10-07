import { useEffect, useState, useCallback } from 'react';
import { authService, AuthState, User } from '../services/auth/AuthService';

export function useAuth(): AuthState & {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<User>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshToken: () => Promise<string | null>;
} {
  const [state, setState] = useState<AuthState>(authService.getState());

  useEffect(() => {
    return authService.subscribe(setState);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await authService.login(email, password);
  }, []);

  const register = useCallback(async (userData: { email: string; password: string; name: string }) => {
    await authService.register(userData);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    return authService.updateProfile(updates);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await authService.changePassword(currentPassword, newPassword);
  }, []);

  const refreshToken = useCallback(async () => {
    return authService.refreshAccessToken();
  }, []);

  return {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshToken,
  };
}