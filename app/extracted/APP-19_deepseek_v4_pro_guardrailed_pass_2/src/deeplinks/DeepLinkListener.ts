// src/deeplinks/DeepLinkListener.ts

import { Linking } from 'react-native';
import { resolveDeepLink, DeepLinkRoute } from './DeepLinkResolver';

/**
 * Listens for incoming deep links and dispatches validated routes.
 * No URL-supplied address is ever loaded into a WebView.
 */
export class DeepLinkListener {
  private subscription: { remove: () => void } | null = null;
  private onRoute: (route: DeepLinkRoute) => void;

  constructor(onRoute: (route: DeepLinkRoute) => void) {
    this.onRoute = onRoute;
  }

  start(): void {
    // Handle cold start
    Linking.getInitialURL()
      .then((url) => {
        if (url) {
          this.onRoute(resolveDeepLink(url));
        }
      })
      .catch(() => {
        // Fail closed — no navigation on error
      });

    // Handle warm start
    this.subscription = Linking.addEventListener('url', (event) => {
      this.onRoute(resolveDeepLink(event.url));
    });
  }

  stop(): void {
    this.subscription?.remove();
    this.subscription = null;
  }
}