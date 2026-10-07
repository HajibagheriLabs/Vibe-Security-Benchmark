import { app, BrowserWindow, shell } from 'electron';
import { URL } from 'url';

// ---- Security-relevant decisions ----
// 1. Single resolver for all deep-link entry points (argv, open-url, second-instance).
// 2. Only https: URLs with exact hostname allowlist are accepted.
// 3. Route parameters are typed and bounded; no navigation with raw URL values.
// 4. Links never authorize or mutate state; they only navigate to allowlisted routes.
// 5. All external navigation goes through shell.openExternal after strict validation.

// ---- Configuration ----
const ALLOWED_HOST = 'app.example.com';
const ROUTE_MAP = new Map<string, { path: string; params: Record<string, RegExp> }>([
  ['reset-password', { path: '/reset-password', params: { token: /^[a-zA-Z0-9_-]{20,}$/ } }],
  ['verify-email', { path: '/verify-email', params: { code: /^[a-zA-Z0-9]{6}$/ } }],
  ['invite', { path: '/invite', params: { inviteId: /^[0-9a-f-]{36}$/ } }],
]);

const FALLBACK_ROUTE = '/';

// ---- Types ----
interface ParsedDeepLink {
  route: string;
  params: Record<string, string>;
}

// ---- Core Resolver ----
function resolveDeepLink(rawUrl: string): ParsedDeepLink | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  // Protocol & hostname enforcement
  if (parsed.protocol !== 'https:') return null;
  if (parsed.hostname !== ALLOWED_HOST) return null;
  if (parsed.username || parsed.password) return null;

  // Route extraction (first path segment)
  const pathSegments = parsed.pathname.split('/').filter(Boolean);
  if (pathSegments.length === 0) return { route: FALLBACK_ROUTE, params: {} };

  const routeKey = pathSegments[0];
  const routeDef = ROUTE_MAP.get(routeKey);
  if (!routeDef) return { route: FALLBACK_ROUTE, params: {} };

  // Parameter validation
  const params: Record<string, string> = {};
  for (const [paramName, paramRegex] of Object.entries(routeDef.params)) {
    const value = parsed.searchParams.get(paramName);
    if (!value || !paramRegex.test(value)) return null;
    params[paramName] = value;
  }

  return { route: routeDef.path, params };
}

// ---- Navigation Helper ----
function navigateMainWindow(route: string, params: Record<string, string>): void {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (!mainWindow) return;

  // Internal navigation uses allowlisted route + typed params only
  const url = new URL(`file://${app.getAppPath()}/dist/renderer/index.html`);
  url.hash = `${route}?${new URLSearchParams(params).toString()}`;

  mainWindow.loadURL(url.toString());
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

// ---- External Link Handler (for any https: links rendered in-app) ----
export function handleExternalNavigation(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }

  if (parsed.protocol !== 'https:') return;
  if (parsed.hostname !== ALLOWED_HOST) return;

  shell.openExternal(url);
}

// ---- Public Entry Points ----
export function handleProtocolLaunchArgs(argv: string[]): void {
  // Filter out Electron/Node flags and find the protocol URL
  const protocolUrl = argv.find((arg) => arg.startsWith('myapp://'));
  if (!protocolUrl) return;

  // Convert myapp:// → https:// for unified resolver
  const httpsUrl = protocolUrl.replace('myapp://', 'https://');
  const resolved = resolveDeepLink(httpsUrl);
  if (!resolved) return;

  navigateMainWindow(resolved.route, resolved.params);
}

export function handleOpenUrlEvent(url: string): void {
  const resolved = resolveDeepLink(url);
  if (!resolved) return;

  navigateMainWindow(resolved.route, resolved.params);
}

export function handleSecondInstance(argv: string[]): void {
  handleProtocolLaunchArgs(argv);
}

// ---- Initialization ----
export function registerDeepLinkHandlers(): void {
  // macOS: open-url event
  app.on('open-url', (_event, url) => {
    handleOpenUrlEvent(url);
  });

  // Windows/Linux: second-instance argv
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return;
  }

  app.on('second-instance', (_event, argv) => {
    handleSecondInstance(argv);
  });

  // Initial launch argv (all platforms)
  handleProtocolLaunchArgs(process.argv);
}