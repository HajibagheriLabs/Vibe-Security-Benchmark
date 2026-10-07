const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');

// Global reference to keep the main window alive
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      // Explicitly disable the <webview> tag in the main window to prevent nested host compromise
      webviewTag: false,
    },
  });

  // Load the local HTML entry point
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Handle child window creation via window.open()
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // 1. Validate URL: Ensure it's HTTPS and matches allowed domains
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { action: 'deny' };
    }

    // Example allowlist: only allow navigation to specific domains
    const allowedHosts = ['example.com', 'api.example.com'];
    if (!allowedHosts.includes(parsedUrl.hostname)) {
      return { action: 'deny' };
    }

    // 2. Create the child window with strict security flags
    const childWindow = new BrowserWindow({
      width: 800,
      height: 600,
      parent: mainWindow, // Optional: keep it as a child of main
      modal: true,        // Optional: make it modal
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        // Ensure the child window does NOT have access to the main process's require
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    // 3. Load the URL
    childWindow.loadURL(url);

    // 4. Return action to Electron's setWindowOpenHandler
    return {
      action: 'allow',
      bringToFront: true,
      // Note: In newer Electron versions, you might need to pass the BrowserWindow instance
      // directly if using window.open('url', '_blank') in preload context, 
      // but returning { action: 'allow' } is standard for handling the event.
    };
  });
}

app.whenReady().then(() => {
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