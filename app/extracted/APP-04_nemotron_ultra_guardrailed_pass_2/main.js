const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { URL } = require('url');

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
      preload: `${__dirname}/preload.js`
    }
  });

  win.loadFile('index.html');
}

app.enableSandbox();
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

const ALLOWED_HOSTS = new Set(['example.com', 'docs.example.com']);

ipcMain.handle('shell:openExternal', async (event, rawUrl) => {
  const senderFrame = event.senderFrame;
  if (!senderFrame || senderFrame.origin !== 'file://') {
    throw new Error('Unauthorized sender');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed');
  }

  if (!ALLOWED_HOSTS.has(parsedUrl.hostname)) {
    throw new Error('Host not allowed');
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('URL must not contain credentials');
  }

  const href = parsedUrl.href;

  await shell.openExternal(href);
});