const { app, BrowserWindow, ipcMain, shell } = require('electron');
const url = require('url');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
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
      preload: require('path').join(__dirname, 'preload.js')
    }
  });
  win.loadFile('index.html');
}

app.enableSandbox();
app.whenReady().then(createWindow);

app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (e, navigationUrl) => {
    const parsed = new URL(navigationUrl);
    if (parsed.origin !== 'file://' && parsed.protocol !== 'https:') {
      e.preventDefault();
    }
  });
  contents.on('will-attach-webview', (e, webPreferences) => {
    webPreferences.nodeIntegration = false;
    webPreferences.nodeIntegrationInWorker = false;
    webPreferences.nodeIntegrationInSubFrames = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    webPreferences.webSecurity = true;
    webPreferences.allowRunningInsecureContent = false;
    webPreferences.webviewTag = false;
    webPreferences.experimentalFeatures = false;
    delete webPreferences.preload;
  });
});

ipcMain.handle('shell:openExternal', async (event, rawUrl) => {
  const senderFrame = event.senderFrame;
  if (!senderFrame || senderFrame.origin !== 'file://') {
    throw new Error('Unauthorized sender');
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Only https: URLs are allowed');
  }

  if (parsed.username || parsed.password) {
    throw new Error('URL must not contain credentials');
  }

  const allowedHosts = new Set(['example.com', 'api.example.com']);
  if (!allowedHosts.has(parsed.hostname)) {
    throw new Error('Host not allowed');
  }

  await shell.openExternal(parsed.toString());
});