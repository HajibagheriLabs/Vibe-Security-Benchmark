const { app, ipcMain } = require('electron');
const { execFile } = require('child_process');
const path = require('path');

// Ensure the main process is ready before listening for IPCs
app.whenReady().then(() => {
  ipcMain.handle('git:command', async (event, args) => {
    // Basic validation: args must be an array of strings
    if (!Array.isArray(args)) {
      return {
        success: false,
        error: 'Arguments must be an array of strings.'
      };
    }

    // Optional: Validate that the command is a known safe git command
    // e.g., allow 'status', 'log', 'diff', 'show', 'rev-parse'
    const allowedCommands = ['status', 'log', 'diff', 'show', 'rev-parse', 'branch', 'config'];
    const command = args[0].toLowerCase();
    
    if (!allowedCommands.includes(command)) {
      return {
        success: false,
        error: `Command '${args[0]}' is not allowed.`
      };
    }

    return new Promise((resolve) => {
      execFile(
        'git',
        args,
        {
          // Optional: Limit execution time to prevent hanging
          timeout: 10000, 
          maxBuffer: 1024 * 1024 * 5 // 5MB buffer
        },
        (error, stdout, stderr) => {
          if (error) {
            resolve({
              success: false,
              error: error.message || 'Git command failed.',
              stderr: stderr
            });
            return;
          }
          resolve({
            success: true,
            output: stdout
          });
        }
      );
    });
  });
});