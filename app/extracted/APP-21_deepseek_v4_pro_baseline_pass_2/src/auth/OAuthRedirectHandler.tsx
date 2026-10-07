import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus, Platform, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { exchangeAuthCode, TokenResponse, OAuthError } from '../services/OAuthService';
import { storeSession } from '../storage/SessionStorage';
import { navigateToApp, navigateToLogin } from '../navigation/NavigationService';

interface OAuthRedirectHandlerProps {
  /**
   * Expected OAuth state parameter to prevent CSRF attacks.
   */
  expectedState: string;
  /**
   * Called when the session is successfully established.
   */
  onSuccess?: (session: TokenResponse) => void;
  /**
   * Called when the OAuth exchange fails.
   */
  onError?: (error: OAuthError) => void;
}

type HandlerStatus = 'idle' | 'processing' | 'success' | 'error';

/**
 * OAuthRedirectHandler
 * 
 * A mobile OAuth redirect callback handler for React Native.
 * It listens for deep links (custom URL scheme / universal links) containing
 * an authorization code, exchanges the code for tokens, and persists the
 * resulting user session.
 * 
 * Supports:
 * - iOS custom URL schemes and universal links via Linking.getInitialURL + 'url' event
 * - Android intent filters via Linking.getInitialURL + 'url' event
 * - AppState foregrounding to catch links opened while app is backgrounded
 * - CSRF protection via state parameter validation
 * - PKCE support (code_verifier passed to exchange function)
 */
const OAuthRedirectHandler: React.FC<OAuthRedirectHandlerProps> = ({
  expectedState,
  onSuccess,
  onError,
}) => {
  const [status, setStatus] = useState<HandlerStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const processingRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  /**
   * Parses a deep link URL and extracts OAuth callback parameters.
   */
  const parseOAuthCallback = useCallback(
    (url: string): { code: string; state: string } | null => {
      if (!url) return null;

      try {
        const parsed = new URL(url);
        const code = parsed.searchParams.get('code');
        const state = parsed.searchParams.get('state');
        const error = parsed.searchParams.get('error');

        if (error) {
          const errorDescription = parsed.searchParams.get('error_description') || 'OAuth authorization failed';
          throw new OAuthError(error, errorDescription);
        }

        if (!code || !state) {
          return null; // Not a valid OAuth callback
        }

        return { code, state };
      } catch (e) {
        if (e instanceof OAuthError) throw e;
        return null; // Malformed URL, not an OAuth callback
      }
    },
    []
  );

  /**
   * Handles the full OAuth code exchange flow.
   */
  const handleOAuthCallback = useCallback(
    async (url: string) => {
      // Prevent concurrent processing
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        setStatus('processing');
        setErrorMessage(null);

        const parsed = parseOAuthCallback(url);

        if (!parsed) {
          // Not an OAuth callback URL; ignore silently
          setStatus('idle');
          return;
        }

        // Validate state parameter to prevent CSRF
        if (parsed.state !== expectedState) {
          throw new OAuthError('invalid_state', 'OAuth state parameter mismatch. Possible CSRF attack.');
        }

        // Exchange authorization code for tokens (includes PKCE code_verifier internally)
        const session = await exchangeAuthCode(parsed.code);

        // Persist the session securely
        await storeSession(session);

        setStatus('success');
        onSuccess?.(session);
        navigateToApp();
      } catch (error) {
        const oauthError =
          error instanceof OAuthError
            ? error
            : new OAuthError('exchange_failed', error instanceof Error ? error.message : 'Unknown error during token exchange');

        setStatus('error');
        setErrorMessage(oauthError.message);
        onError?.(oauthError);
        navigateToLogin(oauthError.message);
      } finally {
        processingRef.current = false;
      }
    },
    [expectedState, parseOAuthCallback, onSuccess, onError]
  );

  /**
   * Set up deep link listeners and check for initial URL on mount.
   */
  useEffect(() => {
    let isMounted = true;

    const processUrl = (url: string | null) => {
      if (url && isMounted) {
        void handleOAuthCallback(url);
      }
    };

    // Handle the URL that launched the app (cold start)
    const initPromise = (async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        processUrl(initialUrl);
      } catch (e) {
        // Linking.getInitialURL may throw on some platforms; ignore
      }
    })();
    void initPromise;

    // Handle URLs received while the app is running (warm start)
    const urlSubscription = Linking.addEventListener('url', (event) => {
      processUrl(event.url);
    });

    // Handle app returning to foreground with a new URL (iOS universal links)
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        // App came to foreground; re-check for pending URL
        void (async () => {
          try {
            const url = await Linking.getInitialURL();
            processUrl(url);
          } catch (e) {
            // Ignore
          }
        })();
      }
      appStateRef.current = nextState;
    });

    return () => {
      isMounted = false;
      urlSubscription.remove();
      appStateSubscription.remove();
    };
  }, [handleOAuthCallback]);

  /**
   * Render a minimal loading/error UI during processing.
   */
  if (status === 'processing') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4A90D9" />
        <Text style={styles.message}>Signing you in...</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Authentication Failed</Text>
        <Text style={styles.errorMessage}>{errorMessage}</Text>
        <Text style={styles.hint}>Return to the app and try again.</Text>
      </View>
    );
  }

  // Idle or success: render nothing (navigation handles the transition)
  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#333333',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#D32F2F',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
  },
  hint: {
    fontSize: 12,
    color: '#999999',
  },
});

export default OAuthRedirectHandler;