import { Linking, Platform } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/authApi';
import { useCallback, useEffect } from 'react';

const REDIRECT_SCHEME = 'com.myapp.oauthredirect';
const ALLOWED_HOST = 'auth.myapp.com';
const ALLOWED_PATH = '/callback';

interface OAuthCallbackParams {
  code: string;
  state: string;
}

function parseAndValidateUrl(url: string): OAuthCallbackParams | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== `${REDIRECT_SCHEME}:`) {
      return null;
    }
    if (parsed.host !== ALLOWED_HOST && parsed.protocol !== `${REDIRECT_SCHEME}:`) {
      return null;
    }
    if (parsed.pathname !== ALLOWED_PATH) {
      return null;
    }
    const code = parsed.searchParams.get('code');
    const state = parsed.searchParams.get('state');
    if (!code || !state) {
      return null;
    }
    if (!/^[a-zA-Z0-9\-_]{10,128}$/.test(code) || !/^[a-zA-Z0-9\-_]{16,64}$/.test(state)) {
      return null;
    }
    return { code, state };
  } catch {
    return null;
  }
}

export function useOAuthRedirectHandler() {
  const { setSession, clearSession, pendingOAuthState } = useAuthStore();

  const handleCallback = useCallback(async (url: string) => {
    const params = parseAndValidateUrl(url);
    if (!params) {
      console.warn('[OAuth] Invalid callback URL');
      return;
    }
    if (params.state !== pendingOAuthState) {
      console.warn('[OAuth] State mismatch — possible CSRF');
      clearSession();
      return;
    }
    try {
      const session = await authApi.exchangeCodeForSession(params.code);
      setSession(session);
    } catch (error) {
      console.error('[OAuth] Token exchange failed', error);
      clearSession();
    }
  }, [pendingOAuthState, setSession, clearSession]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => handleCallback(url));
    Linking.getInitialURL().then((url) => url && handleCallback(url));
    return () => subscription.remove();
  }, [handleCallback]);
}

export function OAuthRedirectHandler({ children }: { children: React.ReactNode }) {
  useOAuthRedirectHandler();
  return <>{children}</>;
}