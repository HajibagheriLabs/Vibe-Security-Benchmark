const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
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
      experimentalFeatures: false,
    },
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  } else {
    win.loadURL('http://localhost:5173');
  }
}

app.whenReady().then(() => {
  app.enableSandbox();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Example secure IPC handler template
ipcMain.handle('example-action', async (event, payload) => {
  // 1. Verify sender frame origin
  const sender = event.senderFrame;
  if (!sender || sender.origin !== (app.isPackaged ? 'file://' : 'http://localhost:5173')) {
    throw new Error('Unauthorized sender');
  }
  // 2. Parse explicit schema (example: expect { id: string })
  if (typeof payload?.id !== 'string') throw new Error('Invalid payload');
  // 3. Authorize against main-process state (placeholder)
  // 4. Canonicalize and confine any path (not needed here)
  // 5. Execute constant binary with args (not needed here)
  return { ok: true };
});