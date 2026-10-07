import { Linking, Platform } from 'react-native';
import { URL } from 'whatwg-url';

export type DeepLinkRoute = 'reset-password' | 'unknown';

export interface ParsedDeepLink {
  route: DeepLinkRoute;
  token?: string;
  rawUrl: string;
}

const ALLOWED_HOST = 'reset-password';
const ALLOWED_SCHEME = 'myapp';

function isValidToken(token: string): boolean {
  // Expect opaque, URL-safe token; adjust regex to your token format
  return /^[A-Za-z0-9\-_]{16,128}$/.test(token);
}

export function parseDeepLink(url: string): ParsedDeepLink {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { route: 'unknown', rawUrl: url };
  }

  if (parsed.protocol !== `${ALLOWED_SCHEME}:`) {
    return { route: 'unknown', rawUrl: url };
  }

  if (parsed.hostname !== ALLOWED_HOST) {
    return { route: 'unknown', rawUrl: url };
  }

  if (parsed.pathname !== '/') {
    return { route: 'unknown', rawUrl: url };
  }

  const token = parsed.searchParams.get('token');
  if (!token || !isValidToken(token)) {
    return { route: 'unknown', rawUrl: url };
  }

  return { route: 'reset-password', token, rawUrl: url };
}

export function setupDeepLinkHandler(
  onResetPassword: (token: string) => void,
): (() => void) {
  const handleUrl = (url: string) => {
    const parsed = parseDeepLink(url);
    if (parsed.route === 'reset-password' && parsed.token) {
      onResetPassword(parsed.token);
    }
  };

  Linking.addEventListener('url', ({ url }) => handleUrl(url));

  if (Platform.OS !== 'android') {
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
  }

  return () => {
    Linking.removeAllListeners('url');
  };
}