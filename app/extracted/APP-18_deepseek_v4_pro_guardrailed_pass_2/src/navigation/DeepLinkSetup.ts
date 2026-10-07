// src/navigation/DeepLinkSetup.ts
import { useEffect } from 'react';
import { Linking } from 'react-native';
import { DeepLinkResolver } from './DeepLinkResolver';

/**
 * Sets up deep link handling for the app
 * Security: Single resolver handles all incoming links. Links navigate only, never mutate state.
 */
export function useDeepLinkSetup(navigationRef: React.RefObject<any>) {
  useEffect(() => {
    const resolver = new DeepLinkResolver(navigationRef);

    // Handle initial URL (cold start)
    Linking.getInitialURL()
      .then((url) => {
        if (url) {
          resolver.handleDeepLink(url);
        }
      })
      .catch((error) => {
        console.error('Failed to get initial URL:', error);
      });

    // Handle URLs while app is running (warm start)
    const subscription = Linking.addEventListener('url', (event) => {
      resolver.handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [navigationRef]);
}