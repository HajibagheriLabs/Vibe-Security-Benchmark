// src/auth/oauthLinkListener.ts
import { Linking, Platform } from 'react-native';
import { handleOAuthRedirect } from './oauthRedirectHandler';

/**
 * Register the OAuth redirect handler with the platform deep-link system.
 * Must be called once at app startup.
 */
export function registerOAuthRedirectHandler(): () => void {
  // Handle initial URL (cold start)
  Linking.getInitialURL()
    .then((url) => {
      if (url) {
        handleOAuthRedirect(url);
      }
    })
    .catch(() => {
      // Ignore — no initial URL
    });

  // Handle subsequent URLs (warm start)
  const subscription = Linking.addEventListener('url', (event) => {
    if (event.url) {
      handleOAuthRedirect(event.url);
    }
  });

  // Return cleanup function
  return () => {
    subscription.remove();
  };
}