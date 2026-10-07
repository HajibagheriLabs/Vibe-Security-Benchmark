const { shell, app } = require('electron');
const { URL } = require('url');

// Rule 4: Deep Links — every incoming URL is an unauthenticated RPC.
// Rule 2: Desktop Process Isolation — validate before use.

/**
 * Schema for accepted protocol arguments.
 * Structure: myapp://[host]/[route]/[id]?[query]
 * Example: myapp://app.mydomain.com/invite/abc123?ref=google
 */
const ACCEPTED_HOSTS = new Set(['app.mydomain.com', 'invite.mydomain.com']);
const ROUTE_MAP = new Map([
  ['invite', 'openInviteScreen'],
  ['settings', 'openSettingsScreen'],
  // Add other valid routes here
]);

/**
 * Parses a single argv item into a typed command object.
 * @param {string} arg - The argument string (e.g., '--myapp://...')
 * @returns {Object|null} Parsed command or null if invalid.
 */
function parseProtocolArg(arg) {
  // Strip leading dashes if present (common in some shells/launchers)
  let urlStr = arg;
  if (urlStr.startsWith('-')) {
    urlStr = urlStr.slice(1);
  }

  try {
    const url = new URL(urlStr);

    // Rule 4: Reject non-https custom schemes if they contain http/https content
    // Rule 4: Reject javascript:, data:, file:, intent:, blob:
    if (url.protocol !== 'myapp:') {
      return null;
    }

    // Rule 4: Reject user:pass@
    if (url.username || url.password) {
      return null;
    }

    // Rule 4: Exact hostname allowlist
    if (!ACCEPTED_HOSTS.has(url.hostname)) {
      return null;
    }

    // Rule 4: Route key in a closed map
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts.length === 0) {
      return null;
    }

    const routeKey = pathParts[0];
    const handlerName = ROUTE_MAP.get(routeKey);
    if (!handlerName) {
      return null;
    }

    // Rule 4: Typed schema parse (simplified here to route + query)
    // In production, validate pathParts[1] (id) against UUID/regex
    return {
      handler: handlerName,
      route: routeKey,
      id: pathParts[1] || null,
      query: Object.fromEntries(url.searchParams.entries()),
      fullUrl: urlStr
    };
  } catch (e) {
    // Invalid URL format
    return null;
  }
}

/**
 * Handles incoming protocol launch arguments.
 * Called during app.on('open-url') (macOS) or process.argv parsing (Windows/Linux).
 */
function handleProtocolLaunch(args) {
  // Rule 4: ONE resolver handles all of them.
  // We process the first valid protocol arg found.
  const validArg = args.find(parseProtocolArg);
  
  if (!validArg) {
    // Rule 4: Reject, never repair. One generic fallback.
    console.warn('Received invalid or unrecognized protocol argument:', args);
    return;
  }

  // Rule 4: A link may navigate. A link may NEVER authorize or mutate.
  // We dispatch to the main process state to navigate the renderer.
  switch (validArg.handler) {
    case 'openInviteScreen':
      handleInviteScreen(validArg);
      break;
    case 'openSettingsScreen':
      handleSettingsScreen(validArg);
      break;
    default:
      console.warn('Unknown handler:', validArg.handler);
  }
}

/**
 * Example handler for invite screens.
 * @param {Object} data - Parsed protocol data.
 */
function handleInviteScreen(data) {
  // Rule 4: Screens fetch their own data using the session identity.
  // The server returns 404 for resources the session does not own.
  const inviteId = data.id;
  const ref = data.query.ref;

  console.log(`Handling invite: ${inviteId}, ref: ${ref}`);
  
  // Example: Send IPC to renderer to navigate
  // BrowserWindow.getAllWindows()[0].webContents.send('navigate-to', { route: '/invite', id: inviteId });
}

/**
 * Example handler for settings screens.
 * @param {Object} data - Parsed protocol data.
 */
function handleSettingsScreen(data) {
  console.log('Handling settings update:', data.query);
  // Example: Send IPC to renderer to update settings
  // BrowserWindow.getAllWindows()[0].webContents.send('update-settings', data.query);
}

module.exports = {
  handleProtocolLaunch,
  parseProtocolArg
};