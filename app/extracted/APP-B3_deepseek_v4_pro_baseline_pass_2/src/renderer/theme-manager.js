const { ipcRenderer } = require('electron');

const THEME_STORAGE_KEY = 'app-theme-preference';
const THEME_CHANGED_CHANNEL = 'theme-changed';

class ThemeManager {
  constructor() {
    this.currentTheme = null;
    this.listeners = new Set();
    this.initialized = false;
  }

  /**
   * Initialize the theme manager by loading the saved preference
   * and applying it to the document.
   */
  async initialize() {
    if (this.initialized) return;

    try {
      const savedTheme = await ipcRenderer.invoke('theme:get-preference');
      const theme = savedTheme || this.getSystemTheme();
      await this.setTheme(theme, false);
    } catch (error) {
      // Fallback to system theme if IPC fails
      await this.setTheme(this.getSystemTheme(), false);
    }

    this.initialized = true;
  }

  /**
   * Get the current theme ('light' or 'dark').
   */
  getTheme() {
    return this.currentTheme;
  }

  /**
   * Set the active theme and persist the choice.
   * @param {string} theme - 'light' or 'dark'
   * @param {boolean} persist - Whether to save the preference to disk
   */
  async setTheme(theme, persist = true) {
    if (theme !== 'light' && theme !== 'dark') {
      throw new Error(`Invalid theme: ${theme}. Must be 'light' or 'dark'.`);
    }

    this.currentTheme = theme;
    this.applyThemeToDOM(theme);

    if (persist) {
      try {
        await ipcRenderer.invoke('theme:set-preference', theme);
      } catch (error) {
        console.warn('Failed to persist theme preference:', error);
      }
    }

    this.notifyListeners(theme);
  }

  /**
   * Toggle between light and dark themes.
   */
  async toggleTheme() {
    const nextTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    await this.setTheme(nextTheme, true);
    return nextTheme;
  }

  /**
   * Subscribe to theme changes.
   * @param {Function} listener - Callback invoked with the new theme
   * @returns {Function} Unsubscribe function
   */
  onChange(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Apply the theme to the document root element.
   * @param {string} theme - 'light' or 'dark'
   */
  applyThemeToDOM(theme) {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
  }

  /**
   * Detect the system theme preference.
   * @returns {string} 'light' or 'dark'
   */
  getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  /**
   * Notify all registered listeners of a theme change.
   * @param {string} theme - The new theme
   */
  notifyListeners(theme) {
    for (const listener of this.listeners) {
      try {
        listener(theme);
      } catch (error) {
        console.error('Theme change listener error:', error);
      }
    }
  }
}

// Export a singleton instance
const themeManager = new ThemeManager();

module.exports = themeManager;
module.exports.ThemeManager = ThemeManager;