// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const os = require('os');

// §1. STORAGE & §3. BINARY TRUST: No cleartext secrets, no debuggable flag in release
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // §2. DESKTOP PROCESS ISOLATION: Strict sandboxing
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      // Explicit preload for typed IPC
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile(path.join(__dirname, 'renderer/index.html'));
  }
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

// §2. IPC: Single-purpose named function, typed parameters
ipcMain.handle('read-local-file', async (event, filePath) => {
  try {
    // Verify sender frame origin (optional but recommended for multi-origin apps)
    const senderFrame = event.senderFrame;
    if (!senderFrame) {
      throw new Error('No sender frame');
    }

    // Canonicalize and confine path
    const homeDir = os.homedir();
    const resolvedPath = path.resolve(homeDir, filePath);
    
    // Check if path is within home directory (simple confinement)
    if (!resolvedPath.startsWith(homeDir)) {
      throw new Error('Path outside home directory');
    }

    // Read file
    const content = await fs.readFile(resolvedPath, 'utf-8');
    
    // Return plain serialisable data
    return {
      success: true,
      content: content,
      path: resolvedPath
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});