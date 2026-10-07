const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const { URL } = require('url');

// Rule 2: Stay on a supported Electron major. Disable runAsNode fuses.
app.disableHardwareAcceleration(); // Optional, but good for isolation if GPU is untrusted

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      // Rule 2: Preload script for IPC communication
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Rule 2: CSP from main process
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'wasm-unsafe-eval'; " + // Allow WASM if needed, otherwise remove 'wasm-unsafe-eval'
          "style-src 'self' 'unsafe-inline'; " +
          "connect-src 'self' https://api.example.com;"
        ],
      },
    });
  });

  // Rule 2: will-navigate denies external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsed = new URL(url);
    if (parsed.origin !== 'https://app.example.com') {
      event.preventDefault();
    }
  });

  // Rule 2: setWindowOpenHandler returns deny by default for external windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const parsed = new URL(url);
    
    // Rule 2 & 4: Allowlist check for new windows
    if (parsed.origin === 'https://app.example.com') {
      return { action: 'allow' };
    }
    
    return { action: 'deny' };
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

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