// main.js
const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// Enable sandbox at startup
app.enableSandbox();

// Security-relevant decision: Full process isolation with sandbox enabled
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

  // Security-relevant decision: Deny all permission requests by default
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(false);
  });

  mainWindow.webContents.session.setPermissionCheckHandler(() => false);

  // Security-relevant decision: Deny navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    event.preventDefault();
  });

  // Security-relevant decision: Deny new window creation
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Security-relevant decision: Strip preload and enforce safe prefs on webview attachment
  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
  });

  // Security-relevant decision: Set strict CSP from main process
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-src 'none'"
        ]
      }
    });
  });

  mainWindow.loadFile('index.html');
}

// Security-relevant decision: IPC handler with sender verification, schema validation, 
// authorization, and path confinement
ipcMain.handle('read-text-file', async (event, filePath) => {
  try {
    // 1. Verify sender frame origin
    const senderFrame = event.senderFrame;
    if (!senderFrame || senderFrame.url !== 'file://' + path.join(__dirname, 'index.html')) {
      throw new Error('Unauthorized sender');
    }

    // 2. Parse explicit schema (validate input)
    if (typeof filePath !== 'string' || filePath.length === 0 || filePath.length > 4096) {
      throw new Error('Invalid file path format');
    }

    // 3. Authorize against main-process state (no additional authorization needed for local file reads)
    
    // 4. Canonicalize and confine path
    const resolvedPath = path.resolve(filePath);
    
    // Security-relevant decision: Restrict file access to a specific directory
    const allowedBaseDir = path.resolve(app.getPath('userData'), 'documents');
    if (!resolvedPath.startsWith(allowedBaseDir + path.sep)) {
      throw new Error('Path outside allowed directory');
    }

    // 5. Read file with size limit
    const stats = await fs.stat(resolvedPath);
    if (!stats.isFile()) {
      throw new Error('Not a regular file');
    }
    
    // Security-relevant decision: Limit file size to prevent memory exhaustion
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error('File too large');
    }

    const content = await fs.readFile(resolvedPath, 'utf8');
    
    // Return plain serializable data only
    return { success: true, content };
    
  } catch (error) {
    // Log error internally but don't expose sensitive details to renderer
    console.error('File read error:', error.message);
    return { success: false, error: 'Unable to read file' };
  }
});

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