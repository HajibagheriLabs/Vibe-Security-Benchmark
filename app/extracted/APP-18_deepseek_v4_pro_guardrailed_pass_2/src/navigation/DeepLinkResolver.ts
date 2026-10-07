// src/navigation/DeepLinkResolver.ts
import { Linking } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';

/**
 * Deep link resolver for myapp:// scheme
 * Security: Single allowlist-based resolver. Links may navigate but NEVER authorize or mutate state.
 * The reset-password token is passed in-memory only and validated for format before use.
 */

type DeepLinkRoute =
  | { name: 'ResetPassword'; params: { token: string } }
  | { name: 'Home' };

type NavigationRef = React.RefObject<NavigationContainerRef<any>>;

// Closed map of allowed routes - no dynamic route construction from URL
const ROUTE_MAP: Record<string, (params: URLSearchParams) => DeepLinkRoute> = {
  'reset-password': (params) => {
    const token = params.get('token');
    
    // Strict token validation: UUID v4 format only
    const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!token || !UUID_V4_REGEX.test(token)) {
      // Reject, never repair - fall back to home
      return { name: 'Home' };
    }
    
    return { name: 'ResetPassword', params: { token } };
  },
};

export class DeepLinkResolver {
  private navigationRef: NavigationRef;
  private isHandlingLink = false;

  constructor(navigationRef: NavigationRef) {
    this.navigationRef = navigationRef;
  }

  /**
   * Main entry point for all deep links
   * Security: Validates scheme, host, and route before any navigation
   */
  async handleDeepLink(url: string): Promise<void> {
    if (this.isHandlingLink) {
      return; // Prevent re-entrant handling
    }

    this.isHandlingLink = true;
    try {
      const route = this.resolveUrl(url);
      
      if (this.navigationRef.current?.isReady()) {
        this.navigationRef.current.navigate(route.name, route.params);
      }
    } catch (error) {
      // Log error without sensitive data
      console.error('Deep link handling failed:', error instanceof Error ? error.message : 'Unknown error');
      this.navigateToFallback();
    } finally {
      this.isHandlingLink = false;
    }
  }

  /**
   * Resolve URL to a typed route
   * Security: Exact matching only, no startsWith/includes/endsWith
   */
  private resolveUrl(url: string): DeepLinkRoute {
    let parsedUrl: URL;
    
    try {
      parsedUrl = new URL(url);
    } catch {
      return { name: 'Home' };
    }

    // Strict scheme validation
    if (parsedUrl.protocol !== 'myapp:') {
      return { name: 'Home' };
    }

    // Exact hostname matching - no subdomain tricks
    if (parsedUrl.hostname !== 'reset-password') {
      return { name: 'Home' };
    }

    // Route key from pathname, stripped of leading slash
    const routeKey = parsedUrl.pathname.replace(/^\//, '');
    
    // Closed map lookup - no dynamic route construction
    const routeBuilder = ROUTE_MAP[routeKey];
    if (!routeBuilder) {
      return { name: 'Home' };
    }

    return routeBuilder(parsedUrl.searchParams);
  }

  private navigateToFallback(): void {
    if (this.navigationRef.current?.isReady()) {
      this.navigationRef.current.navigate('Home');
    }
  }
}