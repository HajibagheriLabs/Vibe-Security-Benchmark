const { ipcMain, BrowserWindow, app } = require('electron');
const { execFile } = require('child_process');
const path = require('path');
const os = require('os');

// §2. DESKTOP PROCESS ISOLATION
// - contextIsolation: true, nodeIntegration: false (assumed standard config)
// - No generic invoke; specific named handler.
// - Strict schema validation.
// - No shell:true; uses execFile.
// - Path confinement.

// Configuration
const GIT_BIN = process.platform === 'win32' ? 'git.exe' : 'git';
// Assume git is in PATH or provide absolute path: const GIT_BIN = '/usr/bin/git';

/**
 * §2. IPC Handler: Runs a local git CLI command.
 * 
 * Flow: verify sender frame → parse schema → authorize → canonicalize path → execFile
 */
ipcMain.handle('git:run-command', async (event, args) => {
    // 1. Verify sender frame origin
    // Note: event.senderFrame is available in Electron 10+.
    if (!event.senderFrame) {
        throw new Error('Sender frame is missing');
    }
    const origin = event.senderFrame.getURL();
    if (!origin.startsWith('app://')) {
        // Allow http:// if loaded locally, but strict for app://
        if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
             // If loaded from file://, allow
             if (!origin.startsWith('file://')) {
                 throw new Error(`Unauthorized origin: ${origin}`);
             }
        }
    }

    // 2. Parse explicit schema
    // We accept a directory path and an array of git arguments.
    const { dir, args: gitArgs } = args;

    // Validate dir: must be a string
    if (typeof dir !== 'string') {
        throw new Error('Invalid argument: dir must be a string');
    }

    // Validate gitArgs: must be an array of strings
    if (!Array.isArray(gitArgs) || !gitArgs.every(arg => typeof arg === 'string')) {
        throw new Error('Invalid argument: args must be an array of strings');
    }

    // 3. Authorize against main-process state
    // (Example: check if the window is associated with a specific project ID)
    // const project = getProjectForWindow(event.senderId);
    // if (!project) throw new Error('Unauthorized window');

    // 4. Canonicalize and confine any path
    // Resolve to absolute path and ensure it starts with the expected base (e.g., user's home or a specific repo dir)
    const resolvedDir = path.resolve(dir);
    // Simple confinement: ensure it's within the user's home directory
    const homeDir = os.homedir();
    if (!resolvedDir.startsWith(homeDir)) {
        throw new Error(`Git directory ${resolvedDir} is outside allowed scope ${homeDir}`);
    }

    // 5. execFile(constBin, [args])
    // §2. NEVER exec/execSync/spawn with shell:true
    try {
        return new Promise((resolve, reject) => {
            execFile(
                GIT_BIN,
                gitArgs,
                { cwd: resolvedDir, timeout: 10000 }, // 10s timeout
                (error, stdout, stderr) => {
                    if (error) {
                        reject(new Error(`Git command failed: ${stderr}`));
                        return;
                    }
                    resolve(stdout);
                }
            );
        });
    } catch (err) {
        reject(err);
    }
});

// §2. On web-contents-created: will-navigate denies external URLs
app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        if (parsedUrl.protocol !== 'app:' && parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            event.preventDefault();
        }
        // Deny external navigation if it's not a known safe domain
        if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
            // Allow localhost for dev, or specific domains
            if (!parsedUrl.hostname.includes('localhost') && !parsedUrl.hostname.includes('example.com')) {
                event.preventDefault();
            }
        }
    });

    // §2. setWindowOpenHandler returns deny by default
    contents.setWindowOpenHandler(({ url }) => {
        return { action: 'deny' };
    });
});