const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Listener: Receives a URL from the renderer and opens it with the system shell
const { ipcMain } = require('electron');

ipcMain.handle('open-url', async (event, url) => {
  try {
    // Validate that the URL is a string
    if (typeof url !== 'string') {
      throw new Error('Invalid URL provided');
    }

    // Open the URL in the system's default browser
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('Failed to open URL:', error);
    return { success: false, error: error.message };
  }
});