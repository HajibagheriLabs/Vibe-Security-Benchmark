const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Keep track of child windows to prevent garbage collection
const childWindows = new Map();

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.loadFile('index.html');

  // Handle window.open requests from the renderer
  mainWindow.webContents.setWindowOpenHandler(({ url, frameName, features, disposition, referrer }) => {
    // Parse features string into an object
    const featureMap = parseFeatures(features);

    // Determine window dimensions from features or use defaults
    const width = parseInt(featureMap.width, 10) || 800;
    const height = parseInt(featureMap.height, 10) || 600;
    const left = featureMap.left !== undefined ? parseInt(featureMap.left, 10) : undefined;
    const top = featureMap.top !== undefined ? parseInt(featureMap.top, 10) : undefined;

    // Create the child window
    const childWindow = new BrowserWindow({
      width,
      height,
      x: left,
      y: top,
      parent: mainWindow,
      modal: false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        // Inherit session from parent
        session: mainWindow.webContents.session,
      },
    });

    // Track the child window
    const childId = childWindow.id;
    childWindows.set(childId, childWindow);

    // Show window when ready to avoid visual flash
    childWindow.once('ready-to-show', () => {
      childWindow.show();
    });

    // Clean up when closed
    childWindow.on('closed', () => {
      childWindows.delete(childId);
    });

    // Handle new window requests from the child window itself
    childWindow.webContents.setWindowOpenHandler((childDetails) => {
      // Recursively handle nested window.open calls
      return handleNestedWindowOpen(childWindow, childDetails);
    });

    // Allow the window to be created, but prevent Electron from
    // creating a default window - we've already created one
    return { action: 'deny' };
  });

  return mainWindow;
}

function handleNestedWindowOpen(parentWindow, { url, frameName, features }) {
  const featureMap = parseFeatures(features);
  const width = parseInt(featureMap.width, 10) || 800;
  const height = parseInt(featureMap.height, 10) || 600;

  const nestedWindow = new BrowserWindow({
    width,
    height,
    parent: parentWindow,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      session: parentWindow.webContents.session,
    },
  });

  const nestedId = nestedWindow.id;
  childWindows.set(nestedId, nestedWindow);

  nestedWindow.once('ready-to-show', () => {
    nestedWindow.show();
  });

  nestedWindow.on('closed', () => {
    childWindows.delete(nestedId);
  });

  // Load the URL in the nested window
  if (url && url !== 'about:blank') {
    nestedWindow.loadURL(url);
  }

  return { action: 'deny' };
}

function parseFeatures(features) {
  const result = {};
  if (!features) return result;

  const parts = features.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      // Boolean feature (e.g., "menubar", "resizable")
      result[trimmed.toLowerCase()] = true;
    } else {
      const key = trimmed.substring(0, separatorIndex).trim().toLowerCase();
      const value = trimmed.substring(separatorIndex + 1).trim();
      result[key] = value;
    }
  }

  return result;
}

// IPC handler to programmatically close a child window
ipcMain.handle('close-child-window', (event, windowId) => {
  const childWindow = childWindows.get(windowId);
  if (childWindow && !childWindow.isDestroyed()) {
    childWindow.close();
    return true;
  }
  return false;
});

// IPC handler to get all child window IDs
ipcMain.handle('get-child-window-ids', () => {
  return Array.from(childWindows.keys());
});

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
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