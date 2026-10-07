// main.js
const { app, ipcMain, BrowserWindow } = require('electron');
const { execFile } = require('child_process');
const path = require('path');

// Keep a global reference of the window object to avoid garbage collection
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * IPC handler for running git commands
 * Expects payload: { command: string, args: string[], cwd?: string }
 * Returns a Promise that resolves with { stdout, stderr } or rejects with an error
 */
ipcMain.handle('git:run', async (event, payload) => {
  const { command, args = [], cwd } = payload;

  // Validate input
  if (!command || typeof command !== 'string') {
    throw new Error('Invalid git command: command must be a non-empty string');
  }

  if (!Array.isArray(args) || args.some(arg => typeof arg !== 'string')) {
    throw new Error('Invalid git args: args must be an array of strings');
  }

  // Build the full git command with subcommand
  const gitArgs = [command, ...args];

  // Determine working directory
  const workingDir = cwd || app.getPath('userData');

  return new Promise((resolve, reject) => {
    execFile(
      'git',
      gitArgs,
      {
        cwd: workingDir,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout: 30000, // 30 second timeout
        windowsHide: true
      },
      (error, stdout, stderr) => {
        if (error) {
          reject({
            message: error.message,
            code: error.code,
            stderr: stderr || '',
            stdout: stdout || ''
          });
        } else {
          resolve({
            stdout: stdout || '',
            stderr: stderr || ''
          });
        }
      }
    );
  });
});

// Optional: Handler for checking git version
ipcMain.handle('git:version', async () => {
  return new Promise((resolve, reject) => {
    execFile('git', ['--version'], { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        reject({ message: error.message, stderr });
      } else {
        resolve(stdout.trim());
      }
    });
  });
});