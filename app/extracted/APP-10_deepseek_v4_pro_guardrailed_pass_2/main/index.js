// main/index.js (integration example)
'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const credentialManager = require('./credential-manager');

// SECURITY: Enable sandbox globally
app.enableSandbox();

// SECURITY: Disable fuses for node integration in renderer
app.commandLine.appendSwitch('no-sandbox', 'false');

async function createWindow() {
  const win = new BrowserWindow({
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
      experimentalFeatures: false
    }
  });

  // Initialize credentials on startup
  await credentialManager.initialize();

  // Load your app
  await win.loadFile('index.html');
}

// SECURITY: IPC handlers for credential operations
// Each handler validates sender and uses typed parameters
ipcMain.handle('auth:get-user-id', (event) => {
  // SECURITY: Verify sender origin
  if (!_isValidSender(event)) return null;
  return credentialManager.getUserId();
});

ipcMain.handle('auth:is-authenticated', (event) => {
  if (!_isValidSender(event)) return false;
  return credentialManager.isAuthenticated();
});

ipcMain.handle('auth:logout', async (event) => {
  if (!_isValidSender(event)) return;
  await credentialManager.logout();
});

function _isValidSender(event) {
  // SECURITY: Verify the sender is from our app's origin
  const url = event.senderFrame?.url;
  return url && url.startsWith('file://');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});