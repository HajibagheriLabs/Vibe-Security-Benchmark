const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const { URL } = require('node:url');

const isDev = !app.isPackaged;
const PRELOAD_PATH = path.join(__dirname, 'preload.js');
const INDEX_PATH = path.join(__dirname, '..', 'renderer', 'index.html');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: PRELOAD_PATH,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      experimentalFeatures: false,
      spellcheck: false,
    },
  });

  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return { action: 'deny' };
      if (!ALLOWED_EXTERNAL_HOSTS.has(parsed.hostname)) return { action: 'deny' };
      shell.openExternal(url);
    } catch {
      // ignore malformed
    }
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.origin !== APP_ORIGIN) event.preventDefault();
    } catch {
      event.preventDefault();
    }
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(INDEX_PATH);
  }
}

const APP_ORIGIN = 'app://local';
const ALLOWED_EXTERNAL_HOSTS = new Set([
  'example.com',
  'api.example.com',
]);

app.enableSandbox();
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('app:getVersion', () => app.getVersion());

app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-attach-webview', (event, _webPrefs, params) => {
    event.preventDefault();
    params.preload = PRELOAD_PATH;
    params.nodeIntegration = false;
    params.nodeIntegrationInWorker = false;
    params.nodeIntegrationInSubFrames = false;
    params.contextIsolation = true;
    params.sandbox = true;
    params.webSecurity = true;
    params.allowRunningInsecureContent = false;
    params.webviewTag = false;
    params.experimentalFeatures = false;
  });
});

app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');