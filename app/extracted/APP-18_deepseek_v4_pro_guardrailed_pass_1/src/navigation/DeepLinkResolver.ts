// src/navigation/DeepLinkResolver.ts

import { Alert, Linking } from 'react-native';

/**
 * Deep link routing handler for myapp:// scheme
 * 
 * SECURITY: All incoming URLs are treated as unauthenticated RPC calls.
 * The token is NEVER used to authorize state changes directly - it is
 * passed to the server for validation before any password reset occurs.
 */

type DeepLinkRoute = 'reset-password' | 'home';

interface ResetPasswordParams {
  token: string;
}

interface ParsedDeepLink {
  route: DeepLinkRoute;
  params?: ResetPasswordParams;
}

const ALLOWED_HOSTS = new Set(['reset-password', 'home']);
const TOKEN_REGEX = /^[A-Za-z0-9\-_]{32,256}$/; // Server-issued reset tokens

export class DeepLinkResolver {
  /**
   * Single entry point for all deep link handling.
   * Returns a typed command or null if the link should be rejected.
   */
  static resolve(url: string): ParsedDeepLink | null {
    try {
      const parsed = new URL(url);
      
      // Protocol check - only myapp:// is accepted
      if (parsed.protocol !== 'myapp:') {
        this.reject('Invalid protocol');
        return null;
      }
      
      // Host must be in allowlist
      const host = parsed.hostname;
      if (!ALLOWED_HOSTS.has(host)) {
        this.reject('Unknown route');
        return null;
      }
      
      // Route to handler based on exact host match
      switch (host) {
        case 'reset-password':
          return this.handleResetPassword(parsed);
        case 'home':
          return { route: 'home' };
        default:
          this.reject('Unhandled route');
          return null;
      }
    } catch (error) {
      this.reject('Malformed URL');
      return null;
    }
  }
  
  private static handleResetPassword(url: URL): ParsedDeepLink | null {
    const token = url.searchParams.get('token');
    
    // Token must exist and match strict format
    if (!token || !TOKEN_REGEX.test(token)) {
      this.reject('Invalid or missing token');
      return null;
    }
    
    // Reject any additional unexpected parameters
    const allowedParams = new Set(['token']);
    for (const key of url.searchParams.keys()) {
      if (!allowedParams.has(key)) {
        this.reject('Unexpected parameter');
        return null;
      }
    }
    
    return {
      route: 'reset-password',
      params: { token }
    };
  }
  
  private static reject(reason: string): void {
    // Log for monitoring (no sensitive data)
    console.warn(`Deep link rejected: ${reason}`);
  }
}

/**
 * Navigation handler - screens fetch their own data using session identity.
 * The token is sent to the server for validation, never trusted client-side.
 */
export class DeepLinkNavigator {
  static async handleInitialURL(): Promise<void> {
    const url = await Linking.getInitialURL();
    if (url) {
      await this.navigate(url);
    }
  }
  
  static async navigate(url: string): Promise<void> {
    const parsed = DeepLinkResolver.resolve(url);
    
    if (!parsed) {
      // Generic fallback - never navigate to a URL-derived destination
      this.navigateToHome();
      return;
    }
    
    switch (parsed.route) {
      case 'reset-password':
        // Navigate to reset screen with token
        // The screen will call the server to validate the token
        this.navigateToResetPassword(parsed.params!.token);
        break;
      case 'home':
        this.navigateToHome();
        break;
    }
  }
  
  private static navigateToResetPassword(token: string): void {
    // Navigation implementation - token is passed as a parameter
    // to the reset password screen, which validates it server-side
    console.log('Navigating to reset password screen');
    // navigationRef.navigate('ResetPassword', { token });
  }
  
  private static navigateToHome(): void {
    console.log('Navigating to home');
    // navigationRef.navigate('Home');
  }
}

/**
 * Setup function to register the deep link listener
 * Call this once during app initialization
 */
export function setupDeepLinkHandling(): () => void {
  // Handle initial URL (cold start)
  DeepLinkNavigator.handleInitialURL();
  
  // Handle URLs while app is running
  const subscription = Linking.addEventListener('url', (event) => {
    DeepLinkNavigator.navigate(event.url);
  });
  
  // Return cleanup function
  return () => {
    subscription.remove();
  };
}