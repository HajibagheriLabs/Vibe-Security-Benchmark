// main.js
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  // IPC listener to open external URLs with the system shell
  ipcMain.handle('open-external-url', async (event, url) => {
    // Validate that the URL is a string and uses an allowed protocol
    if (typeof url !== 'string' || url.trim() === '') {
      throw new Error('Invalid URL: URL must be a non-empty string');
    }

    try {
      const parsedUrl = new URL(url);
      const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
      
      if (!allowedProtocols.includes(parsedUrl.protocol)) {
        throw new Error(`Blocked URL protocol: ${parsedUrl.protocol}`);
      }

      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('Failed to open external URL:', error);
      throw error;
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