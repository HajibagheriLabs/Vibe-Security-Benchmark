// src/navigation/navigationService.ts
/**
 * Navigation service — decouples navigation from the OAuth handler.
 * Routes are closed-map allowlisted; no URL-derived navigation.
 */

type RouteName =
  | 'AuthenticatedHome'
  | 'Fallback'
  | 'Login';

interface SessionState {
  accessToken: string;
  userId: string;
  expiresAt: number;
}

let currentSession: SessionState | null = null;
let navigationRef: any = null;

export const navigationService = {
  setNavigationRef(ref: any): void {
    navigationRef = ref;
  },

  setSession(session: SessionState): void {
    currentSession = session;
  },

  getSession(): SessionState | null {
    return currentSession;
  },

  clearSession(): void {
    currentSession = null;
  },

  navigateToAuthenticatedHome(): void {
    navigationRef?.navigate('AuthenticatedHome' as RouteName);
  },

  navigateToFallback(): void {
    navigationRef?.navigate('Fallback' as RouteName);
  },

  navigateToLogin(): void {
    navigationRef?.navigate('Login' as RouteName);
  },
};