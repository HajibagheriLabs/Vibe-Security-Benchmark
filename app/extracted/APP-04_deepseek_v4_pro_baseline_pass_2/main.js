// main.js
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
  // Register IPC listener for opening external URLs
  ipcMain.handle('open-external-url', async (event, url) => {
    try {
      // Validate that the input is a string and non-empty
      if (typeof url !== 'string' || url.trim() === '') {
        throw new Error('Invalid URL: must be a non-empty string');
      }

      // Open the URL with the system's default handler
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('Failed to open external URL:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  });

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