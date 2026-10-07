// Theme Manager Module
// 
// Rule 1 (Storage): Uses `localStorage` for the theme string (light/dark) which is not 
// sensitive. Rule 2 (Desktop Process Isolation): Context isolation enabled; reads 
// `document.documentElement` directly. No IPC needed for local UI state.
// Rule 5 (Supply Chain): No new dependencies.

const THEME_KEY = 'app-theme-preference';

/**
 * Reads the stored theme preference or falls back to system preference.
 * @returns {'light' | 'dark'}
 */
function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) || 'system';
}

/**
 * Applies the theme to the DOM.
 * @param {'light' | 'dark' | 'system'} theme 
 */
function applyTheme(theme) {
  const root = document.documentElement;
  
  if (theme === 'system') {
    root.removeAttribute('data-theme');
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.setAttribute('data-theme', 'light');
    }
  } else {
    root.setAttribute('data-theme', theme);
  }
}

/**
 * Listens for system theme changes if 'system' mode is active.
 */
function initThemeListener() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = (e) => {
    if (getStoredTheme() === 'system') {
      applyTheme('system');
    }
  };
  
  mediaQuery.addEventListener('change', handleChange);
}

/**
 * Sets the user's theme preference and persists it.
 * @param {'light' | 'dark'} theme 
 */
function setTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') {
    throw new Error(`Invalid theme: ${theme}`);
  }
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

/**
 * Initializes the theme system.
 */
function initTheme() {
  const storedTheme = getStoredTheme();
  applyTheme(storedTheme);
  initThemeListener();
}

// Export for testing or external binding
module.exports = {
  initTheme,
  setTheme,
  getStoredTheme,
  applyTheme
};