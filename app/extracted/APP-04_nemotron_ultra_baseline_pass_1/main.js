const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
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

// IPC listener to open external URLs safely
ipcMain.handle('shell:openExternal', async (event, url) => {
  // Basic validation: only allow http/https
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    throw new Error('Invalid URL: only http/https URLs are allowed');
  }

  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (err) {
    console.error('Failed to open external URL:', err);
    return { success: false, error: err.message };
  }
});