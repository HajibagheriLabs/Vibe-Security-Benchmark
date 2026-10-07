// src/main/protocolHandler.js

const { app, BrowserWindow, ipcMain } = require('electron');
const { URL } = require('url');

// Rule 4: Deep Links — every incoming URL is untrusted.
// Rule 2: Desktop Process Isolation — context isolation enabled, single-purpose functions.

const PROTOCOL = 'myapp';
const ALLOWED_HOSTS = new Set(['myapp', 'myapp.example.com']);

/**
 * Parses and validates a myapp:// URI.
 * @param {string} urlString - The raw protocol string.
 * @returns {{ hostname: string, path: string, query: URLSearchParams } | null}
 */
function parseDeepLink(urlString) {
  try {
    const url = new URL(urlString);

    // Reject non-https-like schemes (though protocol handler usually ensures scheme)
    if (url.protocol !== `${PROTOCOL}:`) {
      return null;
    }

    // Reject if hostname is not in allowlist
    if (!ALLOWED_HOSTS.has(url.hostname)) {
      return null;
    }

    // Reject if credentials are present
    if (url.username || url.password) {
      return null;
    }

    return {
      hostname: url.hostname,
      path: url.pathname,
      query: url.searchParams,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Handles the 'open-url' event (macOS) and processes argv (Windows/Linux).
 * @param {string} url - The URL string from the event or argv.
 * @param {BrowserWindow} mainWindow - The reference to the main window.
 */
function handleProtocolLaunch(url, mainWindow) {
  const parsed = parseDeepLink(url);

  if (!parsed) {
    console.warn(`[Protocol] Invalid or disallowed URL: ${url}`);
    // Rule 4: Reject, never repair. Send to generic fallback.
    mainWindow?.loadURL('https://myapp.com/fallback');
    return;
  }

  // Rule 4: A link may navigate. A link may NEVER authorize or mutate.
  // We send the parsed path/query to the renderer via IPC.
  // The renderer is responsible for fetching data based on this path.
  mainWindow?.webContents.send('protocol-deep-link', {
    path: parsed.path,
    query: Object.fromEntries(parsed.query.entries()),
  });
}

/**
 * Registers the protocol handler and sets up event listeners.
 */
function registerProtocolHandler() {
  // Rule 3: Binary Trust - Ensure protocol is registered for the app.
  if (process.defaultApp) {
    // When running as a script in development, manually register the protocol
    const opts = {
      method: 'open',
      args: [app.getPath('exe'), '--', '%s'],
    };
    app.setAsDefaultProtocolClient(PROTOCOL, opts);
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }

  // Rule 4: ONE resolver handles all deep links.
  // macOS handles 'open-url'
  app.on('open-url', (event, url) => {
    event.preventDefault();
    // Ensure main window is ready before sending IPC
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (win) {
      handleProtocolLaunch(url, win);
    }
  });

  // Windows/Linux handle 'second-instance' (which includes argv)
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
  } else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      // Rule 4: Validate argv items starting with '-' or the protocol URL.
      // On Windows, the protocol URL is usually the last argument.
      const urlArg = commandLine[commandLine.length - 1];
      if (urlArg && urlArg.startsWith(`${PROTOCOL}://`)) {
        const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        if (win) {
          // Restore window if minimized
          if (win.isMinimized()) win.restore();
          win.focus();
          handleProtocolLaunch(urlArg, win);
        }
      }
    });
  }

  // Rule 2: IPC Handler for renderer to request initial deep link data if needed
  // (Optional, depending on architecture. Here we assume renderer handles navigation).
  ipcMain.handle('get-initial-deep-link', () => {
    // This could be used to pass the URL to the renderer on startup
    return process.argv.find(arg => arg.startsWith(`${PROTOCOL}://`));
  });
}

module.exports = { registerProtocolHandler, parseDeepLink };