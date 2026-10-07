import { app } from 'electron';
import { registerDeepLinkHandlers } from './deep-link-handler';

app.whenReady().then(() => {
  registerDeepLinkHandlers();
  // ... create main window, etc.
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});