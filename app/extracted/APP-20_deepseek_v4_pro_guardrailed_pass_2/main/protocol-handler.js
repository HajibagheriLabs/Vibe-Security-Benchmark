// main/protocol-handler.js
'use strict';

const { URL } = require('url');

/**
 * Single resolver for all incoming protocol launch arguments.
 * Rule set: §4 DEEP LINKS — every incoming URL is an unauthenticated RPC.
 *
 * Security decisions:
 * - Only https: protocol is accepted (myapp:// is rejected as non-https).
 * - Exact hostname allowlist, never startsWith/includes/endsWith.
 * - Routes come from a closed map; parameters are typed and bounded.
 * - Links may navigate only; never authorize or mutate state.
 */

const ALLOWED_HOSTS = Object.freeze([
  'app.example.com',
  'docs.example.com'
]);

const ROUTE_MAP = Object.freeze({
  'open-document': {
    validate: (params) => {
      const { id } = params;
      return typeof id === 'string' && /^[a-f0-9-]{36}$/i.test(id);
    },
    command: (params) => ({ type: 'NAVIGATE_DOCUMENT', documentId: params.id })
  },
  'open-settings': {
    validate: () => true,
    command: () => ({ type: 'NAVIGATE_SETTINGS' })
  },
  'open-profile': {
    validate: (params) => {
      const { userId } = params;
      return typeof userId === 'string' && /^[a-zA-Z0-9_-]{3,64}$/.test(userId);
    },
    command: (params) => ({ type: 'NAVIGATE_PROFILE', userId: params.userId })
  }
});

const FALLBACK_DESTINATION = Object.freeze({
  type: 'NAVIGATE_HOME'
});

/**
 * Parse and validate a single argv item as a protocol launch URL.
 * @param {string} rawArg - Raw argv item, potentially prefixed with flags.
 * @returns {object|null} Typed navigation command, or null if not a protocol URL.
 */
function parseProtocolArg(rawArg) {
  if (typeof rawArg !== 'string' || rawArg.length === 0) {
    return null;
  }

  // Filter argv items starting with '-' before use (per §4 Desktop).
  if (rawArg.startsWith('-')) {
    return null;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawArg);
  } catch {
    return null; // Reject, never repair.
  }

  // Protocol check: https: only. myapp:// is not https and is rejected.
  if (parsedUrl.protocol !== 'https:') {
    return null;
  }

  // Exact hostname equality against allowlist.
  if (!ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
    return null;
  }

  // Reject credentials in URL.
  if (parsedUrl.username || parsedUrl.password) {
    return null;
  }

  // Route key from pathname, stripped of leading slash.
  const routeKey = parsedUrl.pathname.replace(/^\/+/, '');
  const route = ROUTE_MAP[routeKey];
  if (!route) {
    return FALLBACK_DESTINATION;
  }

  // Parse query parameters into a plain object.
  const params = {};
  for (const [key, value] of parsedUrl.searchParams.entries()) {
    params[key] = value;
  }

  // Typed schema validation. Reject, never coerce.
  if (!route.validate(params)) {
    return FALLBACK_DESTINATION;
  }

  return route.command(params);
}

/**
 * Extract protocol launch commands from process.argv.
 * Handles both first-launch (argv includes the URL) and second-instance
 * (URL passed as additional argument) scenarios.
 * @param {string[]} argv - process.argv array.
 * @returns {object|null} Typed navigation command, or null if none found.
 */
function extractProtocolCommand(argv) {
  if (!Array.isArray(argv)) {
    return null;
  }

  // Skip the first two entries (executable path and script path).
  for (let i = 2; i < argv.length; i++) {
    const command = parseProtocolArg(argv[i]);
    if (command) {
      return command;
    }
  }

  return null;
}

/**
 * Validate a protocol URL from the macOS 'open-url' event.
 * @param {string} urlString - URL string from the open-url event.
 * @returns {object|null} Typed navigation command, or null if invalid.
 */
function validateOpenUrl(urlString) {
  return parseProtocolArg(urlString);
}

module.exports = {
  extractProtocolCommand,
  validateOpenUrl,
  parseProtocolArg,
  ALLOWED_HOSTS,
  ROUTE_MAP,
  FALLBACK_DESTINATION
};