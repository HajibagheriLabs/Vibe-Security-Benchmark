const { app, BrowserWindow, session, shell } = require('electron');
const path = require('path');

// Security: enable sandbox globally before any window creation
app.enableSandbox();

// Security: deny all permission requests by default
app.on('web-contents-created', (event, contents) => {
  contents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(false);
  });
  contents.session.setPermissionCheckHandler((webContents, permission) => {
    return false;
  });

  // Security: prevent navigation to external URLs
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const isLocalFile = parsedUrl.protocol === 'file:' && 
                        parsedUrl.pathname.startsWith(path.join(__dirname, 'renderer'));
    
    if (!isLocalFile) {
      event.preventDefault();
    }
  });

  // Security: deny window.open by default
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Security: strip preload and force safe preferences on webviews
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

// Security: set CSP headers for all responses
app.on('web-contents-created', (event, contents) => {
  contents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'self'"
        ]
      }
    });
  });
});

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      // Security: full isolation and sandboxing
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

  // Security: prevent external URL opening via shell
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'file:') {
      event.preventDefault();
    }
  });

  // Security: handle external links safely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol === 'https:' && !parsedUrl.username && !parsedUrl.password) {
        shell.openExternal(parsedUrl.toString());
      }
    } catch (error) {
      // Invalid URL - deny
    }
    return { action: 'deny' };
  });

  // Load the renderer
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
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