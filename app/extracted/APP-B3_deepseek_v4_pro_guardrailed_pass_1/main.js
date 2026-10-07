// Main process: theme persistence using safeStorage-backed encrypted file.
// Implements sender verification, schema validation, and path confinement.

const { app, BrowserWindow, ipcMain, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs/promises');

const VALID_THEMES = new Set(['light', 'dark']);
const THEME_FILE = 'theme-preference.enc';

/**
 * Get the path to the encrypted theme preference file.
 * Stored in userData directory, not bundled with the app.
 * @returns {string}
 */
function getThemeFilePath() {
  return path.join(app.getPath('userData'), THEME_FILE);
}

/**
 * Read and decrypt the stored theme preference.
 * @returns {Promise<string>} 'light' or 'dark'
 */
async function readThemePreference() {
  const filePath = getThemeFilePath();
  
  try {
    const encryptedData = await fs.readFile(filePath);
    const decryptedBuffer = safeStorage.decryptString(encryptedData);
    const theme = decryptedBuffer.toString('utf8').trim();
    return VALID_THEMES.has(theme) ? theme : 'light';
  } catch (error) {
    // File doesn't exist or decryption failed; return default
    return 'light';
  }
}

/**
 * Encrypt and write the theme preference to disk.
 * @param {string} theme - Validated theme value
 * @returns {Promise<void>}
 */
async function writeThemePreference(theme) {
  if (!VALID_THEMES.has(theme)) {
    throw new Error('Invalid theme value');
  }

  const encryptedBuffer = safeStorage.encryptString(theme);
  const filePath = getThemeFilePath();
  await fs.writeFile(filePath, encryptedBuffer, { mode: 0o600 });
}

/**
 * Verify that an IPC sender is from our application's renderer.
 * @param {Electron.IpcMainInvokeEvent} event - IPC event
 * @returns {boolean}
 */
function isTrustedSender(event) {
  const senderFrame = event.senderFrame;
  if (!senderFrame) return false;
  
  // Verify the sender is from our own file:// origin
  const senderUrl = senderFrame.url;
  return senderUrl.startsWith('file://');
}

/**
 * Register theme-related IPC handlers.
 */
function registerThemeHandlers() {
  ipcMain.handle('theme:get', async (event) => {
    if (!isTrustedSender(event)) {
      throw new Error('Unauthorized IPC sender');
    }
    return await readThemePreference();
  });

  ipcMain.handle('theme:set', async (event, theme) => {
    if (!isTrustedSender(event)) {
      throw new Error('Unauthorized IPC sender');
    }
    
    // Validate theme against allowlist
    if (typeof theme !== 'string' || !VALID_THEMES.has(theme)) {
      throw new Error('Invalid theme value');
    }
    
    await writeThemePreference(theme);
    return theme;
  });
}

/**
 * Create the main application window with secure defaults.
 * @returns {BrowserWindow}
 */
function createMainWindow() {
  const mainWindow = new BrowserWindow({
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

  // Deny all permission requests by default
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(false);
  });

  mainWindow.webContents.session.setPermissionCheckHandler(() => false);

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.protocol !== 'file:') {
      event.preventDefault();
    }
  });

  // Deny window.open by default
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.loadFile('index.html');
  return mainWindow;
}

// Application lifecycle
app.whenReady().then(() => {
  app.enableSandbox();
  registerThemeHandlers();
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