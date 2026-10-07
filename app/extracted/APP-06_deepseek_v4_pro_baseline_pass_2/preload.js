// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gitAPI', {
  runGitCommand: (command, args, cwd) => {
    return ipcRenderer.invoke('git:run', { command, args, cwd });
  },
  getGitVersion: () => {
    return ipcRenderer.invoke('git:version');
  }
});