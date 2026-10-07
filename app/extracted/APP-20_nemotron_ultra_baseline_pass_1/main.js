const { app, BrowserWindow, shell } = require('electron');
const url = require('url');

let mainWindow = null;
const PROTOCOL = 'myapp';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function parseProtocolUrl(rawUrl) {
  try {
    const parsed = url.parse(rawUrl, true);
    if (parsed.protocol !== `${PROTOCOL}:`) {
      return null;
    }
    return {
      protocol: parsed.protocol,
      host: parsed.host,
      pathname: parsed.pathname,
      search: parsed.search,
      query: parsed.query,
      hash: parsed.hash,
      href: rawUrl,
    };
  } catch (err) {
    console.error('[Protocol] Failed to parse URL:', err);
    return null;
  }
}

function handleProtocolUrl(parsedUrl) {
  if (!parsedUrl) return;

  console.log('[Protocol] Received launch:', parsedUrl.href);

  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.webContents.send('protocol-launch', parsedUrl);
  } else {
    // Queue for when window is ready
    app.once('browser-window-created', () => {
      if (mainWindow) {
        mainWindow.webContents.once('did-finish-load', () => {
          mainWindow.webContents.send('protocol-launch', parsedUrl);
        });
      }
    });
  }
}

// --- macOS: open-url event (when app is already running) ---
app.on('open-url', (event, rawUrl) => {
  event.preventDefault();
  const parsed = parseProtocolUrl(rawUrl);
  handleProtocolUrl(parsed);
});

// --- Windows / Linux: second-instance handler ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }

    const protocolArg = argv.find(arg => arg.startsWith(`${PROTOCOL}:`));
    if (protocolArg) {
      const parsed = parseProtocolUrl(protocolArg);
      handleProtocolUrl(parsed);
    }
  });

  // --- Initial launch (all platforms) ---
  app.whenReady().then(() => {
    createWindow();

    // Check launch arguments for protocol URL
    const protocolArg = process.argv.find(arg => arg.startsWith(`${PROTOCOL}:`));
    if (protocolArg) {
      const parsed = parseProtocolUrl(protocolArg);
      handleProtocolUrl(parsed);
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}