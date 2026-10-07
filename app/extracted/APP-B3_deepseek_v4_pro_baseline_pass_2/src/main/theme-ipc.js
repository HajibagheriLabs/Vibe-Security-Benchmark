const { ipcMain } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

const THEME_PREFERENCE_FILE = 'theme-preference.json';

/**
 * Register IPC handlers for theme preference persistence.
 * Call this during app initialization in the main process.
 */
function registerThemeIpcHandlers() {
  const preferencePath = path.join(app.getPath('userData'), THEME_PREFERENCE_FILE);

  ipcMain.handle('theme:get-preference', async () => {
    try {
      const data = await fs.readFile(preferencePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed.theme === 'light' || parsed.theme === 'dark') {
        return parsed.theme;
      }
      return null;
    } catch (error) {
      // File doesn't exist or is invalid — return null (no saved preference)
      return null;
    }
  });

  ipcMain.handle('theme:set-preference', async (_event, theme) => {
    if (theme !== 'light' && theme !== 'dark') {
      throw new Error(`Invalid theme: ${theme}`);
    }

    const data = JSON.stringify({ theme, savedAt: new Date().toISOString() }, null, 2);
    await fs.writeFile(preferencePath, data, 'utf-8');
    return true;
  });
}

module.exports = { registerThemeIpcHandlers };