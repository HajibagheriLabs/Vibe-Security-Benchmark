// main.js

const { ipcMain, BrowserWindow, app } = require('electron');
const { execFile } = require('child_process');
const path = require('path');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// Flag: Security-relevant decision — strict schema validation and path confinement for git commands.
// Flag: Security-relevant decision — no shell, no eval, no direct fs exposure.

// Helper to verify the sender frame origin (basic example, assumes 'app://host')
const isTrustedOrigin = (origin) => {
  return origin === 'app://host' || origin === 'http://localhost:3000'; // Allow localhost for dev
};

// Helper to validate the schema of the incoming message
const validateGitCommand = (args) => {
  // Expected structure: { command: string, args: string[] }
  if (!args || typeof args !== 'object') return false;
  if (typeof args.command !== 'string') return false;
  if (!Array.isArray(args.args)) return false;

  // Allowlist of safe git commands
  const allowedCommands = ['git', 'git-lfs'];
  if (!allowedCommands.includes(args.command)) return false;

  // Validate args: only strings, no shell metacharacters
  for (const arg of args.args) {
    if (typeof arg !== 'string') return false;
    if (/[;|&$`\\]/.test(arg)) return false;
  }

  return true;
};

// Helper to authorize against main-process state (e.g., is the window authenticated?)
const isAuthorized = (win) => {
  // Placeholder: In a real app, check win.webContents.session or a custom auth state
  return true;
};

// Helper to canonicalize and confine any path
const confinePath = (basePath) => {
  // Example: ensure the path is within a specific repo directory
  const repoDir = '/path/to/repo';
  const fullPath = path.resolve(repoDir, basePath);
  if (!fullPath.startsWith(repoDir)) {
    throw new Error('Path traversal detected');
  }
  return fullPath;
};

ipcMain.handle('run-git-command', async (event, { command, args, basePath = '.' }) => {
  // 1. Verify sender frame origin
  const senderOrigin = event.senderFrame?.getURL();
  if (!isTrustedOrigin(senderOrigin)) {
    throw new Error('Untrusted origin');
  }

  // 2. Parse an explicit schema
  if (!validateGitCommand({ command, args })) {
    throw new Error('Invalid git command schema');
  }

  // 3. Authorize against main-process state
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || !isAuthorized(win)) {
    throw new Error('Unauthorized window');
  }

  // 4. Canonicalize and confine any path
  const repoPath = confinePath(basePath);

  // 5. execFile(constBin, [args])
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { cwd: repoPath, timeout: 5000 });
    return { success: true, stdout, stderr };
  } catch (error) {
    return { success: false, error: error.message, stderr: error.stderr };
  }
});