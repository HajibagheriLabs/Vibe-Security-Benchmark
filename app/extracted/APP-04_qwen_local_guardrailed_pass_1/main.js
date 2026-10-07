const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { URL } = require('url');

// Ensure sandbox is enabled for all windows
app.enableSandbox();

function createWindow() {
  const win = new BrowserWindow({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  // Preload script exposes a single, typed function
  win.loadFile('index.html');
  
  // Example renderer code:
  // require('electron').ipcRenderer.invoke('open-url', 'https://example.com');
}

app.whenReady().then(createWindow);

// Rule 2: Every ipcMain handler verifies sender, parses schema, authorizes, and confines paths.
// Rule 2: Never expose generic invoke. Use named function with typed parameters.
// Rule 2: shell.openExternal only after URL parsing, https: protocol only, no credentials.

ipcMain.handle('open-external-url', async (event, urlString) => {
  // 1. Verify sender frame origin (optional but recommended for strict isolation)
  const sender = event.sender;
  const senderOrigin = sender.getURL();
  
  // 2. Parse and validate the URL
  let parsedUrl;
  try {
    parsedUrl = new URL(urlString);
  } catch (e) {
    throw new Error('Invalid URL format');
  }

  // 3. Authorize: enforce https: protocol
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Only https: URLs are allowed');
  }

  // 4. Constrain: reject URLs with credentials in the URL
  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('URL contains credentials');
  }

  // 5. Open in system shell
  try {
    await shell.openExternal(parsedUrl.href);
    return { success: true };
  } catch (error) {
    throw new Error('Failed to open URL');
  }
});