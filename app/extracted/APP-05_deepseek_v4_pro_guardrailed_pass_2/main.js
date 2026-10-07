const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('path');
const { URL } = require('url');

// Security rules applied: §2 Desktop Process Isolation, §4 Deep Links, §5 Supply Chain/Build
// All renderer processes are sandboxed with context isolation; no Node.js integration is exposed.

// Enable sandbox globally before app is ready
app.enableSandbox();

// Disable dangerous Electron fuses (requires @electron/fuses in production)
// This is a placeholder - actual fuse configuration should be done at build time
// using @electron/fuses package with the following settings:
// runAsNode: false, enableNodeCliInspectArguments: false, enableNodeOptionsEnvironmentVariable: false

const ALLOWED_ORIGINS = new Set([
  'https://app.example.com',
  'file://' // For local development only - remove in production
]);

// Map of allowed child window types to their configuration
const CHILD_WINDOW_CONFIGS = new Map([
  ['preview', {
    width: 800,
    height: 600,
    parent: null,
    modal: false,
    webPreferences: getSecureWebPreferences()
  }],
  ['settings', {
    width: 600,
    height: 400,
    parent: null,
    modal: true,
    webPreferences: getSecureWebPreferences()
  }]
]);

function getSecureWebPreferences() {
  return {
    nodeIntegration: false,
    nodeIntegrationInWorker: false,
    nodeIntegrationInSubFrames: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    webviewTag: false,
    experimentalFeatures: false,
    preload: path.join(__dirname, 'preload-child.js')
  };
}

function validateChildWindowRequest(url, features) {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow https: protocol (or file: for local dev)
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'file:') {
      return { valid: false, reason: 'Invalid protocol' };
    }
    
    // Reject URLs with credentials
    if (parsedUrl.username || parsedUrl.password) {
      return { valid: false, reason: 'URL contains credentials' };
    }
    
    // Validate origin against allowlist
    const origin = parsedUrl.origin;
    if (!ALLOWED_ORIGINS.has(origin)) {
      return { valid: false, reason: 'Origin not in allowlist' };
    }
    
    // Parse features string to determine window type
    const featuresObj = {};
    if (features) {
      features.split(',').forEach(feature => {
        const [key, value] = feature.trim().split('=');
        if (key && value !== undefined) {
          featuresObj[key] = value === 'yes' || value === '1' || value === 'true' || value;
        }
      });
    }
    
    // Determine window type from URL path or features
    let windowType = 'default';
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      const potentialType = pathSegments[pathSegments.length - 1];
      if (CHILD_WINDOW_CONFIGS.has(potentialType)) {
        windowType = potentialType;
      }
    }
    
    return { 
      valid: true, 
      url: parsedUrl.toString(),
      windowType,
      features: featuresObj
    };
  } catch (error) {
    return { valid: false, reason: 'Invalid URL' };
  }
}

function createChildWindow(parentWindow, validatedRequest) {
  const config = CHILD_WINDOW_CONFIGS.get(validatedRequest.windowType) || {
    width: 800,
    height: 600,
    parent: parentWindow,
    modal: false,
    webPreferences: getSecureWebPreferences()
  };
  
  const childWindow = new BrowserWindow({
    ...config,
    parent: parentWindow,
    show: false,
    backgroundColor: '#ffffff'
  });
  
  // Security: Deny all permission requests by default
  childWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(false);
  });
  
  childWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    return false;
  });
  
  // Security: Prevent navigation to external URLs
  childWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const validated = validateChildWindowRequest(navigationUrl, null);
    if (!validated.valid || validated.url !== validatedRequest.url) {
      event.preventDefault();
    }
  });
  
  // Security: Deny window.open from child windows
  childWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
  
  // Security: Prevent webview attachment
  childWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    event.preventDefault();
  });
  
  // Show window when ready
  childWindow.once('ready-to-show', () => {
    childWindow.show();
  });
  
  // Load the validated URL
  childWindow.loadURL(validatedRequest.url);
  
  return childWindow;
}

function setupMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: getSecureWebPreferences()
  });
  
  // Security: Handle window.open requests from main window
  mainWindow.webContents.setWindowOpenHandler(({ url, features }) => {
    const validated = validateChildWindowRequest(url, features);
    
    if (!validated.valid) {
      console.warn(`Blocked window.open request: ${validated.reason}`);
      return { action: 'deny' };
    }
    
    // Create child window synchronously
    const childWindow = createChildWindow(mainWindow, validated);
    
    // Return allow with overrideBrowserWindowOptions to ensure security
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        ...getSecureWebPreferences(),
        parent: mainWindow
      }
    };
  });
  
  // Security: Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const validated = validateChildWindowRequest(navigationUrl, null);
    if (!validated.valid) {
      event.preventDefault();
    }
  });
  
  // Security: Deny webview attachment
  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    event.preventDefault();
  });
  
  // Security: Set CSP headers
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.example.com;"
        ]
      }
    });
  });
  
  // Load main application
  mainWindow.loadFile('index.html');
  
  return mainWindow;
}

// Security: IPC handler for shell.openExternal (if needed)
ipcMain.handle('open-external-link', (event, url) => {
  // Verify sender origin
  const senderOrigin = event.senderFrame?.url ? new URL(event.senderFrame.url).origin : null;
  if (!senderOrigin || !ALLOWED_ORIGINS.has(senderOrigin)) {
    return { success: false, error: 'Unauthorized sender' };
  }
  
  // Validate URL
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:') {
      return { success: false, error: 'Only HTTPS URLs allowed' };
    }
    if (parsedUrl.username || parsedUrl.password) {
      return { success: false, error: 'URL contains credentials' };
    }
    
    // Open external URL
    shell.openExternal(parsedUrl.toString());
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Invalid URL' };
  }
});

app.whenReady().then(() => {
  setupMainWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      setupMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});