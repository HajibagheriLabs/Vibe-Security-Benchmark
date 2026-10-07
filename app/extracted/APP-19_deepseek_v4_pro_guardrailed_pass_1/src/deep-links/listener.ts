// src/deep-links/listener.ts
import { Linking } from 'react-native';
import { resolveDeepLink, routeToDestination } from './resolver';

type NavigationHandler = (screen: string, params: Record<string, string>) => void;

/**
 * Sets up the deep link listener.
 * All incoming URLs are validated through the single resolver.
 * Invalid URLs are rejected silently (no navigation).
 */
export function setupDeepLinkListener(onNavigate: NavigationHandler): () => void {
  const handleUrl = (url: string) => {
    const parsed = resolveDeepLink(url);
    if (!parsed) {
      // Reject — never repair, never coerce, never navigate with URL values
      return;
    }

    const destination = routeToDestination(parsed);
    onNavigate(destination.screen, destination.params);
  };

  // Handle initial URL (cold start)
  Linking.getInitialURL().then((url) => {
    if (url) {
      handleUrl(url);
    }
  });

  // Handle subsequent URLs (warm start)
  const subscription = Linking.addEventListener('url', (event) => {
    handleUrl(event.url);
  });

  return () => {
    subscription.remove();
  };
}