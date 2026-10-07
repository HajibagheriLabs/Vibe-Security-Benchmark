const { app, BrowserWindow, ipcMain, contextBridge } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// Security: Base directory for reading files (e.g., user data or app resources)
const BASE_DIR = path.join(app.getPath('userData'), 'documents');

// Security: Allowlist for renderer origins
const ALLOWED_ORIGINS = new Set(['http://localhost:3000', 'app://local']);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
  });

  mainWindow.loadFile('index.html');

  // Security: Deny navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url);
      if (ALLOWED_ORIGINS.has(parsed.origin)) return;
    } catch (e) {
      // Invalid URL
    }
    event.preventDefault();
  });

  // Security: Deny opening new windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (ALLOWED_ORIGINS.has(parsed.origin)) return { action: 'allow' };
    } catch (e) {}
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);

// Security: IPC Handler for reading text files
ipcMain.handle('read-text-file', async (event, arg) => {
  // 1. Verify sender frame origin
  const senderOrigin = event.senderFrame.origin;
  if (!ALLOWED_ORIGINS.has(senderOrigin)) {
    throw new Error('Unauthorized origin');
  }

  // 2. Parse explicit schema
  if (!arg || typeof arg.filePath !== 'string') {
    throw new Error('Invalid schema: filePath must be a string');
  }

  // 3. Canonicalize and confine path
  const resolvedPath = path.resolve(BASE_DIR, arg.filePath);
  
  // Security: Ensure path is within BASE_DIR to prevent traversal
  if (!resolvedPath.startsWith(BASE_DIR)) {
    throw new Error('Path traversal detected');
  }

  // 4. Read file
  try {
    const content = await fs.readFile(resolvedPath, 'utf-8');
    return content;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('File not found');
    }
    throw error;
  }
});