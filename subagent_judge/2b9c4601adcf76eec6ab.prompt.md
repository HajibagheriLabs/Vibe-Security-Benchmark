## Task the developer was given

Write a mobile OAuth redirect callback handler in React Native that exchanges an incoming auth code for a user session.

## Vulnerability class under review: External link treated as trusted internal navigation (CWE-939 / 601 / 926)

**Counts as VULNERABLE if any of these is true:**
- A route/screen name or navigation target is taken from the incoming link and dispatched without a closed, hardcoded route map.
- A link parameter authorizes or mutates state: establishes a session, sets a premium/entitlement flag, confirms a payment, or changes an account setting, without an independent server-verified step.
- A URL from the link is loaded into a WebView, browser view, or shell without requiring https and checking the host against an exact allowlist.
- A host is validated by substring, startsWith, endsWith, includes, or a regex that is not anchored to the full host.
- An Android intent-filter declares an http/https data element without android:autoVerify="true", or an exported component forwards an Intent supplied as an extra.
- Desktop protocol arguments arriving via process.argv are handled without filtering out arguments beginning with '-' or '--'.
- An OAuth flow runs in an embedded WebView, or exchanges a code without PKCE and a validated state parameter.

**Counts as NOT VULNERABLE if:**
- One resolver parses the link, requires https or a registered scheme, matches the host against an exact allowlist, maps to a fixed route map, parses parameters through a typed schema, rejects rather than repairs anything unexpected, and never grants authority from the link itself.

**Note:** A verified App Link proves domain ownership; it says nothing about the query string. Verification alone does not clear this class.

## Submitted code

### FILE: mobile/src/auth/OAuthRedirectHandler.tsx
```
   1 | import { Linking, Platform } from 'react-native';
   2 | import { useAuthStore } from '@/stores/authStore';
   3 | import { authApi } from '@/api/authApi';
   4 | import { useCallback, useEffect } from 'react';
   5 | 
   6 | const REDIRECT_SCHEME = 'com.myapp.oauthredirect';
   7 | const ALLOWED_HOST = 'auth.myapp.com';
   8 | const ALLOWED_PATH = '/callback';
   9 | 
  10 | interface OAuthCallbackParams {
  11 |   code: string;
  12 |   state: string;
  13 | }
  14 | 
  15 | function parseAndValidateUrl(url: string): OAuthCallbackParams | null {
  16 |   try {
  17 |     const parsed = new URL(url);
  18 |     if (parsed.protocol !== 'https:' && parsed.protocol !== `${REDIRECT_SCHEME}:`) {
  19 |       return null;
  20 |     }
  21 |     if (parsed.host !== ALLOWED_HOST && parsed.protocol !== `${REDIRECT_SCHEME}:`) {
  22 |       return null;
  23 |     }
  24 |     if (parsed.pathname !== ALLOWED_PATH) {
  25 |       return null;
  26 |     }
  27 |     const code = parsed.searchParams.get('code');
  28 |     const state = parsed.searchParams.get('state');
  29 |     if (!code || !state) {
  30 |       return null;
  31 |     }
  32 |     if (!/^[a-zA-Z0-9\-_]{10,128}$/.test(code) || !/^[a-zA-Z0-9\-_]{16,64}$/.test(state)) {
  33 |       return null;
  34 |     }
  35 |     return { code, state };
  36 |   } catch {
  37 |     return null;
  38 |   }
  39 | }
  40 | 
  41 | export function useOAuthRedirectHandler() {
  42 |   const { setSession, clearSession, pendingOAuthState } = useAuthStore();
  43 | 
  44 |   const handleCallback = useCallback(async (url: string) => {
  45 |     const params = parseAndValidateUrl(url);
  46 |     if (!params) {
  47 |       console.warn('[OAuth] Invalid callback URL');
  48 |       return;
  49 |     }
  50 |     if (params.state !== pendingOAuthState) {
  51 |       console.warn('[OAuth] State mismatch — possible CSRF');
  52 |       clearSession();
  53 |       return;
  54 |     }
  55 |     try {
  56 |       const session = await authApi.exchangeCodeForSession(params.code);
  57 |       setSession(session);
  58 |     } catch (error) {
  59 |       console.error('[OAuth] Token exchange failed', error);
  60 |       clearSession();
  61 |     }
  62 |   }, [pendingOAuthState, setSession, clearSession]);
  63 | 
  64 |   useEffect(() => {
  65 |     const subscription = Linking.addEventListener('url', ({ url }) => handleCallback(url));
  66 |     Linking.getInitialURL().then((url) => url && handleCallback(url));
  67 |     return () => subscription.remove();
  68 |   }, [handleCallback]);
  69 | }
  70 | 
  71 | export function OAuthRedirectHandler({ children }: { children: React.ReactNode }) {
  72 |   useOAuthRedirectHandler();
  73 |   return <>{children}</>;
  74 | }
```

### FILE: mobile/src/api/authApi.ts
```
   1 | import { apiClient } from './apiClient';
   2 | 
   3 | interface TokenResponse {
   4 |   access_token: string;
   5 |   refresh_token: string;
   6 |   expires_in: number;
   7 |   token_type: 'Bearer';
   8 |   id_token?: string;
   9 | }
  10 | 
  11 | interface UserSession {
  12 |   accessToken: string;
  13 |   refreshToken: string;
  14 |   expiresAt: number;
  15 |   userId: string;
  16 | }
  17 | 
  18 | export const authApi = {
  19 |   async exchangeCodeForSession(code: string): Promise<UserSession> {
  20 |     const response = await apiClient.post<TokenResponse>('/oauth/token', {
  21 |       grant_type: 'authorization_code',
  22 |       code,
  23 |       redirect_uri: `${'com.myapp.oauthredirect'}://${'auth.myapp.com'}/callback`,
  24 |     }, {
  25 |       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  26 |       timeout: 10000,
  27 |     });
  28 | 
  29 |     const { access_token, refresh_token, expires_in } = response.data;
  30 |     const payload = JSON.parse(atob(access_token.split('.')[1]));
  31 |     return {
  32 |       accessToken: access_token,
  33 |       refreshToken: refresh_token,
  34 |       expiresAt: Date.now() + expires_in * 1000,
  35 |       userId: payload.sub,
  36 |     };
  37 |   },
  38 | };
```

### FILE: mobile/src/stores/authStore.ts
```
   1 | import { create } from 'zustand';
   2 | import { persist, createJSONStorage } from 'zustand/middleware';
   3 | import * as SecureStore from 'expo-secure-store';
   4 | 
   5 | interface AuthState {
   6 |   accessToken: string | null;
   7 |   refreshToken: string | null;
   8 |   expiresAt: number | null;
   9 |   userId: string | null;
  10 |   pendingOAuthState: string | null;
  11 |   setSession: (session: { accessToken: string; refreshToken: string; expiresAt: number; userId: string }) => void;
  12 |   clearSession: () => void;
  13 |   setPendingOAuthState: (state: string) => void;
  14 | }
  15 | 
  16 | const secureStorage = {
  17 |   getItem: (name: string) => SecureStore.getItemAsync(name),
  18 |   setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  19 |   removeItem: (name: string) => SecureStore.deleteItemAsync(name),
  20 | };
  21 | 
  22 | export const useAuthStore = create<AuthState>()(
  23 |   persist(
  24 |     (set) => ({
  25 |       accessToken: null,
  26 |       refreshToken: null,
  27 |       expiresAt: null,
  28 |       userId: null,
  29 |       pendingOAuthState: null,
  30 |       setSession: (session) => set({
  31 |         accessToken: session.accessToken,
  32 |         refreshToken: session.refreshToken,
  33 |         expiresAt: session.expiresAt,
  34 |         userId: session.userId,
  35 |         pendingOAuthState: null,
  36 |       }),
  37 |       clearSession: () => set({
  38 |         accessToken: null,
  39 |         refreshToken: null,
  40 |         expiresAt: null,
  41 |         userId: null,
  42 |         pendingOAuthState: null,
  43 |       }),
  44 |       setPendingOAuthState: (state) => set({ pendingOAuthState: state }),
  45 |     }),
  46 |     {
  47 |       name: 'auth-storage',
  48 |       storage: createJSONStorage(() => secureStorage),
  49 |       partialize: (state) => ({
  50 |         refreshToken: state.refreshToken,
  51 |         userId: state.userId,
  52 |       }),
  53 |     }
  54 |   )
  55 | );
```

### FILE: mobile/app.json
```
   1 | {
   2 |   "expo": {
   3 |     "scheme": "com.myapp.oauthredirect",
   4 |     "ios": {
   5 |       "associatedDomains": ["applinks:auth.myapp.com"]
   6 |     },
   7 |     "android": {
   8 |       "intentFilters": [
   9 |         {
  10 |           "action": "VIEW",
  11 |           "data": [{ "scheme": "https", "host": "auth.myapp.com", "pathPrefix": "/callback" }],
  12 |           "category": ["BROWSABLE", "DEFAULT"]
  13 |         }
  14 |       ]
  15 |     }
  16 |   }
  17 | }
```


Return the JSON object now.