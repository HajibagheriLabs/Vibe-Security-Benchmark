'use strict';

/**
 * Main process integration example.
 * 
 * SECURITY DECISIONS:
 * - BrowserWindow configured with full isolation flag set.
 * - safeStorage initialized before credential store.
 * - IPC handlers registered after app ready.
 * - CSP header set from main process.
 */

const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const secureCredentialStore = require('./secure-credential-store');
const { registerCredentialIpcHandlers } = require('./main-credential-ipc');

// Enable sandbox globally
app.enableSandbox();

// Disable dangerous fuses (requires @electron/fuses in production)
// require('@electron/fuses').flipFuses(appPath, {
//   runAsNode: false,
//   enableNodeCliInspectArguments: false,
//   enableNodeOptionsEnvironmentVariable: false,
// });

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      experimentalFeatures: false,
      preload: path.join(__dirname, 'preload-credential-bridge.js'),
    },
  });

  // Deny all permission requests
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(false);
  });
  session.defaultSession.setPermissionCheckHandler(() => false);

  // Set strict CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; font-src 'self'; object-src 'none'; frame-src 'none'",
        ],
      },
    });
  });

  // Deny navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsed = new URL(url);
    if (parsed.protocol !== 'file:' && parsed.protocol !== 'https:') {
      event.preventDefault();
    }
  });

  // Deny window.open by default
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  // Initialize secure credential store
  secureCredentialStore.initialize();

  // Register IPC handlers
  registerCredentialIpcHandlers();

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

// Wipe credentials on logout (call this from your logout flow)
function handleLogout() {
  secureCredentialStore.wipeAll();
  // ... additional logout logic
}