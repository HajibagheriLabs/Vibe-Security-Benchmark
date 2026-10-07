// main.js
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

// Security-relevant decision: URL opening is restricted to an exact-hostname, HTTPS-only allowlist.
const ALLOWED_DESTINATIONS = new Map([
  ['docs.example.com', (url) => url.pathname.startsWith('/help/')],
  ['support.example.com', () => true],
]);

app.enableSandbox();

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
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Security-relevant decision: IPC handler verifies sender origin, parses schema, and validates against allowlist.
ipcMain.handle('open-external-url', async (event, rawUrl) => {
  // 1. Verify sender frame origin
  const senderOrigin = new URL(event.senderFrame.url).origin;
  const expectedOrigin = 'file://'; // Adjust to your actual app origin
  if (senderOrigin !== expectedOrigin) {
    return { success: false, error: 'unauthorized-origin' };
  }

  // 2. Parse explicit schema
  if (typeof rawUrl !== 'string' || rawUrl.length > 2048) {
    return { success: false, error: 'invalid-input' };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return { success: false, error: 'invalid-url' };
  }

  // 3. Validate against allowlist
  if (parsedUrl.protocol !== 'https:') {
    return { success: false, error: 'non-https-url' };
  }

  if (parsedUrl.username || parsedUrl.password) {
    return { success: false, error: 'credentials-in-url' };
  }

  const hostname = parsedUrl.hostname;
  const validator = ALLOWED_DESTINATIONS.get(hostname);
  if (!validator || !validator(parsedUrl)) {
    return { success: false, error: 'host-not-allowed' };
  }

  // 4. Open only validated HTTPS URLs
  await shell.openExternal(parsedUrl.toString());
  return { success: true };
});