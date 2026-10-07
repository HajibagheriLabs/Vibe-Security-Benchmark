const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const CONFIG_DIR = path.join(app.getPath('userData'), 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'theme.json');

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadTheme() {
  try {
    ensureConfigDir();
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const config = JSON.parse(data);
      if (config.theme === 'light' || config.theme === 'dark') {
        return config.theme;
      }
    }
  } catch (error) {
    console.error('Failed to load theme config:', error);
  }
  return 'light';
}

function saveTheme(theme) {
  try {
    ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ theme }, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save theme config:', error);
    return false;
  }
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 520,
    webPreferences: {
      preload: path.join(__dirname, '../renderer/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('theme:get', async () => {
  return loadTheme();
});

ipcMain.handle('theme:set', async (_event, theme) => {
  if (theme !== 'light' && theme !== 'dark') {
    throw new Error('Invalid theme');
  }
  const success = saveTheme(theme);
  if (success && mainWindow) {
    mainWindow.webContents.send('theme:changed', theme);
  }
  return success;
});

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
    app.exit();
  }
});