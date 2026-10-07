const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const path = require('path');
const fs = require('fs');

// Security: Enable sandbox globally
app.enableSandbox();

// Security: Define allowed git commands and their argument schemas
const ALLOWED_GIT_COMMANDS = new Map([
  ['status', {
    maxArgs: 2,
    allowedArgs: ['--short', '--branch', '--porcelain'],
    validate: (args) => args.every(arg => 
      arg === '--short' || arg === '--branch' || arg === '--porcelain'
    )
  }],
  ['log', {
    maxArgs: 4,
    allowedArgs: ['--oneline', '--graph', '--decorate', '-n'],
    validate: (args) => {
      // Validate -n flag has a numeric argument
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-n') {
          if (i + 1 >= args.length || !/^\d+$/.test(args[i + 1])) {
            return false;
          }
          i++; // Skip the number
        } else if (!['--oneline', '--graph', '--decorate'].includes(args[i])) {
          return false;
        }
      }
      return true;
    }
  }],
  ['branch', {
    maxArgs: 2,
    allowedArgs: ['--list', '--show-current', '-a', '--all'],
    validate: (args) => args.every(arg => 
      ['--list', '--show-current', '-a', '--all'].includes(arg)
    )
  }],
  ['diff', {
    maxArgs: 3,
    allowedArgs: ['--stat', '--cached', 'HEAD', '--name-only'],
    validate: (args) => args.every(arg => 
      ['--stat', '--cached', 'HEAD', '--name-only'].includes(arg)
    )
  }]
]);

// Security: Validate repository path is within allowed workspace
function validateRepositoryPath(repoPath) {
  if (typeof repoPath !== 'string' || repoPath.length === 0) {
    throw new Error('Repository path must be a non-empty string');
  }
  
  // Security: Resolve and canonicalize the path
  const resolvedPath = path.resolve(repoPath);
  
  // Security: Define allowed workspace root (configurable via environment)
  const workspaceRoot = path.resolve(
    process.env.GIT_WORKSPACE_ROOT || path.join(app.getPath('home'), 'workspace')
  );
  
  // Security: Ensure the path is within the workspace root
  const relativePath = path.relative(workspaceRoot, resolvedPath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('Repository path must be within the allowed workspace');
  }
  
  // Security: Verify the directory exists and is a git repository
  if (!fs.existsSync(resolvedPath)) {
    throw new Error('Repository path does not exist');
  }
  
  const gitDir = path.join(resolvedPath, '.git');
  if (!fs.existsSync(gitDir)) {
    throw new Error('Specified path is not a git repository');
  }
  
  return resolvedPath;
}

// Security: Validate and sanitize git command arguments
function validateGitCommand(command, args) {
  const commandConfig = ALLOWED_GIT_COMMANDS.get(command);
  if (!commandConfig) {
    throw new Error(`Git command '${command}' is not allowed`);
  }
  
  if (!Array.isArray(args)) {
    throw new Error('Arguments must be an array');
  }
  
  if (args.length > commandConfig.maxArgs) {
    throw new Error(`Too many arguments for git ${command}`);
  }
  
  if (!commandConfig.validate(args)) {
    throw new Error(`Invalid arguments for git ${command}`);
  }
  
  return args;
}

// Security: IPC handler for git operations
ipcMain.handle('git:execute', async (event, payload) => {
  try {
    // Security: Verify sender frame origin
    const senderOrigin = event.senderFrame?.url;
    if (!senderOrigin || !senderOrigin.startsWith('file://')) {
      throw new Error('Invalid sender origin');
    }
    
    // Security: Parse and validate the payload schema
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid payload');
    }
    
    const { command, args = [], repoPath } = payload;
    
    if (typeof command !== 'string') {
      throw new Error('Command must be a string');
    }
    
    // Security: Validate repository path
    const validatedRepoPath = validateRepositoryPath(repoPath);
    
    // Security: Validate git command and arguments
    const validatedArgs = validateGitCommand(command, args);
    
    // Security: Execute git with validated arguments using execFile (no shell)
    const gitBinary = process.env.GIT_BINARY || 'git';
    const result = await execFileAsync(gitBinary, [command, ...validatedArgs], {
      cwd: validatedRepoPath,
      timeout: 10000, // 10 second timeout
      maxBuffer: 1024 * 1024, // 1MB output limit
      encoding: 'utf8'
    });
    
    return {
      success: true,
      stdout: result.stdout,
      stderr: result.stderr
    };
    
  } catch (error) {
    // Security: Return sanitized error messages
    return {
      success: false,
      error: error.message || 'Git command failed'
    };
  }
});

// Security: Create browser window with full isolation
function createWindow() {
  const mainWindow = new BrowserWindow({
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
  
  // Security: Deny navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'file:') {
      event.preventDefault();
    }
  });
  
  // Security: Deny window open requests
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  
  // Security: Deny permission requests
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(false);
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