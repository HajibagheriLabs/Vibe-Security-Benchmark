const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('git:run', async (event, args, options = {}) => {
  if (!Array.isArray(args) || args.length === 0) {
    throw new Error('git:run requires a non-empty array of arguments');
  }

  const allowedArgs = args.filter(arg => typeof arg === 'string');
  if (allowedArgs.length !== args.length) {
    throw new Error('All git arguments must be strings');
  }

  const cwd = options.cwd && typeof options.cwd === 'string' ? options.cwd : process.cwd();
  const env = { ...process.env, ...(options.env && typeof options.env === 'object' ? options.env : {}) };
  const timeout = options.timeout && typeof options.timeout === 'number' ? options.timeout : 30000;

  return new Promise((resolve, reject) => {
    const child = spawn('git', allowedArgs, {
      cwd,
      env,
      windowsHide: true,
      shell: false,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`git command timed out after ${timeout}ms`));
    }, timeout);

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to spawn git: ${err.message}`));
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`git exited with code ${code}: ${stderr || stdout}`));
      }
    });
  });
});