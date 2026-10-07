// Main Process - Electron Entry Point
// Handles theme persistence at application level and native window theming

const { app, BrowserWindow, nativeTheme, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const STORE_PATH = path.join(app.getPath('userData'), 'theme-preference.json');
const THEME_KEY = 'theme';

class ThemeStore {
  constructor() {
    this.cache = null;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
        this.cache = data;
      } else {
        this.cache = {};
      }
    } catch (e) {
      console.warn('Failed to load theme store:', e);
      this.cache = {};
    }
  }

  save() {
    try {
      fs.writeFileSync(STORE_PATH, JSON.stringify(this.cache, null, 2));
    } catch (e) {
      console.warn('Failed to save theme store:', e);
    }
  }

  get(key, defaultValue = null) {
    return this.cache[key] ?? defaultValue;
  }

  set(key, value) {
    this.cache[key] = value;
    this.save();
  }

  delete(key) {
    delete this.cache[key];
    this.save();
  }
}

const themeStore = new ThemeStore();

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    // Apply theme to window chrome (title bar, etc.)
    backgroundColor: getBackgroundColor(),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  // Load renderer
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173'); // Vite dev server
  } else {
    win.loadFile(path.join(__dirname, 'renderer/index.html'));
  }

  // Update window chrome when theme changes
  const updateWindowTheme = (theme) => {
    const bgColor = theme === 'dark' ? '#1e1e1e' : '#ffffff';
    win.setBackgroundColor(bgColor);
    
    // On macOS, update title bar appearance
    if (process.platform === 'darwin') {
      // Requires titleBarStyle: 'hiddenInset' or similar
      // Native theme handled by CSS in renderer
    }
  };

  // Apply initial theme
  updateWindowTheme(getCurrentTheme());

  // Listen for renderer theme changes
  const unsubscribe = themeManagerSubscribe((theme) => {
    updateWindowTheme(theme);
  });

  win.on('closed', () => {
    unsubscribe();
  });

  return win;
}

// Theme manager subscription (simplified for main process)
function themeManagerSubscribe(callback) {
  // In a real app, you might use a proper event emitter
  // This is a simple implementation
  if (!global._themeListeners) global._themeListeners = new Set();
  global._themeListeners.add(callback);
  return () => global._themeListeners.delete(callback);
}

function notifyThemeListeners(theme) {
  if (global._themeListeners) {
    global._themeListeners.forEach(cb => cb(theme));
  }
}

function getCurrentTheme() {
  // Check stored preference first
  const stored = themeStore.get(THEME_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  // Fall back to system theme
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

function getBackgroundColor() {
  return getCurrentTheme() === 'dark' ? '#1e1e1e' : '#ffffff';
}

function setTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') return;
  themeStore.set(THEME_KEY, theme);
  nativeTheme.themeSource = theme;
  notifyThemeListeners(theme);
  return theme;
}

function toggleTheme() {
  const current = getCurrentTheme();
  return setTheme(current === 'light' ? 'dark' : 'light');
}

// IPC Handlers
ipcMain.handle('theme:get', () => getCurrentTheme());

ipcMain.handle('theme:set', (_event, theme) => setTheme(theme));

ipcMain.handle('theme:toggle', () => toggleTheme());

ipcMain.handle('theme:getSystem', () => 
  nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
);

// Storage IPC (optional - for main-process persistence)
ipcMain.handle('storage:get', (_event, key) => themeStore.get(key));

ipcMain.handle('storage:set', (_event, key, value) => {
  themeStore.set(key, value);
  return true;
});

ipcMain.handle('storage:delete', (_event, key) => {
  themeStore.delete(key);
  return true;
});

// Listen for system theme changes
nativeTheme.on('updated', () => {
  const stored = themeStore.get(THEME_KEY);
  // Only auto-switch if no explicit user preference
  if (!stored) {
    const newTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    notifyThemeListeners(newTheme);
  }
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Handle theme changes from renderer (if using contextBridge)
ipcMain.on('theme:set', (_event, theme) => {
  setTheme(theme);
});