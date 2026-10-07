const { app, BrowserWindow, ipcMain } = require('electron');
const { execFile } = require('child_process');
const path = require('path');

// Security: enable sandbox before any window creation
app.enableSandbox();

// Allowlist of supported git subcommands with strict argument schemas
const GIT_COMMANDS = {
  status: { args: [], maxArgs: 0 },
  log: { args: ['--oneline', '-n'], maxArgs: 1, argType: 'number' },
  diff: { args: [], maxArgs: 0 },
  branch: { args: ['--list'], maxArgs: 0 },
};

// Resolve git binary path at startup (no PATH traversal)
let GIT_BINARY = '';
function resolveGitBinary() {
  const candidates = [
    process.platform === 'win32' ? 'git.exe' : 'git',
    '/usr/bin/git',
    '/usr/local/bin/git',
    '/opt/homebrew/bin/git',
  ];
  for (const candidate of candidates) {
    try {
      require('fs').accessSync(candidate, require('constants').X_OK);
      return candidate;
    } catch {
      // continue
    }
  }
  throw new Error('Git binary not found in allowed locations');
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      experimentalFeatures: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  await win.loadFile('index.html');
  return win;
}

// Single-purpose IPC handler: runs allowlisted git commands only
ipcMain.handle('git:run', async (event, { command, arg }) => {
  // 1. Verify sender frame origin (must be our own preload)
  if (!event.senderFrame || event.senderFrame.origin !== 'file://') {
    throw new Error('Unauthorized sender');
  }

  // 2. Parse and validate explicit schema
  if (!command || typeof command !== 'string') {
    throw new Error('Invalid command: must be a string');
  }

  const cmdDef = GIT_COMMANDS[command];
  if (!cmdDef) {
    throw new Error(`Command not allowed: ${command}`);
  }

  // 3. Validate argument against schema
  let validatedArg = undefined;
  if (cmdDef.maxArgs > 0) {
    if (arg === undefined || arg === null) {
      throw new Error(`Missing required argument for ${command}`);
    }
    if (cmdDef.argType === 'number') {
      const num = Number(arg);
      if (!Number.isInteger(num) || num < 1 || num > 100) {
        throw new Error('Argument must be an integer between 1 and 100');
      }
      validatedArg = String(num);
    } else {
      throw new Error('Unsupported argument type');
    }
  } else if (arg !== undefined && arg !== null) {
    throw new Error(`Command ${command} does not accept arguments`);
  }

  // 4. Build final argument array (canonicalized, no user-controlled flags)
  const finalArgs = [...cmdDef.args];
  if (validatedArg !== undefined) {
    finalArgs.push(validatedArg);
  }

  // 5. Execute with execFile (no shell, no string interpolation)
  return new Promise((resolve, reject) => {
    const child = execFile(GIT_BINARY, finalArgs, {
      cwd: process.cwd(),
      timeout: 5000,
      maxBuffer: 1024 * 1024, // 1MB
      windowsHide: true,
    }, (error, stdout, stderr) => {
      if (error) {
        // Return structured error, never raw stderr
        reject(new Error(`Git command failed: ${error.message}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
});

app.whenReady().then(async () => {
  try {
    GIT_BINARY = resolveGitBinary();
    await createWindow();
  } catch (err) {
    console.error('Failed to start:', err.message);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Security-relevant decisions:
// - execFile with constant binary path, no shell, allowlisted subcommands only
// - Arguments validated against typed schema (number range 1-100)
// - Sender frame origin verified (file:// only)
// - Sandbox + contextIsolation + nodeIntegration:false enforced
// - No generic invoke, no renderer-controlled flags or paths