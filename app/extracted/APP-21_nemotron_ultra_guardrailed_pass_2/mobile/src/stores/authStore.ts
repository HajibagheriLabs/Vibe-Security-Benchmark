import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  userId: string | null;
  pendingOAuthState: string | null;
  setSession: (session: { accessToken: string; refreshToken: string; expiresAt: number; userId: string }) => void;
  clearSession: () => void;
  setPendingOAuthState: (state: string) => void;
}

const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      userId: null,
      pendingOAuthState: null,
      setSession: (session) => set({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        userId: session.userId,
        pendingOAuthState: null,
      }),
      clearSession: () => set({
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        userId: null,
        pendingOAuthState: null,
      }),
      setPendingOAuthState: (state) => set({ pendingOAuthState: state }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        userId: state.userId,
      }),
    }
  )
);