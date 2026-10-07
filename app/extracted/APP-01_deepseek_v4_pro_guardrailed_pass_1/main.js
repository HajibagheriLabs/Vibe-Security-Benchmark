// main.js

const { app, BrowserWindow, session } = require('electron');
const path = require('path');

// Security-relevant decision: enable sandbox globally before any window creation.
app.enableSandbox();

// Security-relevant decision: deny all permission requests by default.
app.on('web-contents-created', (_event, contents) => {
  contents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  contents.session.setPermissionCheckHandler(() => false);

  // Security-relevant decision: deny external navigation and window.open by default.
  contents.on('will-navigate', (event, navigationUrl) => {
    const allowed = isAllowedInternalUrl(navigationUrl);
    if (!allowed) {
      event.preventDefault();
    }
  });

  contents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Security-relevant decision: strip preload and force safe prefs on any webview attach.
  contents.on('will-attach-webview', (event, webPreferences, params) => {
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    webPreferences.webSecurity = true;
    webPreferences.allowRunningInsecureContent = false;
    webPreferences.webviewTag = false;
    webPreferences.experimentalFeatures = false;
  });
});

// Security-relevant decision: set a strict CSP from the main process.
app.on('ready', () => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
        ],
      },
    });
  });
});

function isAllowedInternalUrl(urlString) {
  try {
    const url = new URL(urlString);
    // Security-relevant decision: only allow file: protocol for the local renderer.
    return url.protocol === 'file:';
  } catch {
    return false;
  }
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    show: false,
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
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Security-relevant decision: load only the local renderer file, never a remote origin.
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    // No reference cleanup needed if we use a single window; keep for clarity.
  });

  return mainWindow;
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});