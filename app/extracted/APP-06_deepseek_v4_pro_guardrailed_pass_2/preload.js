// preload.js
const { contextBridge } = require('electron');

// Security: Expose only named, single-purpose functions with typed parameters
contextBridge.exposeInMainWorld('gitAPI', {
  executeGitCommand: (command, args, repoPath) => {
    // Security: Validate types before sending to main process
    if (typeof command !== 'string' || !Array.isArray(args) || typeof repoPath !== 'string') {
      return Promise.reject(new Error('Invalid parameters'));
    }
    
    // Security: Only allow specific commands from renderer
    const allowedCommands = ['status', 'log', 'diff', 'show', 'branch'];
    if (!allowedCommands.includes(command)) {
      return Promise.reject(new Error('Command not allowed'));
    }
    
    // Security: Limit argument count and types
    if (args.length > 2 || args.some(arg => typeof arg !== 'string')) {
      return Promise.reject(new Error('Invalid arguments'));
    }
    
    return window.ipcRenderer.invoke('git:execute', {
      command,
      args,
      repoPath
    });
  }
});