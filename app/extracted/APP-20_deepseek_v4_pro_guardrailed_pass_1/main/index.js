const { app, BrowserWindow } = require('electron');
const deepLinkHandler = require('./deep-link-handler');

// Security-relevant decisions:
// - Full renderer isolation flag set (AGENT_RULES §2)
// - Deep links resolved through single allowlist resolver (AGENT_RULES §4)
// - No navigation or state mutation from link parameters

app.enableSandbox();

function createWindow() {
  const win = new BrowserWindow({
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
      experimentalFeatures: false
    }
  });

  win.loadFile('index.html');
  return win;
}

// Handle macOS protocol launch (app is already running)
app.on('open-url', (event, url) => {
  event.preventDefault();
  const command = deepLinkHandler.handleOpenUrlEvent(event, url);
  if (command) {
    // Route to appropriate handler — NO state mutation from link
    routeCommand(command);
  }
});

// Handle Windows/Linux second instance launch
app.on('second-instance', (event, argv) => {
  const command = deepLinkHandler.handleSecondInstanceArgv(argv);
  if (command) {
    // Route to appropriate handler — NO state mutation from link
    routeCommand(command);
  }
});

// Handle initial launch (all platforms)
app.whenReady().then(() => {
  const command = deepLinkHandler.handleProtocolLaunch(process.argv);
  if (command) {
    // Route to appropriate handler — NO state mutation from link
    routeCommand(command);
  }
  createWindow();
});

/**
 * Route a validated command to the appropriate handler.
 * IMPORTANT: This only triggers navigation to a screen.
 * The screen fetches its own data using the session identity.
 * No authorization, no data mutation, no trust of link parameters.
 */
function routeCommand(command) {
  switch (command.command) {
    case 'OPEN_DOCUMENT':
      // Navigate to document viewer — document ID validated as UUID
      // Screen fetches document data from server using session identity
      break;
    case 'OPEN_SETTINGS':
      // Navigate to settings screen
      break;
    case 'OPEN_PROFILE':
      // Navigate to profile screen — userId validated as UUID
      // Screen fetches profile data from server using session identity
      break;
    default:
      // Unknown command — reject
      break;
  }
}