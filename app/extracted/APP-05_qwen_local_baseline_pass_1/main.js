const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle window.open requests from the renderer process
ipcMain.on('open-window', (event, { url, options }) => {
  const childWindow = new BrowserWindow({
    width: options?.width || 600,
    height: options?.height || 400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  childWindow.loadURL(url);

  childWindow.on('closed', () => {
    // Optionally handle cleanup
  });
});

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