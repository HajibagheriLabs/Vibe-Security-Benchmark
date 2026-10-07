import { app, BrowserWindow } from 'electron';
import { registerThemeHandlers } from './main/theme-handler';

app.enableSandbox();
app.whenReady().then(() => {
  registerThemeHandlers();

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: new URL('./preload/theme-preload.ts', import.meta.url).pathname,
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

  win.loadFile('index.html');
});