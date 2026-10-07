const { ipcRenderer } = require('electron');

const THEME_STORAGE_KEY = 'app-theme-preference';
const THEME_CHANGED_CHANNEL = 'theme-changed';

class ThemeManager {
  constructor() {
    this.currentTheme = null;
    this.listeners = new Set();
    this._loadInitialTheme();
    this._setupSystemThemeListener();
  }

  _loadInitialTheme() {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      this.setTheme(stored, false);
    } else {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(systemPrefersDark ? 'dark' : 'light', false);
    }
  }

  _setupSystemThemeListener() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (!stored) {
        this.setTheme(e.matches ? 'dark' : 'light', false);
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handler);
    }
  }

  setTheme(theme, persist = true) {
    if (theme !== 'light' && theme !== 'dark') {
      throw new Error(`Invalid theme: ${theme}. Must be 'light' or 'dark'.`);
    }
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    if (persist) {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
    this._notifyListeners(theme);
    ipcRenderer.send(THEME_CHANGED_CHANNEL, theme);
  }

  toggleTheme() {
    const next = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(next, true);
    return next;
  }

  getTheme() {
    return this.currentTheme;
  }

  isDark() {
    return this.currentTheme === 'dark';
  }

  isLight() {
    return this.currentTheme === 'light';
  }

  onChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notifyListeners(theme) {
    for (const listener of this.listeners) {
      try {
        listener(theme);
      } catch (err) {
        console.error('Theme change listener error:', err);
      }
    }
  }

  resetToSystemPreference() {
    localStorage.removeItem(THEME_STORAGE_KEY);
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.setTheme(systemPrefersDark ? 'dark' : 'light', false);
  }
}

const themeManager = new ThemeManager();

module.exports = themeManager;