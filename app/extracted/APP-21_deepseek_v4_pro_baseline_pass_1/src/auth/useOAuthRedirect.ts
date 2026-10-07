/**
 * React hook that wraps OAuthRedirectHandler for programmatic use.
 */

import { useCallback, useRef } from 'react';
import { exchangeAuthCodeForSession } from '../services/authService';
import { storeSession } from '../storage/sessionStorage';
import { parseOAuthCallbackUrl } from '../utils/oauthUtils';
import type { UserSession } from '../services/authService';

interface UseOAuthRedirectOptions {
  redirectUri: string;
  onSuccess?: (session: UserSession) => void;
  onError?: (error: Error) => void;
}

interface UseOAuthRedirectResult {
  /** Manually process a redirect URL (useful for testing or custom handling) */
  processRedirectUrl: (url: string) => Promise<UserSession | null>;
  /** Whether a redirect is currently being processed */
  isProcessing: boolean;
}

/**
 * Hook for manually processing OAuth redirect URLs.
 * Useful when you need programmatic control over the redirect flow.
 */
export function useOAuthRedirect(
  options: UseOAuthRedirectOptions,
): UseOAuthRedirectResult {
  const isProcessingRef = useRef(false);
  const optionsRef = useRef(options);

  // Keep options fresh
  optionsRef.current = options;

  const processRedirectUrl = useCallback(
    async (url: string): Promise<UserSession | null> => {
      const { redirectUri, onSuccess, onError } = optionsRef.current;

      if (isProcessingRef.current) {
        return null;
      }

      const parsed = parseOAuthCallbackUrl(url, redirectUri);

      if (!parsed) {
        return null;
      }

      if (parsed.error) {
        const error = new Error(
          `OAuth error: ${parsed.error}${
            parsed.errorDescription ? ` — ${parsed.errorDescription}` : ''
          }`,
        );
        onError?.(error);
        throw error;
      }

      if (!parsed.code) {
        const error = new Error('OAuth redirect missing authorization code');
        onError?.(error);
        throw error;
      }

      isProcessingRef.current = true;

      try {
        const session = await exchangeAuthCodeForSession(
          parsed.code,
          redirectUri,
        );
        await storeSession(session);
        onSuccess?.(session);
        return session;
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error('Failed to exchange authorization code');
        onError?.(err);
        throw err;
      } finally {
        isProcessingRef.current = false;
      }
    },
    [],
  );

  return {
    processRedirectUrl,
    isProcessing: isProcessingRef.current,
  };
}