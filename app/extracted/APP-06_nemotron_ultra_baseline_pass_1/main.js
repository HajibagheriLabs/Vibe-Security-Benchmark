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
      nodeIntegration: false
    }
  });
  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

const ALLOWED_COMMANDS = new Set([
  'status', 'log', 'diff', 'branch', 'show', 'ls-files',
  'rev-parse', 'describe', 'tag', 'config', 'remote'
]);

function sanitizeArgs(args) {
  if (!Array.isArray(args)) return [];
  return args
    .filter(arg => typeof arg === 'string')
    .map(arg => arg.trim())
    .filter(arg => arg.length > 0 && !arg.includes('\0'));
}

ipcMain.handle('git:run', async (event, command, args = []) => {
  if (typeof command !== 'string' || !ALLOWED_COMMANDS.has(command)) {
    throw new Error(`Command not allowed: ${command}`);
  }

  const sanitizedArgs = sanitizeArgs(args);
  const fullCommand = ['git', command, ...sanitizedArgs].join(' ');

  return new Promise((resolve, reject) => {
    const child = spawn('git', [command, ...sanitizedArgs], {
      cwd: app.getPath('userData'),
      windowsHide: true,
      timeout: 30000
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn git: ${err.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`git ${command} exited with code ${code}: ${stderr || stdout}`));
      }
    });
  });
});