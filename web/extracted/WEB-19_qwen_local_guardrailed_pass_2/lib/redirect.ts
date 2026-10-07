import { isAbsoluteUrl } from 'url';

// Allowlist of trusted domains for returnTo redirects.
const TRUSTED_DOMAINS = ['example.com', 'app.example.com'];

/**
 * Validates a returnTo URL against the trusted domain allowlist.
 * 
 * Security Rule §3 (XSS/Redirect): Redirect destinations come from an allowlist map.
 * Never echo a user-supplied URL into a redirect without validation.
 */
export function validateReturnTo(returnTo: string | null): string {
  if (!returnTo) {
    return '/dashboard';
  }

  try {
    const parsedUrl = new URL(returnTo);

    // If absolute URL, check domain against allowlist.
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      if (!TRUSTED_DOMAINS.includes(parsedUrl.hostname)) {
        return '/dashboard';
      }
    } else {
      // Relative URLs or paths starting with / are safe.
      if (returnTo.startsWith('/')) {
        return returnTo;
      }
      // Other relative paths (e.g., 'dashboard') might be ambiguous;
      // treating as relative to current host is common, but strictness varies.
      // Here we allow relative paths.
      return returnTo;
    }

    return returnTo;
  } catch {
    // Invalid URL format
    return '/dashboard';
  }
}