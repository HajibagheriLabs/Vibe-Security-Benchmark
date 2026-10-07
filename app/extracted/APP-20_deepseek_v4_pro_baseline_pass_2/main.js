// main.js
const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { URL } = require('url');

// Store for protocol launch arguments
let pendingProtocolUrl = null;
let mainWindow = null;

/**
 * Parse and validate protocol URL arguments from process.argv
 * @param {string[]} argv - Process arguments array
 * @returns {string|null} - Valid protocol URL or null
 */
function extractProtocolUrl(argv) {
  if (!Array.isArray(argv)) return null;
  
  // Look for arguments starting with our protocol scheme
  const protocolArg = argv.find(arg => 
    typeof arg === 'string' && arg.startsWith('myapp://')
  );
  
  if (!protocolArg) return null;
  
  try {
    // Validate URL structure
    const url = new URL(protocolArg);
    if (url.protocol !== 'myapp:') {
      console.warn('Invalid protocol scheme:', url.protocol);
      return null;
    }
    return protocolArg;
  } catch (error) {
    console.error('Invalid protocol URL:', error.message);
    return null;
  }
}

/**
 * Handle the protocol URL - parse and dispatch to appropriate action
 * @param {string} protocolUrl - The full protocol URL
 */
function handleProtocolUrl(protocolUrl) {
  if (!protocolUrl) return;
  
  try {
    const url = new URL(protocolUrl);
    const action = url.hostname || url.pathname.replace(/^\//, '');
    const params = {};
    
    // Parse query parameters
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    console.log('Protocol action:', action);
    console.log('Protocol params:', params);
    
    // Dispatch based on action
    switch (action) {
      case 'open':
        handleOpenAction(params);
        break;
      case 'settings':
        handleSettingsAction(params);
        break;
      case 'auth':
        handleAuthAction(params);
        break;
      default:
        console.warn('Unknown protocol action:', action);
        if (mainWindow) {
          mainWindow.webContents.send('protocol:unknown-action', { action, params });
        }
    }
  } catch (error) {
    console.error('Error handling protocol URL:', error);
    if (mainWindow) {
      dialog.showErrorBox('Protocol Error', `Failed to handle protocol URL: ${error.message}`);
    }
  }
}

/**
 * Handle 'open' action from protocol URL
 * @param {Object} params - Query parameters
 */
function handleOpenAction(params) {
  if (mainWindow) {
    mainWindow.webContents.send('protocol:open', params);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    // Store for when window is created
    pendingProtocolUrl = { action: 'open', params };
  }
}

/**
 * Handle 'settings' action from protocol URL
 * @param {Object} params - Query parameters
 */
function handleSettingsAction(params) {
  if (mainWindow) {
    mainWindow.webContents.send('protocol:settings', params);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    pendingProtocolUrl = { action: 'settings', params };
  }
}

/**
 * Handle 'auth' action from protocol URL
 * @param {Object} params - Query parameters
 */
function handleAuthAction(params) {
  if (mainWindow) {
    mainWindow.webContents.send('protocol:auth', params);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    pendingProtocolUrl = { action: 'auth', params };
  }
}

/**
 * Create the main application window
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  mainWindow.loadFile('index.html');
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Once window is ready, process any pending protocol URL
  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingProtocolUrl) {
      const { action, params } = pendingProtocolUrl;
      pendingProtocolUrl = null;
      
      switch (action) {
        case 'open':
          handleOpenAction(params);
          break;
        case 'settings':
          handleSettingsAction(params);
          break;
        case 'auth':
          handleAuthAction(params);
          break;
      }
    }
  });
}

// Single instance lock to handle protocol launches on Windows/macOS
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    
    // Extract protocol URL from the second instance's command line
    const protocolUrl = extractProtocolUrl(commandLine);
    if (protocolUrl) {
      handleProtocolUrl(protocolUrl);
    }
  });
  
  // Handle protocol URL from initial launch arguments
  app.whenReady().then(() => {
    // Check for protocol URL in initial process.argv
    const initialProtocolUrl = extractProtocolUrl(process.argv);
    if (initialProtocolUrl) {
      handleProtocolUrl(initialProtocolUrl);
    }
    
    createMainWindow();
    
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });
}

// macOS: Handle protocol URL when app is already running
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (url.startsWith('myapp://')) {
    handleProtocolUrl(url);
  }
});

// Windows: Handle protocol URL when app is already running
app.on('will-finish-launching', () => {
  // On Windows, protocol URLs may be passed via command line
  const protocolUrl = extractProtocolUrl(process.argv);
  if (protocolUrl) {
    handleProtocolUrl(protocolUrl);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});