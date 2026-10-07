import { Linking } from 'react-native';
import { verifyTokenSignature, getUserByEmail } from './auth-service';
import { navigateTo } from './navigation-service';

// Rule 4: Deep links are unauthenticated RPC.
// Strategy: Parse the link, validate the token server-side, then navigate to a screen
// that fetches its own data (email) based on the session or the validated token.

const ALLOWED_HOSTS = ['myapp.com'];
const RESET_PASSWORD_ROUTE = 'reset-password';

/**
 * Handles incoming deep links for password reset.
 * @param {string} url - The full deep link URL (e.g., myapp://reset-password?token=abc123)
 */
export async function handleResetPasswordLink(url) {
  let parsedUrl;
  try {
    // Rule 4: Reject, never repair. Parse strictly.
    // Note: 'myapp://' is a custom scheme, not https, but we validate structure similarly.
    parsedUrl = new URL(url);
  } catch (e) {
    console.warn('[DeepLink] Invalid URL format:', url);
    return false;
  }

  // Rule 4: Reject unknown schemes/hosts
  if (parsedUrl.protocol !== 'myapp:' || !ALLOWED_HOSTS.includes(parsedUrl.host)) {
    console.warn('[DeepLink] Rejected: Host not in allowlist');
    return false;
  }

  // Rule 4: Reject non-whitelisted routes
  if (parsedUrl.pathname !== `/${RESET_PASSWORD_ROUTE}`) {
    console.warn('[DeepLink] Rejected: Route not in allowlist');
    return false;
  }

  // Rule 4: Typed schema parse. Token must be a non-empty string.
  const token = parsedUrl.searchParams.get('token');
  if (!token || typeof token !== 'string') {
    console.warn('[DeepLink] Rejected: Missing or invalid token');
    return false;
  }

  try {
    // Rule 4: A link may NEVER authorize. It only triggers navigation.
    // We validate the token format/signature here to ensure it's a valid reset token,
    // but we do NOT use it to set global auth state.
    const isValidToken = await verifyTokenSignature(token);
    
    if (!isValidToken) {
      // Rule 4: Reject, never repair. Navigate to generic fallback or error screen.
      navigateTo('reset-password-expired');
      return true;
    }

    // Rule 4: A link may navigate.
    // We pass the token as a parameter. The target screen will use it to fetch the user's email
    // and render the reset form. The screen itself will verify session context if needed.
    navigateTo('reset-password-form', { token });
    return true;

  } catch (error) {
    console.error('[DeepLink] Token validation failed:', error);
    navigateTo('reset-password-expired');
    return true;
  }
}

/**
 * Central resolver for the app's Linking API.
 */
export async function handleDeepLink(event) {
  const { url } = event;
  
  if (!url) return;

  // Rule 4: ONE resolver handles all deep links.
  if (url.startsWith('myapp://')) {
    const handled = await handleResetPasswordLink(url);
    if (handled) return;
  }

  // Rule 4: Generic fallback destination for unknown links.
  navigateTo('home');
}

// Setup listener
export function setupDeepLinkListener() {
  Linking.addEventListener('url', handleDeepLink);
  
  // Handle initial URL (app launched from closed state)
  Linking.getInitialURL().then((url) => {
    if (url) {
      handleDeepLink({ url });
    }
  }).catch(console.error);
}