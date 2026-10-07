const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

// Security: Enable sandbox globally before any window creation
app.enableSandbox();

// Security: Single allowlist resolver for all external URLs
const ALLOWED_HOSTS = new Set([
  'example.com',
  'docs.example.com'
]);

function validateAndResolveUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (error) {
    return { error: 'INVALID_URL' };
  }

  // Security: https: only, no credentials, exact hostname allowlist
  if (parsed.protocol !== 'https:') {
    return { error: 'INSECURE_PROTOCOL' };
  }

  if (parsed.username || parsed.password) {
    return { error: 'CREDENTIALS_IN_URL' };
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return { error: 'HOST_NOT_ALLOWED' };
  }

  return { url: parsed.toString() };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // Security: Full renderer isolation flag set
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      experimentalFeatures: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Security: Deny all navigation to external URLs
  win.webContents.on('will-navigate', (event, url) => {
    const result = validateAndResolveUrl(url);
    if (result.error) {
      event.preventDefault();
    }
  });

  // Security: Deny all window.open requests by default
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Security: Deny all permission requests by default
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(false);
  });
  win.webContents.session.setPermissionCheckHandler(() => false);

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  // Security: IPC handler with sender verification, schema validation, and URL allowlist
  ipcMain.handle('open-external-url', (event, rawUrl) => {
    // Security: Verify sender frame origin
    const senderOrigin = new URL(event.senderFrame.url).origin;
    const expectedOrigin = new URL(`file://${path.join(__dirname, 'index.html')}`).origin;
    
    if (senderOrigin !== expectedOrigin) {
      return { error: 'UNAUTHORIZED_SENDER' };
    }

    // Security: Parse explicit schema - reject non-string input
    if (typeof rawUrl !== 'string' || rawUrl.length === 0 || rawUrl.length > 2048) {
      return { error: 'INVALID_INPUT' };
    }

    // Security: Validate against allowlist resolver
    const result = validateAndResolveUrl(rawUrl);
    if (result.error) {
      return { error: result.error };
    }

    // Security: shell.openExternal only after URL parsing and https: validation
    shell.openExternal(result.url);
    return { success: true };
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});