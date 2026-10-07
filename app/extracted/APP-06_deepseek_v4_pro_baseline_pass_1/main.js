// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const { execFile } = require('child_process');
const path = require('path');

// Keep a global reference of the window object to avoid garbage collection
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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
 * IPC handler for running local git CLI commands.
 * 
 * Expected payload from renderer:
 * {
 *   args: string[],        // git arguments (e.g., ['status', '--short'])
 *   cwd?: string,          // optional working directory (defaults to app root)
 *   timeout?: number       // optional timeout in milliseconds (defaults to 30000)
 * }
 * 
 * Returns a Promise that resolves with:
 * {
 *   stdout: string,
 *   stderr: string,
 *   exitCode: number
 * }
 */
ipcMain.handle('git:run', async (event, payload) => {
  // Validate payload
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payload: expected an object with "args" array');
  }

  const { args, cwd, timeout } = payload;

  if (!Array.isArray(args) || args.length === 0) {
    throw new Error('Invalid payload: "args" must be a non-empty array of strings');
  }

  // Ensure all args are strings
  for (const arg of args) {
    if (typeof arg !== 'string') {
      throw new Error('Invalid payload: all "args" entries must be strings');
    }
  }

  // Determine working directory
  const workingDir = cwd && typeof cwd === 'string' ? cwd : app.getAppPath();

  // Set timeout (default 30 seconds, max 5 minutes)
  const execTimeout = typeof timeout === 'number' && timeout > 0 
    ? Math.min(timeout, 300000) 
    : 30000;

  return new Promise((resolve, reject) => {
    execFile(
      'git',
      args,
      {
        cwd: workingDir,
        timeout: execTimeout,
        maxBuffer: 10 * 1024 * 1024, // 10 MB buffer for stdout/stderr
        encoding: 'utf8',
        windowsHide: true, // Hide console window on Windows
        shell: false       // Do not use shell; prevents command injection
      },
      (error, stdout, stderr) => {
        if (error) {
          // Git command failed (non-zero exit or spawn error)
          // Resolve with error details rather than rejecting, so renderer can inspect
          resolve({
            stdout: stdout || '',
            stderr: stderr || error.message || '',
            exitCode: error.code === 'ENOENT' ? 127 : (error.code || 1),
            error: {
              message: error.message,
              code: error.code || null,
              killed: error.killed || false,
              signal: error.signal || null
            }
          });
          return;
        }

        // Success
        resolve({
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: 0,
          error: null
        });
      }
    );
  });
});

/**
 * Optional: Handler for checking if git is available on the system
 */
ipcMain.handle('git:isAvailable', async () => {
  return new Promise((resolve) => {
    execFile('git', ['--version'], { timeout: 5000 }, (error, stdout) => {
      if (error) {
        resolve({ available: false, version: null });
      } else {
        resolve({ available: true, version: stdout.trim() });
      }
    });
  });
});