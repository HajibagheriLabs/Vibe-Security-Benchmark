const { app } = require('electron');
const { URL } = require('url');

/**
 * Registers the custom protocol handler and processes launch arguments.
 * 
 * @param {string} protocolName - The name of the custom protocol (e.g., 'myapp').
 * @param {Function} handler - Callback function invoked with the parsed URL object.
 */
function registerProtocolHandler(protocolName, handler) {
  // Ensure the protocol is registered before ready if possible, 
  // or handle it in the 'ready' event.
  
  // Set as default handler for the protocol
  app.setAsDefaultProtocolClient(protocolName);

  // Handle second instance (when app is already running)
  const gotLock = app.requestSingleInstanceLock();

  if (!gotLock) {
    // If we fail to get the lock, another instance is running.
    // The second instance will send its arguments to the first via 'second-instance'.
    app.quit();
    return;
  }

  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // A second instance was launched with the custom protocol.
    // Find the URL argument in the command line.
    const urlArg = commandLine.find(arg => arg.startsWith(`${protocolName}://`));
    
    if (urlArg) {
      try {
        const parsedUrl = new URL(urlArg);
        handler(parsedUrl);
      } catch (error) {
        console.error(`Failed to parse protocol URL: ${urlArg}`, error);
      }
    }
  });

  app.on('ready', () => {
    // Handle the initial launch arguments (process.argv)
    const urlArg = process.argv.find(arg => arg.startsWith(`${protocolName}://`));
    
    if (urlArg) {
      try {
        const parsedUrl = new URL(urlArg);
        handler(parsedUrl);
      } catch (error) {
        console.error(`Failed to parse protocol URL: ${urlArg}`, error);
      }
    }
  });

  // Optional: Handle 'open-url' event on macOS when app is already running
  app.on('open-url', (event, url) => {
    event.preventDefault();
    try {
      const parsedUrl = new URL(url);
      handler(parsedUrl);
    } catch (error) {
      console.error(`Failed to parse protocol URL: ${url}`, error);
    }
  });
}

module.exports = { registerProtocolHandler };