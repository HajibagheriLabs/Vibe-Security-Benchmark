/**
 * @fileoverview Manages light/dark theme selection and persistence.
 * @module themes/ThemeManager
 */

const { ipcRenderer } = require('electron');

const STORAGE_KEY = 'app-theme-preference';

/**
 * @typedef {'light' | 'dark'} ThemeMode
 */

class ThemeManager {
  /**
   * @param {object} [options]
   * @param {ThemeMode} [options.initialMode] - Optional explicit initial mode to override stored preference.
   */
  constructor(options = {}) {
    this._mode = options.initialMode || this._getStoredPreference();
    this._applyTheme(this._mode);
  }

  /**
   * Retrieves the stored theme preference from localStorage.
   * @returns {ThemeMode}
   */
  _getStoredPreference() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    // Default to system preference if stored is invalid or missing
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return systemDark ? 'dark' : 'light';
  }

  /**
   * Applies the CSS class and sends notification to main process.
   * @param {ThemeMode} mode
   */
  _applyTheme(mode) {
    this._mode = mode;
    document.documentElement.setAttribute('data-theme', mode);
    ipcRenderer.send('theme-changed', mode);
  }

  /**
   * Switches the theme and persists the choice.
   * @param {ThemeMode} mode
   */
  setTheme(mode) {
    if (mode !== 'light' && mode !== 'dark') {
      throw new Error(`Invalid theme mode: ${mode}`);
    }
    localStorage.setItem(STORAGE_KEY, mode);
    this._applyTheme(mode);
  }

  /**
   * Toggles between light and dark.
   */
  toggleTheme() {
    const newMode = this._mode === 'light' ? 'dark' : 'light';
    this.setTheme(newMode);
  }

  /**
   * Returns the current active theme mode.
   * @returns {ThemeMode}
   */
  getMode() {
    return this._mode;
  }
}

module.exports = ThemeManager;