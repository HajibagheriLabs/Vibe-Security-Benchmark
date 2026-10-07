const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Keep track of child windows to prevent garbage collection
const childWindows = new Map();

/**
 * Creates a new child window with the specified options
 * @param {Object} options - Window creation options
 * @param {string} options.url - URL to load in the child window
 * @param {Object} options.windowOptions - Electron BrowserWindow options
 * @param {Object} options.parentInfo - Information about the parent window
 * @returns {number} The ID of the created window
 */
function createChildWindow(options) {
  const {
    url,
    windowOptions = {},
    parentInfo = {}
  } = options;

  // Merge default options with provided options
  const mergedOptions = {
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      ...windowOptions.webPreferences
    },
    ...windowOptions
  };

  // Create the child window
  const childWindow = new BrowserWindow(mergedOptions);

  // Store reference to prevent garbage collection
  childWindows.set(childWindow.id, childWindow);

  // Set up event handlers
  childWindow.once('ready-to-show', () => {
    childWindow.show();
  });

  childWindow.on('closed', () => {
    childWindows.delete(childWindow.id);
  });

  // Handle new window requests from this child window
  childWindow.webContents.setWindowOpenHandler(({ url: childUrl }) => {
    // Recursively create another child window
    createChildWindow({
      url: childUrl,
      windowOptions: mergedOptions,
      parentInfo: { parentId: childWindow.id }
    });
    return { action: 'deny' };
  });

  // Load the URL
  if (url) {
    childWindow.loadURL(url).catch((err) => {
      console.error(`Failed to load URL ${url}:`, err);
      childWindow.destroy();
    });
  }

  return childWindow.id;
}

/**
 * Sets up the main window with window.open handling
 * @param {BrowserWindow} mainWindow - The main application window
 */
function setupMainWindow(mainWindow) {
  // Handle window.open requests from the main window
  mainWindow.webContents.setWindowOpenHandler(({ url, features, disposition }) => {
    // Parse window features string (e.g., "width=400,height=300")
    const windowOptions = {};
    
    if (features) {
      const featureMap = features.split(',').reduce((acc, feature) => {
        const [key, value] = feature.trim().split('=');
        if (key && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});

      // Map common window features to Electron options
      if (featureMap.width) windowOptions.width = parseInt(featureMap.width, 10);
      if (featureMap.height) windowOptions.height = parseInt(featureMap.height, 10);
      if (featureMap.left) windowOptions.x = parseInt(featureMap.left, 10);
      if (featureMap.top) windowOptions.y = parseInt(featureMap.top, 10);
      if (featureMap.resizable) windowOptions.resizable = featureMap.resizable === 'yes';
      if (featureMap.scrollbars) windowOptions.scrollbars = featureMap.scrollbars === 'yes';
      if (featureMap.menubar) windowOptions.autoHideMenuBar = featureMap.menubar === 'no';
      if (featureMap.toolbar) windowOptions.toolbar = featureMap.toolbar === 'yes';
      if (featureMap.status) windowOptions.statusBar = featureMap.status === 'yes';
    }

    // Handle different disposition types
    if (disposition === 'foreground-tab' || disposition === 'background-tab') {
      // Open in new window since Electron doesn't support tabs natively
      createChildWindow({
        url,
        windowOptions,
        parentInfo: { parentId: mainWindow.id }
      });
      return { action: 'deny' };
    }

    if (disposition === 'new-window') {
      createChildWindow({
        url,
        windowOptions,
        parentInfo: { parentId: mainWindow.id }
      });
      return { action: 'deny' };
    }

    // Default: deny and handle manually
    createChildWindow({
      url,
      windowOptions,
      parentInfo: { parentId: mainWindow.id }
    });
    return { action: 'deny' };
  });
}

/**
 * Creates the main application window
 */
function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Set up window.open handling
  setupMainWindow(mainWindow);

  // Load the main application
  mainWindow.loadFile('index.html').catch((err) => {
    console.error('Failed to load main window:', err);
  });

  return mainWindow;
}

// IPC handler for programmatic child window creation
ipcMain.handle('create-child-window', (event, options) => {
  const parentWindow = BrowserWindow.fromWebContents(event.sender);
  
  if (!parentWindow) {
    throw new Error('Parent window not found');
  }

  return createChildWindow({
    ...options,
    parentInfo: { parentId: parentWindow.id }
  });
});

// IPC handler to close a specific child window
ipcMain.handle('close-child-window', (event, windowId) => {
  const childWindow = childWindows.get(windowId);
  
  if (childWindow && !childWindow.isDestroyed()) {
    childWindow.close();
    return true;
  }
  
  return false;
});

// IPC handler to get all child window IDs
ipcMain.handle('get-child-windows', () => {
  return Array.from(childWindows.keys());
});

// App lifecycle handlers
app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up on quit
app.on('before-quit', () => {
  childWindows.clear();
});