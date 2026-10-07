const { app, BrowserWindow } = require('electron');
const path = require('path');

// Flag to track if the protocol has been handled to prevent duplicate window creation
let protocolHandled = false;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load the app's index.html
  mainWindow.loadFile('index.html');

  // Optional: Send the parsed arguments to the renderer
  mainWindow.webContents.on('did-finish-load', () => {
    if (!protocolHandled && process.argv.length > 1) {
      // Parse the first argument that looks like a URL
      const urlArg = process.argv.find(arg => arg.startsWith('myapp://'));
      if (urlArg) {
        mainWindow.webContents.send('protocol-arg', urlArg);
      }
    }
  });
}

// Handle the custom protocol
function handleProtocol(url) {
  if (protocolHandled) return;
  
  // Parse the URL to extract path and query parameters
  try {
    // Remove the 'myapp://' prefix
    const pathAndQuery = url.replace('myapp://', '');
    const [pathPart, queryPart] = pathAndQuery.split('?');
    
    console.log('Protocol launch detected:', {
      path: pathPart,
      query: queryPart
    });

    // Store for later use if window is already created
    global.protocolLaunchArgs = { path: pathPart, query: queryPart };
    
    protocolHandled = true;
  } catch (error) {
    console.error('Error parsing protocol URL:', error);
  }
}

app.whenReady().then(() => {
  // Check if launched via protocol
  const protocolArg = process.argv.find(arg => arg.startsWith('myapp://'));
  if (protocolArg) {
    handleProtocol(protocolArg);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('open-url', (event, url) => {
  // This event is fired when the app is already running and receives a protocol launch
  event.preventDefault();
  handleProtocol(url);
});

// Handle second instance (Windows/Linux specific fallback)
app.on('second-instance', (event, commandLine) => {
  const protocolArg = commandLine.find(arg => arg.startsWith('myapp://'));
  if (protocolArg) {
    handleProtocol(protocolArg);
  }

  // Focus existing window
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});