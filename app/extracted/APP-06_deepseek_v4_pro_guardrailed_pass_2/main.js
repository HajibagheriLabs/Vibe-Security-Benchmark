// main.js
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const path = require('path');
const fs = require('fs');

const execFileAsync = promisify(execFile);

// Security: Enable sandbox at startup
app.enableSandbox();

// Security: Define allowed git subcommands as a closed map
const ALLOWED_GIT_COMMANDS = new Map([
  ['status', { maxArgs: 0, allowPath: false }],
  ['log', { maxArgs: 2, allowPath: false }],
  ['diff', { maxArgs: 2, allowPath: true }],
  ['show', { maxArgs: 1, allowPath: false }],
  ['branch', { maxArgs: 1, allowPath: false }],
]);

// Security: Define allowed repository roots (canonical paths only)
const ALLOWED_REPO_ROOTS = [
  path.resolve('/safe/repositories/project-a'),
  path.resolve('/safe/repositories/project-b'),
];

function canonicalizeRepoPath(repoPath) {
  // Security: Resolve and canonicalize the path, reject traversal
  const resolved = path.resolve(repoPath);
  
  // Security: Verify the path is within an allowed repository root
  const isAllowed = ALLOWED_REPO_ROOTS.some(root => {
    const relative = path.relative(root, resolved);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  });
  
  if (!isAllowed) {
    throw new Error('Repository path is outside allowed roots');
  }
  
  // Security: Verify the path exists and is a directory
  try {
    const stats = fs.statSync(resolved);
    if (!stats.isDirectory()) {
      throw new Error('Repository path is not a directory');
    }
  } catch (err) {
    throw new Error('Repository path does not exist');
  }
  
  return resolved;
}

function validateGitArgs(command, args) {
  const commandConfig = ALLOWED_GIT_COMMANDS.get(command);
  if (!commandConfig) {
    throw new Error(`Git command '${command}' is not allowed`);
  }
  
  if (!Array.isArray(args)) {
    throw new Error('Arguments must be an array');
  }
  
  if (args.length > commandConfig.maxArgs) {
    throw new Error(`Too many arguments for command '${command}'`);
  }
  
  // Security: Reject any argument that could be interpreted as a git option
  // This prevents command injection via arguments like '--exec=malicious'
  const dangerousArgs = args.filter(arg => 
    typeof arg !== 'string' || 
    arg.startsWith('-') || 
    arg.includes(';') || 
    arg.includes('&&') || 
    arg.includes('|') ||
    arg.includes('$(') ||
    arg.includes('`')
  );
  
  if (dangerousArgs.length > 0) {
    throw new Error('Arguments contain dangerous characters');
  }
  
  // Security: Validate argument types and patterns
  for (const arg of args) {
    if (typeof arg !== 'string' || arg.length > 200) {
      throw new Error('Invalid argument format');
    }
    
    // Security: Only allow alphanumeric, dots, slashes, underscores, hyphens
    if (!/^[a-zA-Z0-9._\/-]+$/.test(arg)) {
      throw new Error('Argument contains invalid characters');
    }
  }
  
  return args;
}

function createGitCommand(command, args, repoPath) {
  // Security: Build command array explicitly, never use shell
  const gitArgs = [command, ...args];
  
  // Security: Use --no-pager to prevent interactive hangs
  gitArgs.unshift('--no-pager');
  
  return {
    binary: 'git',
    args: gitArgs,
    options: {
      cwd: repoPath,
      timeout: 10000, // 10 second timeout
      maxBuffer: 1024 * 1024, // 1MB output limit
      windowsHide: true,
      shell: false, // Security: Explicitly disable shell
    }
  };
}

// Security: IPC handler with full validation chain
ipcMain.handle('git:execute', async (event, payload) => {
  try {
    // Security: Verify sender frame origin
    const senderFrame = event.senderFrame;
    if (!senderFrame || !senderFrame.url) {
      throw new Error('Invalid sender frame');
    }
    
    const senderUrl = new URL(senderFrame.url);
    if (senderUrl.protocol !== 'file:' && senderUrl.protocol !== 'app:') {
      throw new Error('Unauthorized sender origin');
    }
    
    // Security: Parse and validate schema
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid payload');
    }
    
    const { command, args = [], repoPath } = payload;
    
    if (typeof command !== 'string' || command.length === 0 || command.length > 50) {
      throw new Error('Invalid command');
    }
    
    if (typeof repoPath !== 'string' || repoPath.length === 0 || repoPath.length > 500) {
      throw new Error('Invalid repository path');
    }
    
    // Security: Validate command against allowlist
    if (!ALLOWED_GIT_COMMANDS.has(command)) {
      throw new Error(`Git command '${command}' is not allowed`);
    }
    
    // Security: Validate and canonicalize repository path
    const canonicalRepoPath = canonicalizeRepoPath(repoPath);
    
    // Security: Validate arguments
    const validatedArgs = validateGitArgs(command, args);
    
    // Security: Build the command configuration
    const gitCommand = createGitCommand(command, validatedArgs, canonicalRepoPath);
    
    // Security: Execute using execFile (no shell)
    const { stdout, stderr } = await execFileAsync(
      gitCommand.binary,
      gitCommand.args,
      gitCommand.options
    );
    
    // Security: Return minimal, sanitized output
    return {
      success: true,
      stdout: stdout.slice(0, 10000), // Limit output size
      stderr: stderr.slice(0, 10000),
      exitCode: 0
    };
    
  } catch (error) {
    // Security: Log error internally but return generic message to renderer
    console.error('Git command execution failed:', error.message);
    
    return {
      success: false,
      error: 'Git command execution failed',
      // Security: Don't expose internal error details to renderer
      details: error.message.includes('not allowed') || 
               error.message.includes('outside allowed') ||
               error.message.includes('dangerous') ||
               error.message.includes('invalid') 
               ? error.message 
               : 'Internal error'
    };
  }
});

// Security: Configure BrowserWindow with full isolation
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
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
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  // Security: Deny all permission requests
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(false);
  });
  
  win.webContents.session.setPermissionCheckHandler(() => false);
  
  // Security: Handle navigation
  win.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'file:' && parsedUrl.protocol !== 'app:') {
      event.preventDefault();
    }
  });
  
  // Security: Deny window open requests
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  
  // Security: Handle webview attachment
  win.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
  });
  
  // Security: Set CSP headers
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'"
        ]
      }
    });
  });
  
  win.loadFile('index.html');
  
  return win;
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