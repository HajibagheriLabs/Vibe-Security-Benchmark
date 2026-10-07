const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

let mainWindow = null;
const childWindows = new Map();

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

function createChildWindow(opener, options = {}) {
  const {
    url = 'about:blank',
    frameName = '',
    features = '',
    referrer = '',
    postBody = null,
    disposition = 'new-window',
  } = options;

  const parsedFeatures = parseWindowFeatures(features);
  const bounds = calculateWindowBounds(parsedFeatures);

  const childWindow = new BrowserWindow({
    ...bounds,
    show: false,
    parent: opener,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: opener.webContents.session.partition,
    },
  });

  childWindow.setMenuBarVisibility(false);

  childWindow.once('ready-to-show', () => {
    childWindow.show();
  });

  childWindow.on('closed', () => {
    childWindows.delete(childWindow.id);
    notifyOpenerWindowClosed(childWindow);
  });

  childWindow.webContents.on('did-finish-load', () => {
    childWindow.webContents.executeJavaScript(`
      window.name = ${JSON.stringify(frameName)};
      window.opener = ${frameName ? 'window.opener' : 'null'};
    `).catch(console.error);
  });

  childWindow.webContents.setWindowOpenHandler(({ url: requestedUrl, frameName: requestedFrameName, features: requestedFeatures, disposition: requestedDisposition, referrer: requestedReferrer, postBody: requestedPostBody }) => {
    return handleWindowOpen(childWindow, {
      url: requestedUrl,
      frameName: requestedFrameName,
      features: requestedFeatures,
      disposition: requestedDisposition,
      referrer: requestedReferrer,
      postBody: requestedPostBody,
    });
  });

  childWindows.set(childWindow.id, {
    window: childWindow,
    opener: opener,
    frameName,
  });

  if (url !== 'about:blank') {
    loadURLInChildWindow(childWindow, url, referrer, postBody);
  }

  return { action: 'allow', outlivesOpener: false, window: childWindow };
}

function parseWindowFeatures(features) {
  const result = {};
  if (!features) return result;

  const featurePairs = features.split(',');
  for (const pair of featurePairs) {
    const [key, value] = pair.split('=').map(s => s.trim());
    if (key) {
      result[key.toLowerCase()] = value === '' ? true : value;
    }
  }
  return result;
}

function calculateWindowBounds(features) {
  const bounds = {
    width: 800,
    height: 600,
    x: undefined,
    y: undefined,
  };

  if (features.width) bounds.width = Math.max(100, parseInt(features.width, 10));
  if (features.height) bounds.height = Math.max(100, parseInt(features.height, 10));
  if (features.left) bounds.x = parseInt(features.left, 10);
  if (features.top) bounds.y = parseInt(features.top, 10);

  if (features.center === true || features.center === 'yes') {
    bounds.x = undefined;
    bounds.y = undefined;
  }

  return bounds;
}

function loadURLInChildWindow(childWindow, url, referrer, postBody) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      childWindow.loadURL(url, {
        httpReferrer: referrer || '',
        postData: postBody,
      });
    } else {
      shell.openExternal(url);
      childWindow.close();
    }
  } catch (error) {
    console.error('Invalid URL for child window:', url, error);
    childWindow.loadURL('about:blank');
  }
}

function handleWindowOpen(opener, options) {
  const { url, disposition } = options;

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'file:' && parsedUrl.protocol !== 'about:') {
      shell.openExternal(url);
      return { action: 'deny' };
    }
  } catch {
    shell.openExternal(url);
    return { action: 'deny' };
  }

  if (disposition === 'new-tab' || disposition === 'foreground-tab' || disposition === 'background-tab') {
    opener.webContents.send('open-tab-request', { url, ...options });
    return { action: 'deny' };
  }

  return createChildWindow(opener, options);
}

function notifyOpenerWindowClosed(closedWindow) {
  for (const [id, info] of childWindows.entries()) {
    if (info.opener === closedWindow) {
      info.window.webContents.executeJavaScript('window.opener = null;').catch(console.error);
    }
  }
}

ipcMain.handle('get-child-windows', () => {
  return Array.from(childWindows.entries()).map(([id, info]) => ({
    id,
    frameName: info.frameName,
    url: info.window.webContents.getURL(),
  }));
});

ipcMain.on('close-child-window', (event, windowId) => {
  const info = childWindows.get(windowId);
  if (info) {
    info.window.close();
  }
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

app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler((details) => {
    if (contents.hostWebContents) {
      return handleWindowOpen(contents.hostWebContents, details);
    }
    return handleWindowOpen(mainWindow, details);
  });
});