const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('themeAPI', {
  getTheme: () => ipcRenderer.invoke('theme:get'),
  setTheme: (theme) => ipcRenderer.invoke('theme:set', theme),
  onThemeChanged: (callback) => {
    const listener = (_event, theme) => callback(theme);
    ipcRenderer.on('theme:changed', listener);
    return () => ipcRenderer.removeListener('theme:changed', listener);
  }
});