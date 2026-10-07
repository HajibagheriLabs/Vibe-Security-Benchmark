// main.js

const { ipcMain, shell } = require('electron');
const { URL } = require('url');

// Rule §2: shell.openExternal only after URL parsing, https: protocol only, no credentials.
// Rule §2: contextBridge exposes named single-purpose functions.
// Rule §2: verify senderFrame origin (optional but recommended for multi-origin apps).

const ALLOWED_PROTOCOLS = ['https:'];

ipcMain.handle('open-url', async (event, urlString) => {
  // 1. Parse URL
  let parsedUrl;
  try {
    parsedUrl = new URL(urlString);
  } catch (e) {
    return { success: false, error: 'Invalid URL format' };
  }

  // 2. Verify protocol
  if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
    return { success: false, error: 'Protocol not allowed' };
  }

  // 3. Verify no credentials in URL (security hygiene)
  if (parsedUrl.username || parsedUrl.password) {
    return { success: false, error: 'URL contains credentials' };
  }

  // 4. Open in system shell
  try {
    await shell.openExternal(parsedUrl.toString());
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Failed to open URL' };
  }
});