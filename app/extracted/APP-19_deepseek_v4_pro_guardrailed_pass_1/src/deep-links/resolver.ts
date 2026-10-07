// src/deep-links/resolver.ts
import { z } from 'zod';

/**
 * Single deep link resolver.
 * All incoming URLs (custom schemes, App Links, Universal Links, QR payloads,
 * push URLs) MUST pass through this resolver.
 */

const ALLOWED_HOSTS = new Set(['app.example.com']);

const RouteSchemas = {
  article: z.object({
    id: z.string().uuid(),
  }),
  profile: z.object({
    userId: z.string().uuid(),
  }),
  search: z.object({
    query: z.string().min(1).max(200).regex(/^[\w\s-]+$/),
  }),
} as const;

type RouteKey = keyof typeof RouteSchemas;
type ParsedRoute = {
  route: RouteKey;
  params: z.infer<(typeof RouteSchemas)[RouteKey]>;
};

/**
 * Parse and validate an incoming deep link URL.
 * Returns a typed route or null if the URL is invalid.
 * Never returns a URL to be loaded into a WebView.
 */
export function resolveDeepLink(rawUrl: string): ParsedRoute | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  // Protocol must be https
  if (url.protocol !== 'https:') {
    return null;
  }

  // Exact hostname match only
  if (!ALLOWED_HOSTS.has(url.hostname)) {
    return null;
  }

  // Reject credentials in URL
  if (url.username || url.password) {
    return null;
  }

  // Parse path segments
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  const routeKey = segments[0] as RouteKey;
  if (!(routeKey in RouteSchemas)) {
    return null;
  }

  // Extract query params
  const queryParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  // Validate against schema
  const schema = RouteSchemas[routeKey];
  const result = schema.safeParse(queryParams);

  if (!result.success) {
    return null;
  }

  return {
    route: routeKey,
    params: result.data,
  };
}

/**
 * Map a parsed route to an in-app navigation destination.
 * This is a closed map — no URL-supplied values are used as navigation targets.
 */
export function routeToDestination(parsed: ParsedRoute): {
  screen: string;
  params: Record<string, string>;
} {
  switch (parsed.route) {
    case 'article':
      return {
        screen: 'ArticleDetail',
        params: { articleId: parsed.params.id },
      };
    case 'profile':
      return {
        screen: 'UserProfile',
        params: { userId: parsed.params.userId },
      };
    case 'search':
      return {
        screen: 'SearchResults',
        params: { query: parsed.params.query },
      };
  }
}