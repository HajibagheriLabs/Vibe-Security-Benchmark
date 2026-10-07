// Theme Manager for Electron Renderer Process
// Handles light/dark theme selection with persistence

const THEME_STORAGE_KEY = 'app-theme-preference';
const THEME_ATTRIBUTE = 'data-theme';
const DEFAULT_THEME = 'light';

class ThemeManager {
  constructor() {
    this.currentTheme = DEFAULT_THEME;
    this.listeners = new Set();
    this.initialized = false;
  }

  /**
   * Initialize the theme manager
   * Loads saved preference or detects system preference
   */
  async init() {
    if (this.initialized) return;

    // Try to load from localStorage first
    const savedTheme = this.loadFromStorage();
    
    if (savedTheme) {
      this.currentTheme = savedTheme;
    } else {
      // Fall back to system preference
      this.currentTheme = this.getSystemTheme();
    }

    this.applyTheme(this.currentTheme);
    this.initialized = true;
    
    // Listen for system theme changes
    this.watchSystemTheme();
    
    return this.currentTheme;
  }

  /**
   * Load theme preference from localStorage
   * @returns {string|null} Saved theme or null
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch (e) {
      console.warn('Failed to read theme from localStorage:', e);
    }
    return null;
  }

  /**
   * Save theme preference to localStorage
   * @param {string} theme - Theme to save ('light' or 'dark')
   */
  saveToStorage(theme) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }
  }

  /**
   * Detect system color scheme preference
   * @returns {string} 'light' or 'dark'
   */
  getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  /**
   * Watch for system theme changes
   */
  watchSystemTheme() {
    if (!window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handler = (e) => {
      // Only auto-switch if user hasn't explicitly set a preference
      const hasExplicitPreference = localStorage.getItem(THEME_STORAGE_KEY) !== null;
      if (!hasExplicitPreference) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    };

    // Modern API
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else if (mediaQuery.addListener) {
      // Legacy API
      mediaQuery.addListener(handler);
    }

    // Store cleanup function
    this._systemThemeCleanup = () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handler);
      }
    };
  }

  /**
   * Apply theme to document
   * @param {string} theme - Theme to apply
   */
  applyTheme(theme) {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
    this.currentTheme = theme;
    
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('theme-change', { 
      detail: { theme } 
    }));
    
    // Notify listeners
    this.listeners.forEach(callback => {
      try {
        callback(theme);
      } catch (e) {
        console.error('Theme listener error:', e);
      }
    });
  }

  /**
   * Set the active theme
   * @param {string} theme - 'light' or 'dark'
   */
  setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') {
      console.warn(`Invalid theme: ${theme}. Must be 'light' or 'dark'`);
      return;
    }

    if (theme === this.currentTheme) return;

    this.saveToStorage(theme);
    this.applyTheme(theme);
  }

  /**
   * Toggle between light and dark theme
   */
  toggleTheme() {
    this.setTheme(this.currentTheme === 'light' ? 'dark' : 'light');
  }

  /**
   * Get current theme
   * @returns {string} Current theme
   */
  getTheme() {
    return this.currentTheme;
  }

  /**
   * Subscribe to theme changes
   * @param {Function} callback - Called with new theme
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this._systemThemeCleanup) {
      this._systemThemeCleanup();
    }
    this.listeners.clear();
    this.initialized = false;
  }
}

// Export singleton instance
const themeManager = new ThemeManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => themeManager.init());
} else {
  themeManager.init();
}

export default themeManager;
export { ThemeManager };