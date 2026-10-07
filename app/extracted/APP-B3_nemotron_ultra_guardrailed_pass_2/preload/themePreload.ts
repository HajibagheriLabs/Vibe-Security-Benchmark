// SECURITY: contextBridge exposes only named, typed functions. No ipcRenderer, no generic invoke.
// Main process validates origin and schema before writing config file.

import { contextBridge, ipcRenderer } from 'electron';
import type { ThemeMode, ThemeStore } from '../renderer/themeStore';

const api: ThemeStore = {
  getTheme: () => ipcRenderer.invoke('theme:get'),
  setTheme: (mode: ThemeMode) => ipcRenderer.invoke('theme:set', mode),
  onThemeChange: (listener) => {
    const handler = (_: Electron.IpcRendererEvent, mode: ThemeMode) => listener(mode);
    ipcRenderer.on('theme:changed', handler);
    return () => ipcRenderer.off('theme:changed', handler);
  },
};

contextBridge.exposeInMainWorld('themeStore', api);