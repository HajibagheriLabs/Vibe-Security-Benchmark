import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { exchangeAuthCodeForSession } from '../services/authService';
import { storeSession } from '../storage/sessionStorage';
import { parseOAuthCallbackUrl } from '../utils/oauthUtils';

interface OAuthRedirectHandlerProps {
  /** The registered redirect URI for the OAuth flow */
  redirectUri: string;
  /** Called when session exchange succeeds */
  onSuccess: (session: UserSession) => void;
  /** Called when session exchange fails */
  onError: (error: Error) => void;
}

interface UserSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
}

type HandlerState =
  | { status: 'idle' }
  | { status: 'processing'; code: string }
  | { status: 'success'; session: UserSession }
  | { status: 'error'; message: string };

/**
 * OAuthRedirectHandler
 *
 * Listens for deep-link redirects containing an OAuth authorization code,
 * exchanges the code for a user session, and persists the session.
 *
 * The component should be mounted at the root of the authenticated
 * navigation stack so it can intercept redirects app-wide.
 */
const OAuthRedirectHandler: React.FC<OAuthRedirectHandlerProps> = ({
  redirectUri,
  onSuccess,
  onError,
}) => {
  const [state, setState] = useState<HandlerState>({ status: 'idle' });
  const isProcessingRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const redirectUriRef = useRef(redirectUri);

  // Keep latest callbacks in refs to avoid stale closures in event listeners
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    redirectUriRef.current = redirectUri;
  }, [onSuccess, onError, redirectUri]);

  useEffect(() => {
    let isMounted = true;

    const handleIncomingUrl = async (url: string | null) => {
      if (!url || isProcessingRef.current) {
        return;
      }

      // Parse the callback URL and extract the authorization code
      const parsed = parseOAuthCallbackUrl(url, redirectUriRef.current);

      if (!parsed) {
        // Not an OAuth redirect for our app — ignore silently
        return;
      }

      if (parsed.error) {
        const errorMessage = `OAuth error: ${parsed.error}${
          parsed.errorDescription ? ` — ${parsed.errorDescription}` : ''
        }`;
        if (isMounted) {
          setState({ status: 'error', message: errorMessage });
        }
        onErrorRef.current(new Error(errorMessage));
        return;
      }

      if (!parsed.code) {
        const errorMessage = 'OAuth redirect missing authorization code';
        if (isMounted) {
          setState({ status: 'error', message: errorMessage });
        }
        onErrorRef.current(new Error(errorMessage));
        return;
      }

      // Prevent concurrent processing
      isProcessingRef.current = true;
      if (isMounted) {
        setState({ status: 'processing', code: parsed.code });
      }

      try {
        // Exchange the auth code for a session
        const session = await exchangeAuthCodeForSession(
          parsed.code,
          redirectUriRef.current,
        );

        // Persist the session locally
        await storeSession(session);

        if (isMounted) {
          setState({ status: 'success', session });
        }
        onSuccessRef.current(session);
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error('Failed to exchange authorization code');
        if (isMounted) {
          setState({ status: 'error', message: err.message });
        }
        onErrorRef.current(err);
      } finally {
        isProcessingRef.current = false;
      }
    };

    // Handle the initial URL (cold start from deep link)
    Linking.getInitialURL()
      .then(handleIncomingUrl)
      .catch((err) => {
        if (isMounted) {
          setState({
            status: 'error',
            message: `Failed to read initial URL: ${err.message}`,
          });
        }
      });

    // Handle URLs while the app is running (warm start)
    const subscription = Linking.addEventListener('url', (event) => {
      handleIncomingUrl(event.url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  // Render a loading overlay while processing
  if (state.status === 'processing') {
    return (
      <View style={styles.overlay} pointerEvents="auto">
        <View style={styles.overlayCard}>
          <ActivityIndicator size="large" color="#4A90D9" />
          <Text style={styles.overlayText}>Signing you in…</Text>
        </View>
      </View>
    );
  }

  // Render nothing for idle, success, or error states
  // (errors are surfaced via onError callback and optionally Alert)
  return null;
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  overlayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  overlayText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
});

export default OAuthRedirectHandler;