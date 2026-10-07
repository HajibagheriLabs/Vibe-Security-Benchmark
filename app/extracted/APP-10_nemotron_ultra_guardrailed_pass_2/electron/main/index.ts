import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
import { registerCredentialHandlers } from './ipc-handlers';

app.enableSandbox();

function createWindow(): void {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      experimentalFeatures: false,
    },
  });

  win.loadFile(join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
  registerCredentialHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (navEvent, url) => {
    const parsed = new URL(url);
    if (parsed.protocol !== 'file:') navEvent.preventDefault();
  });
  contents.on('will-attach-webview', (webviewEvent, webPreferences) => {
    webviewEvent.preventDefault();
    webPreferences.preload = undefined;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    webPreferences.webSecurity = true;
  });
});

app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
  event.preventDefault();
  callback(false);
});