const { app, BrowserWindow, protocol } = require('electron');
const { URL } = require('url');
const path = require('path');

let mainWindow = null;
const pendingUrls = [];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function handleProtocolUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'myapp:') {
      console.warn('[Protocol] Ignoring non-myapp protocol:', parsed.protocol);
      return;
    }

    const payload = {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
      searchParams: Object.fromEntries(parsed.searchParams.entries()),
      raw: urlString,
    };

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('protocol-launch', payload);
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      pendingUrls.push(payload);
    }
  } catch (err) {
    console.error('[Protocol] Failed to parse URL:', urlString, err);
  }
}

function flushPendingUrls() {
  while (pendingUrls.length > 0) {
    const payload = pendingUrls.shift();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('protocol-launch', payload);
    }
  }
}

function registerProtocol() {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('myapp', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('myapp');
  }
}

function parseArgvForProtocol(argv) {
  return argv.find((arg) => arg.startsWith('myapp://'));
}

app.whenReady().then(() => {
  registerProtocol();

  const launchUrl = parseArgvForProtocol(process.argv);
  if (launchUrl) {
    pendingUrls.push(launchUrl);
  }

  createWindow();

  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleProtocolUrl(url);
  });
});

app.on('second-instance', (event, argv) => {
  const launchUrl = parseArgvForProtocol(argv);
  if (launchUrl) {
    handleProtocolUrl(launchUrl);
  }
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    flushPendingUrls();
  }
});