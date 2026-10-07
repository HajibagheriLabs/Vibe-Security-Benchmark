import { Platform, Linking } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { Alert } from 'react-native';

// Rule 4: Deep Links — every incoming URL is an unauthenticated RPC.
// Rule 4: ONE resolver handles all of them.
// Rule 4: Reject, never repair. No coercion.
// Rule 4: A link may navigate. A link may NEVER authorize or mutate.

// Schema Definition
type ResetPasswordRoute = {
  route: 'reset-password';
  params: {
    token: string; // UUID or opaque string
  };
};

// Rule 4: Typed schema parse.
const ALLOWED_HOSTNAMES = ['myapp']; // For universal links later, strict for scheme
const SCHEME = 'myapp';

/**
 * Validates a raw URL string against the deep link schema.
 * Returns parsed route if valid, null if rejected.
 */
export function parseDeepLink(url: string): ResetPasswordRoute | null {
  try {
    const parsed = new URL(url);

    // Rule 4: Reject non-secure protocols (even for custom schemes)
    if (parsed.protocol !== `${SCHEME}:` && parsed.protocol !== 'https:') {
      return null;
    }

    // Rule 4: Exact hostname equality (for https fallbacks)
    if (parsed.protocol === 'https:' && !ALLOWED_HOSTNAMES.includes(parsed.hostname)) {
      return null;
    }

    // Rule 4: Reject credentials in URL
    if (parsed.username || parsed.password) {
      return null;
    }

    // Rule 4: Route key in a closed map
    if (parsed.pathname !== '/reset-password') {
      return null;
    }

    // Rule 4: Typed parameters (token must be present and non-empty)
    const token = parsed.searchParams.get('token');
    if (!token || token.length === 0) {
      return null;
    }

    // Rule 4: Reject traversal or weird characters (basic sanitization)
    if (token.includes('/') || token.includes('?')) {
      return null;
    }

    return {
      route: 'reset-password',
      params: { token },
    };
  } catch (e) {
    // Rule 4: Reject, never repair. Invalid URL structure.
    return null;
  }
}

/**
 * Central handler for deep links.
 * @param url The raw incoming URL string.
 * @param navigation The navigation ref to trigger navigation.
 */
export async function handleDeepLink(
  url: string,
  navigation: NavigationContainerRef<any>
): Promise<boolean> {
  const route = parseDeepLink(url);

  if (!route) {
    // Rule 4: One generic fallback destination.
    // We do not mutate state or authorize here.
    Alert.alert('Invalid Link', 'The link provided is not valid.');
    return false;
  }

  switch (route.route) {
    case 'reset-password':
      // Rule 4: Navigate only. The screen will fetch data using session identity.
      navigation.navigate('ResetPassword' as never, { token: route.params.token });
      return true;
    default:
      return false;
  }
}

/**
 * Sets up the listener for the application lifecycle.
 */
export function setupDeepLinkListener(
  navigation: NavigationContainerRef<any>
) {
  // Rule 4: Handle links in onCreate and onNewIntent (Android)
  // React Native's Linking.addEventListener handles onNewIntent automatically.
  
  // Initial URL check
  Linking.getInitialURL().then((url) => {
    if (url) {
      handleDeepLink(url, navigation);
    }
  });

  // Rule 4: Handle links in onNewIntent
  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleDeepLink(url, navigation);
  });

  return subscription;
}