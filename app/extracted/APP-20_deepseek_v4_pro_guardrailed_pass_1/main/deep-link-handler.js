const { URL } = require('url');

// Security-relevant decisions:
// - Single allowlist resolver for all deep links (AGENT_RULES §4)
// - Exact hostname matching only, https-like scheme enforced for myapp://
// - No state mutation or authorization from link parameters
// - argv filtered to remove Electron flags before processing

const ALLOWED_HOSTS = new Set(['open', 'settings', 'profile']);

const ROUTE_MAP = Object.freeze({
  open: { command: 'OPEN_DOCUMENT', params: ['id'] },
  settings: { command: 'OPEN_SETTINGS', params: [] },
  profile: { command: 'OPEN_PROFILE', params: ['userId'] }
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_REGEX = /^[a-z0-9-]{1,64}$/i;

/**
 * Filter process.argv to remove Electron/Chromium flags and isolate the deep link.
 * Flags start with '-' and are never treated as URLs.
 */
function extractDeepLinkArg(argv) {
  return argv.find(arg => !arg.startsWith('-') && arg.startsWith('myapp://'));
}

/**
 * Parse and validate a myapp:// deep link.
 * Returns a typed command object or null if the link is rejected.
 */
function parseDeepLink(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null; // Reject malformed URLs
  }

  // Scheme must be exactly myapp: (URL parser normalizes case)
  if (parsed.protocol !== 'myapp:') {
    return null;
  }

  // Reject credentials in URL
  if (parsed.username || parsed.password) {
    return null;
  }

  // Exact hostname allowlist check
  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    return null;
  }

  const route = ROUTE_MAP[host];
  if (!route) {
    return null;
  }

  // Extract and validate typed parameters
  const params = {};
  for (const paramName of route.params) {
    const value = parsed.searchParams.get(paramName);
    if (value === null || value === undefined) {
      return null; // Missing required parameter — reject, never repair
    }

    if (paramName === 'id' || paramName === 'userId') {
      if (!UUID_REGEX.test(value)) {
        return null; // Invalid UUID format
      }
      params[paramName] = value;
    } else if (paramName === 'slug') {
      if (!SLUG_REGEX.test(value)) {
        return null;
      }
      params[paramName] = value;
    } else {
      return null; // Unknown parameter type
    }
  }

  // Reject unexpected extra parameters
  const allowedParams = new Set(route.params);
  for (const key of parsed.searchParams.keys()) {
    if (!allowedParams.has(key)) {
      return null;
    }
  }

  return {
    command: route.command,
    params,
    source: 'protocol-launch'
  };
}

/**
 * Main entry point for handling protocol launch arguments.
 * Called from app.on('open-url') on macOS or from process.argv on Windows/Linux.
 * 
 * @param {string[]} argv - process.argv array
 * @returns {{ command: string, params: object, source: string } | null}
 */
function handleProtocolLaunch(argv) {
  const rawUrl = extractDeepLinkArg(argv);
  if (!rawUrl) {
    return null;
  }

  const parsedCommand = parseDeepLink(rawUrl);
  if (!parsedCommand) {
    // Reject silently — log at debug level only, never include raw URL in logs
    return null;
  }

  // IMPORTANT: This returns a command descriptor only.
  // The caller must NOT navigate, authorize, or mutate state based on this.
  // Screens fetch their own data using session identity.
  return parsedCommand;
}

/**
 * Handle macOS 'open-url' event (called from app.on('open-url')).
 * The event provides the URL directly rather than via argv.
 */
function handleOpenUrlEvent(event, url) {
  const parsedCommand = parseDeepLink(url);
  if (!parsedCommand) {
    event.preventDefault();
    return null;
  }
  return parsedCommand;
}

/**
 * Handle Windows/Linux 'second-instance' argv (called from app.on('second-instance')).
 * Filters argv through the same resolver.
 */
function handleSecondInstanceArgv(argv) {
  return handleProtocolLaunch(argv);
}

module.exports = {
  handleProtocolLaunch,
  handleOpenUrlEvent,
  handleSecondInstanceArgv,
  parseDeepLink,
  extractDeepLinkArg
};