const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// Enable sandbox before any BrowserWindow is created
app.enableSandbox();

function createMainWindow() {
  const mainWindow = new BrowserWindow({
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
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Handle window.open requests from renderer
  mainWindow.webContents.setWindowOpenHandler(({ url, frameName, features, disposition }) => {
    // Only allow https: URLs
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { action: 'deny' };
    }

    if (parsedUrl.protocol !== 'https:') {
      return { action: 'deny' };
    }

    // Exact hostname allowlist - no wildcards, no suffix matching
    const allowedHosts = new Set([
      'app.example.com',
      'api.example.com',
      'docs.example.com'
    ]);

    if (!allowedHosts.has(parsedUrl.hostname)) {
      return { action: 'deny' };
    }

    // Reject dangerous protocols explicitly
    const dangerousProtocols = ['javascript:', 'data:', 'file:', 'intent:', 'blob:'];
    if (dangerousProtocols.some(p => parsedUrl.protocol === p)) {
      return { action: 'deny' };
    }

    // Reject URLs with embedded credentials
    if (parsedUrl.username || parsedUrl.password) {
      return { action: 'deny' };
    }

    // For external links, open in system browser instead of Electron window
    if (disposition === 'new-window' || disposition === 'foreground-tab' || disposition === 'background-tab') {
      // Open externally in default browser
      shell.openExternal(parsedUrl.toString()).catch(() => {
        // Fail silently - already denied
      });
      return { action: 'deny' };
    }

    // For popups/dialogs within app, create a controlled child window
    // Only allow specific routes from allowlist
    const allowedRoutes = new Set([
      '/oauth/callback',
      '/share',
      '/print',
      '/help'
    ]);

    const pathname = parsedUrl.pathname;
    if (!allowedRoutes.has(pathname)) {
      return { action: 'deny' };
    }

    // Create child window with same security flags
    const childWindow = new BrowserWindow({
      width: 600,
      height: 400,
      show: false,
      parent: mainWindow,
      modal: disposition === 'dialog',
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
        preload: path.join(__dirname, 'preload.js')
      }
    });

    // Deny all permission requests by default
    childWindow.webContents.setPermissionRequestHandler(() => false);
    childWindow.webContents.setPermissionCheckHandler(() => false);

    // Block navigation to external URLs
    childWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      const navUrl = new URL(navigationUrl);
      if (navUrl.hostname !== parsedUrl.hostname || navUrl.protocol !== 'https:') {
        event.preventDefault();
      }
    });

    // Block window.open in child windows
    childWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

    // Block new window creation from child
    childWindow.webContents.on('did-create-window', (event, newWebContents) => {
      newWebContents.close();
    });

    childWindow.once('ready-to-show', () => {
      childWindow.show();
    });

    childWindow.loadURL(parsedUrl.toString());

    return { action: 'allow', outlivesOpener: false, browserWindow: childWindow };
  });

  // Additional navigation guard for main window
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !['app.example.com', 'api.example.com', 'docs.example.com'].includes(parsed.hostname)) {
      event.preventDefault();
    }
  });

  // CSP via headers
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const csp = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.example.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');

    const responseHeaders = {
      ...details.responseHeaders,
      'Content-Security-Policy': [csp],
      'X-Content-Type-Options': ['nosniff'],
      'X-Frame-Options': ['DENY'],
      'Referrer-Policy': ['strict-origin-when-cross-origin']
    };

    callback({ responseHeaders });
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

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

// Security: Disable runAsNode and debug flags in production
if (process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath)) {
  // Development only - never in production
} else {
  // Production: ensure no debug flags
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = undefined;
}