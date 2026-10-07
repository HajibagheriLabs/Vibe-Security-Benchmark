// main/index.js
'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { extractProtocolCommand, validateOpenUrl } = require('./protocol-handler');

// Security: enable sandbox at startup (§2).
app.enableSandbox();

// Security: single-instance lock to handle second-instance argv (§4 Desktop).
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  // Track pending navigation command for when window is ready.
  let pendingNavigation = null;

  // Handle second-instance argv (Windows/Linux) through the same resolver.
  app.on('second-instance', (event, argv) => {
    const command = extractProtocolCommand(argv);
    if (command) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('navigate', command);
      } else {
        pendingNavigation = command;
      }
    }
  });

  // Handle macOS 'open-url' event through the same resolver.
  app.on('open-url', (event, urlString) => {
    event.preventDefault();
    const command = validateOpenUrl(urlString);
    if (command) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('navigate', command);
      } else {
        pendingNavigation = command;
      }
    }
  });

  let mainWindow = null;

  function createWindow() {
    mainWindow = new BrowserWindow({
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

    // Security: deny all navigation to external URLs (§2).
    mainWindow.webContents.on('will-navigate', (event, url) => {
      const parsed = new URL(url);
      if (parsed.protocol !== 'file:') {
        event.preventDefault();
      }
    });

    // Security: deny window.open by default (§2).
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

    // Security: deny all permission requests (§2).
    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
      callback(false);
    });
    mainWindow.webContents.session.setPermissionCheckHandler(() => false);

    mainWindow.loadFile('index.html');

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    // Send any pending navigation once the window is ready.
    if (pendingNavigation) {
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('navigate', pendingNavigation);
        pendingNavigation = null;
      });
    }
  }

  app.whenReady().then(() => {
    // Extract protocol command from initial argv (first launch).
    const initialCommand = extractProtocolCommand(process.argv);
    if (initialCommand) {
      pendingNavigation = initialCommand;
    }

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
}