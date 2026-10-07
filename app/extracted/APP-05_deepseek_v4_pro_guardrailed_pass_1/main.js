const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const { URL } = require('url');

// Security: Enable sandbox globally before any window creation
app.enableSandbox();

// Security: Disable Node.js integration in all renderers
app.on('web-contents-created', (event, contents) => {
  // Security: Deny all navigation to external URLs
  contents.on('will-navigate', (event, navigationUrl) => {
    event.preventDefault();
  });

  // Security: Deny all new window requests by default
  contents.setWindowOpenHandler(({ url }) => {
    return { action: 'deny' };
  });

  // Security: Strip preload and force safe preferences on any webview
  contents.on('will-attach-webview', (event, webPreferences, params) => {
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
  });

  // Security: Deny all permission requests
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(false);
  });
  session.defaultSession.setPermissionCheckHandler(() => false);
});

// Security: Set strict Content Security Policy
app.on('web-contents-created', (event, contents) => {
  contents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; object-src 'none'"
        ]
      }
    });
  });
});

// Security: Validate and sanitize child window URLs
function validateChildWindowUrl(url) {
  try {
    const parsedUrl = new URL(url);
    
    // Security: Only allow https protocol
    if (parsedUrl.protocol !== 'https:') {
      return null;
    }
    
    // Security: Only allow specific trusted origins
    const allowedOrigins = [
      'app.example.com',
      'localhost:3000' // Only for development, remove in production
    ];
    
    if (!allowedOrigins.includes(parsedUrl.host)) {
      return null;
    }
    
    // Security: Reject URLs with credentials
    if (parsedUrl.username || parsedUrl.password) {
      return null;
    }
    
    return parsedUrl.toString();
  } catch (error) {
    return null;
  }
}

// Security: Create child windows with strict isolation
function createChildWindow(parentWindow, url) {
  const sanitizedUrl = validateChildWindowUrl(url);
  
  if (!sanitizedUrl) {
    return null;
  }
  
  const childWindow = new BrowserWindow({
    width: 800,
    height: 600,
    parent: parentWindow,
    // Security: Full isolation flags
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
      preload: path.join(__dirname, 'preload-child.js')
    }
  });
  
  // Security: Prevent navigation away from approved URLs
  childWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!validateChildWindowUrl(navigationUrl)) {
      event.preventDefault();
    }
  });
  
  // Security: Deny new window requests from child windows
  childWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
  
  childWindow.loadURL(sanitizedUrl);
  
  return childWindow;
}

// Security: IPC handler for controlled child window creation
ipcMain.handle('create-child-window', (event, url) => {
  // Security: Verify sender origin
  const senderUrl = event.senderFrame.url;
  const senderOrigin = new URL(senderUrl).origin;
  
  // Security: Only allow requests from our main window
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    return { success: false, error: 'Unauthorized sender' };
  }
  
  // Security: Validate URL type and content
  if (typeof url !== 'string' || url.length > 2048) {
    return { success: false, error: 'Invalid URL' };
  }
  
  const childWindow = createChildWindow(mainWindow, url);
  
  if (!childWindow) {
    return { success: false, error: 'URL not allowed' };
  }
  
  return { success: true, windowId: childWindow.id };
});

// Security: Clean up child windows on close
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.whenReady().then(() => {
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
      preload: path.join(__dirname, 'preload-main.js')
    }
  });
  
  mainWindow.loadFile('index.html');
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

function createMainWindow() {
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
      preload: path.join(__dirname, 'preload-main.js')
    }
  });
  
  mainWindow.loadFile('index.html');
}