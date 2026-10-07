import { app, BrowserWindow, dialog } from 'electron';
import * as path from 'path';
import * as url from 'url';

// Protocol scheme for this application
const PROTOCOL_SCHEME = 'myapp';

// Store the URL that triggered the app launch (if any)
let pendingProtocolUrl: string | null = null;

// Keep a global reference to the window to prevent garbage collection
let mainWindow: BrowserWindow | null = null;

/**
 * Parse protocol launch arguments from process.argv
 * Returns the first valid myapp:// URL found, or null if none exists
 */
function parseProtocolUrlFromArgv(argv: string[]): string | null {
  for (const arg of argv) {
    // Skip non-string arguments (shouldn't happen, but defensive)
    if (typeof arg !== 'string') continue;
    
    // Check if this argument is a myapp:// URL
    if (arg.startsWith(`${PROTOCOL_SCHEME}://`)) {
      try {
        // Validate it's a proper URL
        const parsed = new URL(arg);
        if (parsed.protocol === `${PROTOCOL_SCHEME}:`) {
          return arg;
        }
      } catch {
        // Invalid URL, continue searching
        continue;
      }
    }
  }
  return null;
}

/**
 * Handle the protocol URL - route to appropriate action
 */
function handleProtocolUrl(protocolUrl: string): void {
  console.log(`[Protocol] Handling URL: ${protocolUrl}`);
  
  try {
    const parsedUrl = new URL(protocolUrl);
    const host = parsedUrl.hostname;
    const pathname = parsedUrl.pathname;
    const searchParams = parsedUrl.searchParams;
    
    // Route based on host/path
    switch (host) {
      case 'open':
        handleOpenAction(pathname, searchParams);
        break;
      case 'settings':
        handleSettingsAction(searchParams);
        break;
      case 'auth':
        handleAuthAction(searchParams);
        break;
      default:
        console.warn(`[Protocol] Unknown host: ${host}`);
        showErrorDialog(`Unknown protocol action: ${host}`);
    }
  } catch (error) {
    console.error('[Protocol] Failed to parse URL:', error);
    showErrorDialog('Invalid protocol URL format');
  }
}

/**
 * Handle 'open' action - e.g., myapp://open/path/to/resource?param=value
 */
function handleOpenAction(pathname: string, params: URLSearchParams): void {
  const resourcePath = pathname.replace(/^\/+/, '');
  const resourceId = params.get('id');
  const mode = params.get('mode') || 'view';
  
  console.log(`[Protocol] Open action - path: ${resourcePath}, id: ${resourceId}, mode: ${mode}`);
  
  // Send to renderer if window exists
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('protocol:open', {
      path: resourcePath,
      id: resourceId,
      mode: mode,
      params: Object.fromEntries(params.entries())
    });
    
    // Focus the window
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    // Store for later when window is created
    pendingProtocolUrl = `myapp://open/${resourcePath}?${params.toString()}`;
  }
}

/**
 * Handle 'settings' action - e.g., myapp://settings?section=general
 */
function handleSettingsAction(params: URLSearchParams): void {
  const section = params.get('section') || 'general';
  
  console.log(`[Protocol] Settings action - section: ${section}`);
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('protocol:settings', {
      section: section,
      params: Object.fromEntries(params.entries())
    });
    
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    pendingProtocolUrl = `myapp://settings?section=${section}`;
  }
}

/**
 * Handle 'auth' action - e.g., myapp://auth?token=xyz&user=123
 */
function handleAuthAction(params: URLSearchParams): void {
  const token = params.get('token');
  const userId = params.get('user');
  
  console.log(`[Protocol] Auth action - token: ${token ? '***' : 'missing'}, user: ${userId}`);
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('protocol:auth', {
      token: token,
      userId: userId,
      params: Object.fromEntries(params.entries())
    });
    
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    pendingProtocolUrl = `myapp://auth?${params.toString()}`;
  }
}

/**
 * Show error dialog for invalid protocol actions
 */
function showErrorDialog(message: string): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Protocol Error',
      message: message,
      buttons: ['OK']
    });
  } else {
    dialog.showMessageBox({
      type: 'error',
      title: 'Protocol Error',
      message: message,
      buttons: ['OK']
    });
  }
}

/**
 * Create the main application window
 */
function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });
  
  // Load the app
  window.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  
  // Show window when ready
  window.once('ready-to-show', () => {
    window.show();
    
    // Process any pending protocol URL
    if (pendingProtocolUrl) {
      const urlToProcess = pendingProtocolUrl;
      pendingProtocolUrl = null;
      handleProtocolUrl(urlToProcess);
    }
  });
  
  // Handle window close
  window.on('closed', () => {
    mainWindow = null;
  });
  
  return window;
}

/**
 * Register protocol handler for macOS (open-url event)
 */
function registerMacProtocolHandler(): void {
  app.on('open-url', (event, url) => {
    event.preventDefault();
    
    if (url.startsWith(`${PROTOCOL_SCHEME}://`)) {
      if (app.isReady() && mainWindow && !mainWindow.isDestroyed()) {
        handleProtocolUrl(url);
      } else {
        pendingProtocolUrl = url;
      }
    }
  });
}

/**
 * Register protocol handler for Windows/Linux (second-instance event)
 */
function registerSecondInstanceHandler(): void {
  const gotLock = app.requestSingleInstanceLock();
  
  if (!gotLock) {
    app.quit();
    return;
  }
  
  app.on('second-instance', (event, argv, workingDirectory) => {
    // Someone tried to run a second instance
    // Focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    
    // Check for protocol URL in the new instance's argv
    const protocolUrl = parseProtocolUrlFromArgv(argv);
    if (protocolUrl) {
      if (app.isReady() && mainWindow && !mainWindow.isDestroyed()) {
        handleProtocolUrl(protocolUrl);
      } else {
        pendingProtocolUrl = protocolUrl;
      }
    }
  });
}

/**
 * Main app lifecycle
 */
app.whenReady().then(() => {
  // Register protocol handlers
  registerMacProtocolHandler();
  registerSecondInstanceHandler();
  
  // Create main window
  mainWindow = createMainWindow();
  
  // Check for protocol URL in initial launch arguments
  const initialProtocolUrl = parseProtocolUrlFromArgv(process.argv);
  if (initialProtocolUrl) {
    pendingProtocolUrl = initialProtocolUrl;
  }
  
  // macOS: activate handler
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app quit
app.on('before-quit', () => {
  pendingProtocolUrl = null;
});

// Export for testing purposes
export {
  parseProtocolUrlFromArgv,
  handleProtocolUrl,
  PROTOCOL_SCHEME
};