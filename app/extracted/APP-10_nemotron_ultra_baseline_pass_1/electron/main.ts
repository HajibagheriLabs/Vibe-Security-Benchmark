import { app, BrowserWindow, ipcMain } from 'electron';
import { credentialStore } from './credential-store';
import type { StoredCredentials } from './credential-store';

function createWindow(): void {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: `${__dirname}/preload.js`,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env['VITE_DEV_SERVER_URL']) {
    win.loadURL(process.env['VITE_DEV_SERVER_URL']);
  } else {
    win.loadFile(`${__dirname}/../dist/index.html`);
  }
}

app.whenReady().then(() => {
  ipcMain.handle('credentials:save', async (_event, credentials: Omit<StoredCredentials, 'updatedAt'>) => {
    await credentialStore.save(credentials);
  });

  ipcMain.handle('credentials:load', async () => {
    return await credentialStore.load();
  });

  ipcMain.handle('credentials:clear', async () => {
    await credentialStore.clear();
  });

  ipcMain.handle('credentials:hasCredentials', async () => {
    return await credentialStore.hasCredentials();
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