import { Linking, Platform, Alert } from 'react-native';
import { URL } from 'react-native-url-polyfill';

// Exact hostname allowlist — no wildcards, no subdomain matching
const ALLOWED_HOSTS = new Set(['app.example.com', 'auth.example.com']);

// Closed route map — keys are opaque, values are native route names
const ROUTE_MAP: ReadonlyMap<string, string> = new Map([
  ['reset-password', 'PasswordReset'],
  ['verify-email', 'EmailVerification'],
  ['invite', 'TeamInvite'],
]);

// Typed parameter schemas per route
const PARAM_SCHEMAS: ReadonlyMap<string, ReadonlyArray<string>> = new Map([
  ['reset-password', ['token']],
  ['verify-email', ['token', 'email']],
  ['invite', ['inviteId']],
]);

interface ParsedDeepLink {
  route: string;
  params: Readonly<Record<string, string>>;
}

function parseDeepLink(urlString: string): ParsedDeepLink | null {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return null;
  }

  // HTTPS only — reject custom schemes, http:, javascript:, data:, file:, blob:
  if (parsed.protocol !== 'https:') return null;

  // Exact hostname equality — no startsWith/includes/endsWith
  if (!ALLOWED_HOSTS.has(parsed.hostname)) return null;

  // Path must map to a known route key
  const pathKey = parsed.pathname.replace(/^\//, '');
  const nativeRoute = ROUTE_MAP.get(pathKey);
  if (!nativeRoute) return null;

  // Extract and validate only allowlisted parameters
  const allowedParams = PARAM_SCHEMAS.get(pathKey) ?? [];
  const params: Record<string, string> = {};
  for (const key of allowedParams) {
    const value = parsed.searchParams.get(key);
    if (!value) return null; // Required parameter missing
    // Basic format validation — extend with UUID/enum/regex as needed
    if (!/^[a-zA-Z0-9._-]+$/.test(value)) return null;
    params[key] = value;
  }

  // Reject any extra parameters — no partial application
  for (const key of parsed.searchParams.keys()) {
    if (!allowedParams.includes(key)) return null;
  }

  return { route: nativeRoute, params };
}

export function setupDeepLinkListener(
  navigate: (route: string, params: Readonly<Record<string, string>>) => void
): () => void {
  const handleUrl = (url: string) => {
    const parsed = parseDeepLink(url);
    if (!parsed) {
      // One generic fallback — never repair or coerce
      navigate('Home', {});
      return;
    }
    // Navigate to native screen only — screen fetches data via session
    navigate(parsed.route, parsed.params);
  };

  // Cold start
  Linking.getInitialURL().then(handleUrl).catch(() => {});

  // Warm start — handle both onCreate and onNewIntent equivalents
  const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));

  return () => subscription.remove();
}

// Usage in native screen (e.g., PasswordResetScreen):
// - Receives { token } from deep link
// - Calls API: POST /auth/reset-password with { token, newPassword }
// - Server validates token, binds to session, returns 404 if token invalid/expired
// - No token, userId, or amount ever comes from the URL into a WebView