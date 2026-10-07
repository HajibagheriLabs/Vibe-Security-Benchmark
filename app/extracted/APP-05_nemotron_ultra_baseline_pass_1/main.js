const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

let mainWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createChildWindow(parentWindow, options) {
  const child = new BrowserWindow({
    width: options.width || 800,
    height: options.height || 600,
    x: options.left,
    y: options.top,
    show: false,
    parent: parentWindow,
    modal: options.modal || false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: options.partition || 'persist:child',
    },
  });

  child.once('ready-to-show', () => {
    child.show();
  });

  child.on('closed', () => {
    if (parentWindow && !parentWindow.isDestroyed()) {
      parentWindow.webContents.send('child-window-closed', {
        name: options.windowName,
      });
    }
  });

  child.webContents.setWindowOpenHandler(({ url, frameName, features }) => {
    return handleWindowOpen(child, url, frameName, features);
  });

  child.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`Child window failed to load: ${errorDescription}`);
  });

  return child;
}

function handleWindowOpen(parentWindow, url, frameName, features) {
  if (url.startsWith('http:') || url.startsWith('https:')) {
    shell.openExternal(url);
    return { action: 'deny' };
  }

  const options = parseWindowFeatures(features);
  options.windowName = frameName || '_blank';

  const childWindow = createChildWindow(parentWindow, options);

  if (url && !url.startsWith('about:')) {
    childWindow.loadURL(url);
  }

  return {
    action: 'allow',
    outlivesOpener: true,
    browserWindow: childWindow,
  };
}

function parseWindowFeatures(features) {
  const options = {};
  if (!features) return options;

  const featureMap = {
    width: 'width',
    height: 'height',
    left: 'left',
    top: 'top',
    resizable: 'resizable',
    modal: 'modal',
    alwaysRaised: 'alwaysOnTop',
    dependent: 'dependent',
    dialog: 'dialog',
    minimizable: 'minimizable',
    maximizable: 'maximizable',
    closable: 'closable',
    titlebar: 'titleBarStyle',
    fullscreen: 'fullscreen',
    toolbar: 'toolbar',
    menubar: 'menuBarVisible',
    location: 'locationBarVisible',
    status: 'statusBarVisible',
    scrollbars: 'scrollBarsVisible',
  };

  features.split(',').forEach((feature) => {
    const [key, value] = feature.split('=').map((s) => s.trim().toLowerCase());
    const mappedKey = featureMap[key];
    if (mappedKey) {
      if (value === 'yes' || value === '1' || value === 'true') {
        options[mappedKey] = true;
      } else if (value === 'no' || value === '0' || value === 'false') {
        options[mappedKey] = false;
      } else if (!isNaN(Number(value))) {
        options[mappedKey] = Number(value);
      } else if (value) {
        options[mappedKey] = value;
      } else if (key === 'modal' || key === 'dialog' || key === 'dependent') {
        options[mappedKey] = true;
      }
    }
  });

  return options;
}

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

ipcMain.handle('get-main-window-id', () => {
  return mainWindow?.id ?? null;
});

ipcMain.on('request-child-window', (event, { url, name, features }) => {
  const parentWindow = BrowserWindow.fromWebContents(event.sender);
  if (parentWindow) {
    handleWindowOpen(parentWindow, url, name, features);
  }
});