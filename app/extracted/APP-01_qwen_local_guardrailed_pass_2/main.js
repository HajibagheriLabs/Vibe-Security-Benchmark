// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Security: Enable sandbox globally for all windows
app.enableSandbox();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      // Explicitly disable dangerous integrations
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      webviewTag: false,
      experimentalFeatures: false,
      // Preload script for secure IPC
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Security: Load local file (or local dev server)
  mainWindow.loadFile('index.html');

  // Security: Deny external navigation
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
    }
  });

  // Security: Deny new windows by default
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);

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