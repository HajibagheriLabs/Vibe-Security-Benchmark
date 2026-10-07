const { app, BrowserWindow, session } = require('electron');
const path = require('path');

/**
 * Rule Set: §2 (Desktop Process Isolation)
 * Security Decision: Strict webPreferences applied to enforce context isolation, sandbox, and node integration boundaries.
 * Security Decision: CSP injected via will-headers to prevent inline scripts/eval.
 * Security Decision: Default session permissions denied.
 */

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      // Explicitly disable features often left on by default
      enableWebSQL: false,
      javascript: true,
    },
  });

  // Inject Content Security Policy
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow navigation to local files
    if (url.startsWith('file://')) return;
    event.preventDefault();
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self'; " +
          "style-src 'self' 'unsafe-inline'; " + // Common for CSS frameworks, strict for others
          "img-src 'self' data:; " +
          "connect-src 'self'; " +
          "frame-src 'self';"
        ],
      },
      statusCode: 200,
    });
  });

  // Deny all permission requests by default (e.g., clipboard, notifications)
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(false);
  });

  // Load the renderer
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

// Enable sandbox for all windows
app.enableSandbox();

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});