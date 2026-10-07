import { app, BrowserWindow, contextBridge, ipcMain } from 'electron';
import path from 'path';
import { getSecureTheme, setSecureTheme } from './theme'; // Assuming theme logic is in theme.ts

// Rule 2: contextBridge exposes named single-purpose functions
contextBridge.exposeInMainWorld('electronAPI', {
  getTheme: () => ipcRenderer.invoke('theme:get-preference'),
  setTheme: (theme: string) => ipcRenderer.invoke('theme:set-preference', theme),
});

// Rule 2: BrowserWindow configuration
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile('index.html');
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