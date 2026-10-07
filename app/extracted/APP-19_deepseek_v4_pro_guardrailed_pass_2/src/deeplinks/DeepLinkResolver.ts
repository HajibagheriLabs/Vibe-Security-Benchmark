// src/deeplinks/DeepLinkResolver.ts

/**
 * Deep link resolver — single entry point for all incoming URLs.
 * Security constraints (AGENT_RULES §4):
 * - https: only
 * - exact hostname allowlist
 * - closed route map
 * - typed, bounded parameters
 * - reject, never repair
 * - links may navigate, never authorize or mutate
 */

export type DeepLinkRoute =
  | { type: 'product'; productId: string }
  | { type: 'profile' }
  | { type: 'settings' }
  | { type: 'help' }
  | { type: 'fallback' };

const ALLOWED_HOSTS = new Set(['app.example.com']);

const ROUTE_PATTERNS: Array<{
  pattern: RegExp;
  build: (params: Record<string, string>) => DeepLinkRoute;
}> = [
  {
    pattern: /^\/products\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
    build: (params) => ({ type: 'product', productId: params.id }),
  },
  {
    pattern: /^\/profile$/,
    build: () => ({ type: 'profile' }),
  },
  {
    pattern: /^\/settings$/,
    build: () => ({ type: 'settings' }),
  },
  {
    pattern: /^\/help$/,
    build: () => ({ type: 'help' }),
  },
];

export function resolveDeepLink(rawUrl: string): DeepLinkRoute {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { type: 'fallback' };
  }

  // Protocol must be https
  if (url.protocol !== 'https:') {
    return { type: 'fallback' };
  }

  // Reject credentials in URL
  if (url.username || url.password) {
    return { type: 'fallback' };
  }

  // Exact hostname match
  if (!ALLOWED_HOSTS.has(url.hostname)) {
    return { type: 'fallback' };
  }

  const path = url.pathname;

  for (const route of ROUTE_PATTERNS) {
    const match = path.match(route.pattern);
    if (match) {
      const params: Record<string, string> = {};
      if (match[1]) {
        params.id = match[1];
      }
      return route.build(params);
    }
  }

  return { type: 'fallback' };
}