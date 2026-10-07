const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

// Enable sandbox at the earliest possible moment
app.enableSandbox();

// Security: Prevent new window creation from renderer except via our handler
let mainWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Full security flag set - never disable these
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

  // Load local content only - never a remote origin with preload attached
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Handle window.open requests from renderer
  mainWindow.webContents.setWindowOpenHandler(({ url, frameName, features, disposition }) => {
    // Parse and validate URL - only https: allowed, exact hostname allowlist
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { action: 'deny' };
    }

    // Reject non-https protocols
    if (parsedUrl.protocol !== 'https:') {
      return { action: 'deny' };
    }

    // Exact hostname allowlist - no wildcards, no startsWith/includes/endsWith
    const allowedHosts = new Set(['api.example.com', 'app.example.com']);
    if (!allowedHosts.has(parsedUrl.hostname)) {
      return { action: 'deny' };
    }

    // Reject URLs with credentials
    if (parsedUrl.username || parsedUrl.password) {
      return { action: 'deny' };
    }

    // Reject dangerous protocols that could slip through
    const dangerousProtocols = ['javascript:', 'data:', 'file:', 'intent:', 'blob:'];
    if (dangerousProtocols.some(p => url.startsWith(p))) {
      return { action: 'deny' };
    }

    // Create child window with full security flags
    const childWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false, // Don't show until ready
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

    // Navigation guard: deny external navigation attempts
    childWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      const navUrl = new URL(navigationUrl);
      if (navUrl.origin !== parsedUrl.origin) {
        event.preventDefault();
      }
    });

    // Block window.open from child windows (no nested popups)
    childWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

    // Handle external links via shell.openExternal with validation
    childWindow.webContents.setWindowOpenHandler(({ url: extUrl }) => {
      let extParsed;
      try {
        extParsed = new URL(extUrl);
      } catch {
        return { action: 'deny' };
      }
      if (extParsed.protocol === 'https:' && !extParsed.username && !extParsed.password) {
        shell.openExternal(extUrl);
      }
      return { action: 'deny' };
    });

    // Load the validated URL
    childWindow.loadURL(parsedUrl.toString());

    // Show when ready to avoid flash
    childWindow.once('ready-to-show', () => {
      childWindow.show();
    });

    // Clean up reference on close
    childWindow.on('closed', () => {
      // Dereference handled automatically
    });

    // Return the child window to Electron for management
    return { action: 'allow', overrideBrowserWindowOptions: {}, out: childWindow };
  });

  // Block navigation to external URLs in main window
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsed = new URL(url);
    if (parsed.origin !== new URL(mainWindow.webContents.getURL()).origin) {
      event.preventDefault();
    }
  });

  // Handle web-contents-created for any nested webviews (defense in depth)
  app.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
    contents.on('will-navigate', (e, url) => {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') {
        e.preventDefault();
      }
    });
    contents.on('will-attach-webview', (e, webPreferences) => {
      // Strip preload and force safe preferences
      delete webPreferences.preload;
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;
      webPreferences.sandbox = true;
      webPreferences.webSecurity = true;
    });
  });
}

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});