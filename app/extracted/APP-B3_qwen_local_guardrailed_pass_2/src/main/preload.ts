import { contextBridge, ipcRenderer } from 'electron';

// Rule 2: contextBridge exposes named single-purpose functions with typed parameters.
// Rule 2: Never return a Node object or stream.

contextBridge.exposeInMainWorld('electronAPI', {
  getTheme: () => ipcRenderer.invoke('theme:get-preference'),
  setTheme: (theme: 'light' | 'dark' | 'system') => ipcRenderer.invoke('theme:set-preference', theme),
});