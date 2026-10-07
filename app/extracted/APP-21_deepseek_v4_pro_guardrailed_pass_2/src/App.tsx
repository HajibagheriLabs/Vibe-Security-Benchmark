// src/App.tsx
import React, { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { handleOAuthRedirect } from './auth/oauthRedirectHandler';
import { navigationService } from './navigation/navigationService';

/**
 * Security rules applied:
 * - §4 Deep Links: single entry point for all incoming URLs; every URL
 *   passes through the same allowlist resolver.
 * - Handles both cold-start and warm-start deep links.
 */

export default function App() {
  const navigationRef = useRef(null);
  const handledInitialUrl = useRef(false);

  useEffect(() => {
    navigationService.setNavigationRef(navigationRef.current);

    // Cold start: check for initial URL
    Linking.getInitialURL().then((url) => {
      if (url && !handledInitialUrl.current) {
        handledInitialUrl.current = true;
        handleOAuthRedirect(url);
      }
    });

    // Warm start: listen for incoming URLs
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleOAuthRedirect(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // ... rest of app component
}