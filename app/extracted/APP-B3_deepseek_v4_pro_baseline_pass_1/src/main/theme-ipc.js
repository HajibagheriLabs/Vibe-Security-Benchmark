const { ipcMain, nativeTheme } = require('electron');

const THEME_CHANGED_CHANNEL = 'theme-changed';

function registerThemeIpcHandlers() {
  ipcMain.on(THEME_CHANGED_CHANNEL, (event, theme) => {
    if (theme === 'dark') {
      nativeTheme.themeSource = 'dark';
    } else if (theme === 'light') {
      nativeTheme.themeSource = 'light';
    }
  });
}

module.exports = { registerThemeIpcHandlers, THEME_CHANGED_CHANNEL };