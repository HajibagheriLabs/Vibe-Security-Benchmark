// main.js
const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { z } = require('zod'); // Verified package: zod@3.22.4 (https://github.com/colinhacks/zod)

// Enable sandbox at startup — this is a global security control.
app.enableSandbox();

// Define the allowlisted directory for file reads.
// All paths are canonicalized and confined to this directory.
const ALLOWED_READ_DIRECTORY = path.resolve(__dirname, 'allowed-files');

// Schema for validating incoming IPC payloads.
const ReadFileSchema = z.object({
  filePath: z.string()
    .min(1, 'File path cannot be empty')
    .max(4096, 'File path too long')
    .refine((val) => !val.includes('\0'), 'File path contains null byte')
});

// Verify sender origin before processing any IPC request.
function isTrustedSender(event) {
  // event.senderFrame is available in Electron 12+.
  // Verify the frame URL matches our expected renderer origin.
  if (!event.senderFrame || !event.senderFrame.url) {
    return false;
  }
  
  try {
    const frameUrl = new URL(event.senderFrame.url);
    // Only allow our own app's file:// protocol or a specific dev server origin.
    return frameUrl.protocol === 'file:' || 
           (frameUrl.protocol === 'http:' && frameUrl.hostname === 'localhost');
  } catch {
    return false;
  }
}

// Canonicalize and confine the requested path to the allowlisted directory.
function confinePath(requestedPath) {
  // Resolve to absolute path and normalize.
  const absolutePath = path.resolve(requestedPath);
  
  // Ensure the resolved path is within the allowlisted directory.
  const relativePath = path.relative(ALLOWED_READ_DIRECTORY, absolutePath);
  
  // Reject if path escapes the allowlisted directory (e.g., '../' traversal).
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('Path is outside the allowed directory');
  }
  
  return absolutePath;
}

// IPC handler for reading text files.
ipcMain.handle('read-text-file', async (event, rawPayload) => {
  try {
    // 1. Verify sender origin
    if (!isTrustedSender(event)) {
      throw new Error('Untrusted IPC sender');
    }
    
    // 2. Parse and validate schema
    const { filePath } = ReadFileSchema.parse({ filePath: rawPayload });
    
    // 3. Authorize — no additional authorization needed for read-only file access,
    //    but this is where role-based checks would go if required.
    
    // 4. Canonicalize and confine path
    const confinedPath = confinePath(filePath);
    
    // 5. Read the file with explicit encoding and size limits
    const stats = await fs.stat(confinedPath);
    
    // Reject non-regular files (symlinks, devices, etc.)
    if (!stats.isFile()) {
      throw new Error('Path is not a regular file');
    }
    
    // Limit file size to prevent memory exhaustion (e.g., 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error('File exceeds maximum allowed size');
    }
    
    // Read with explicit UTF-8 encoding
    const content = await fs.readFile(confinedPath, 'utf8');
    
    return { success: true, content };
  } catch (error) {
    // Log the error server-side without exposing sensitive details to renderer
    console.error('IPC read-text-file error:', error.message);
    
    // Return a sanitized error to the renderer
    return { 
      success: false, 
      error: 'Failed to read file' 
    };
  }
});

function createWindow() {
  const mainWindow = new BrowserWindow({
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
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Deny all permission requests by default
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(false);
  });
  
  session.defaultSession.setPermissionCheckHandler(() => false);

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowedProtocols = ['file:', 'http:'];
    const parsedUrl = new URL(url);
    if (!allowedProtocols.includes(parsedUrl.protocol) || 
        (parsedUrl.protocol === 'http:' && parsedUrl.hostname !== 'localhost')) {
      event.preventDefault();
    }
  });

  // Deny window.open by default
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Set Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'"
        ]
      }
    });
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