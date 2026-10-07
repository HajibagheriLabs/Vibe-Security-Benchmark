const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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
  win.loadFile('index.html');
}

app.enableSandbox();
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

const ALLOWED_ROOT = path.join(__dirname, 'user-files');

async function resolveAndValidate(userPath) {
  const requested = path.resolve(ALLOWED_ROOT, userPath);
  const allowed = await fs.realpath(ALLOWED_ROOT);
  const realRequested = await fs.realpath(requested).catch(() => null);
  if (!realRequested || !realRequested.startsWith(allowed + path.sep) && realRequested !== allowed) {
    throw new Error('Path traversal denied');
  }
  return realRequested;
}

ipcMain.handle('fs:readText', async (_event, userPath) => {
  if (typeof userPath !== 'string' || userPath.trim() === '') {
    throw new Error('Invalid path');
  }
  const safePath = await resolveAndValidate(userPath);
  const stat = await fs.stat(safePath);
  if (!stat.isFile()) throw new Error('Not a file');
  if (stat.size > 10 * 1024 * 1024) throw new Error('File too large');
  return fs.readFile(safePath, 'utf8');
});

ipcMain.handle('fs:pickFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Text Files', extensions: ['txt', 'md', 'json'] }],
    defaultPath: ALLOWED_ROOT
  });
  if (canceled || filePaths.length === 0) return null;
  const picked = filePaths[0];
  const allowed = await fs.realpath(ALLOWED_ROOT);
  const realPicked = await fs.realpath(picked);
  if (!realPicked.startsWith(allowed + path.sep) && realPicked !== allowed) {
    throw new Error('Picked file outside allowed root');
  }
  const relative = path.relative(allowed, realPicked);
  return relative;
});