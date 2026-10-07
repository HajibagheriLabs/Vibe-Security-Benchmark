const { app, BrowserWindow, ipcMain } = require('electron');
const { execFile } = require('child_process');
const path = require('path');

// Security-relevant: Enforce sandbox and context isolation for all renderer processes
app.enableSandbox();

// Security-relevant: Define a strict allowlist of permitted git subcommands
const ALLOWED_SUBCOMMANDS = new Set([
  'status',
  'log',
  'diff',
  'branch',
  'remote',
  'config',
  'show',
  'ls-files',
  'rev-parse',
]);

// Security-relevant: Validate and sanitize repository path to prevent directory traversal
function validateRepoPath(userSuppliedPath) {
  if (typeof userSuppliedPath !== 'string' || userSuppliedPath.length === 0) {
    throw new Error('Repository path must be a non-empty string');
  }
  const resolved = path.resolve(userSuppliedPath);
  // Security-relevant: Confine to a known safe parent directory (e.g., user's home or app data)
  const allowedBase = path.join(app.getPath('home'), 'repositories');
  if (!resolved.startsWith(allowedBase + path.sep) && resolved !== allowedBase) {
    throw new Error('Repository path is outside the allowed directory');
  }
  return resolved;
}

// Security-relevant: Validate git arguments against a strict schema
function validateGitArgs(args) {
  if (!Array.isArray(args) || args.length === 0) {
    throw new Error('Git arguments must be a non-empty array');
  }
  const subcommand = args[0];
  if (!ALLOWED_SUBCOMMANDS.has(subcommand)) {
    throw new Error(`Git subcommand '${subcommand}' is not allowed`);
  }
  // Security-relevant: Allow only safe, non-mutating flags for each subcommand
  const allowedFlags = {
    status: ['--porcelain', '--short', '-s', '-b'],
    log: ['--oneline', '--graph', '--decorate', '--all', '-n', '--pretty=format:%H %s'],
    diff: ['--name-only', '--stat', '--cached'],
    branch: ['-a', '-r', '--list'],
    remote: ['-v', 'show'],
    config: ['--list', '--get', '--get-all'],
    show: ['--stat', '--name-only'],
    'ls-files': ['--cached', '--others', '--exclude-standard'],
    'rev-parse': ['--verify', '--short', 'HEAD'],
  };
  const permitted = allowedFlags[subcommand] || [];
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('-')) {
      if (!permitted.includes(arg)) {
        throw new Error(`Flag '${arg}' is not allowed for git ${subcommand}`);
      }
    } else {
      // Security-relevant: Disallow arbitrary positional arguments (e.g., refs, paths) to prevent injection
      throw new Error('Positional arguments are not allowed; only predefined flags permitted');
    }
  }
  return args;
}

// Security-relevant: IPC handler verifies sender origin, parses schema, authorizes, and confines paths
ipcMain.handle('git:execute', async (event, payload) => {
  // Security-relevant: Verify the sender frame origin to prevent unauthorized renderer access
  const senderFrame = event.senderFrame;
  if (!senderFrame || senderFrame.origin !== 'file://') {
    throw new Error('Unauthorized origin: only local file:// renderer permitted');
  }

  // Security-relevant: Parse and validate explicit schema
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payload: expected object with repoPath and args');
  }
  const { repoPath, args } = payload;
  if (typeof repoPath !== 'string' || !Array.isArray(args)) {
    throw new Error('Invalid payload schema: repoPath (string) and args (string[]) required');
  }

  // Security-relevant: Authorize against main-process state (e.g., check if repo is registered)
  // In a real app, you would check a main-process registry of allowed repositories here.
  // For this example, we rely on path confinement in validateRepoPath.

  // Security-relevant: Canonicalize and confine the repository path
  const safeRepoPath = validateRepoPath(repoPath);

  // Security-relevant: Validate git arguments against strict allowlist
  const safeArgs = validateGitArgs(args);

  // Security-relevant: Execute using execFile with constant binary and validated arguments, no shell
  const gitBinary = process.platform === 'win32' ? 'git.exe' : 'git';
  return new Promise((resolve, reject) => {
    const child = execFile(gitBinary, safeArgs, { cwd: safeRepoPath, timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        // Security-relevant: Return minimal error info, avoid leaking stack traces or paths
        reject(new Error(`Git command failed: ${error.code || 'unknown error'}`));
        return;
      }
      // Security-relevant: Limit output size to prevent memory exhaustion
      const maxOutput = 1024 * 1024; // 1 MB
      const truncatedStdout = stdout.length > maxOutput ? stdout.slice(0, maxOutput) + '\n[truncated]' : stdout;
      resolve({ stdout: truncatedStdout, stderr: stderr.slice(0, maxOutput) });
    });
  });
});

// Security-relevant: Standard secure window configuration
function createWindow() {
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
  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});