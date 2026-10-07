const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handler for running local git CLI commands
ipcMain.handle('git:run-command', async (event, args) => {
  try {
    if (!Array.isArray(args) || args.length === 0) {
      throw new Error('Git command arguments must be a non-empty array.');
    }

    // Basic sanitization to prevent command injection
    const sanitizedArgs = args.map(arg => {
      if (typeof arg !== 'string') {
        throw new Error(`Argument must be a string. Received: ${typeof arg}`);
      }
      // Allow alphanumeric, spaces, hyphens, underscores, dots, slashes, and @
      if (!/^[a-zA-Z0-9\s\-_./@]+$/.test(arg)) {
        throw new Error(`Invalid characters in argument: ${arg}`);
      }
      return arg;
    });

    const command = `git ${sanitizedArgs.join(' ')}`;

    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject({
            error: true,
            message: error.message,
            stderr: stderr
          });
          return;
        }
        resolve({
          error: false,
          stdout: stdout,
          stderr: stderr
        });
      });
    });
  } catch (err) {
    return {
      error: true,
      message: err.message
    };
  }
});