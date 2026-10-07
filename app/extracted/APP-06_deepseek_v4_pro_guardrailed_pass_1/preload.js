const { contextBridge } = require('electron');

// Security: Expose only named, typed functions - no raw ipcRenderer
contextBridge.exposeInMainWorld('gitAPI', {
  executeGit: (command, args, repoPath) => {
    // Security: Validate types before sending to main process
    if (typeof command !== 'string') {
      return Promise.reject(new Error('Command must be a string'));
    }
    
    if (!Array.isArray(args)) {
      return Promise.reject(new Error('Arguments must be an array'));
    }
    
    if (typeof repoPath !== 'string') {
      return Promise.reject(new Error('Repository path must be a string'));
    }
    
    // Security: Invoke through typed IPC channel
    return window.electron.ipcRenderer.invoke('git:execute', {
      command,
      args,
      repoPath
    });
  }
});