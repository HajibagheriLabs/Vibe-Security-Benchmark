const fs = require('fs');
const path = require('path');

const THEME_KEY = 'app_theme_preference';
const STORAGE_FILE = path.join(__dirname, '..', 'data', 'theme_storage.json');

/**
 * Ensures the storage directory exists.
 */
function ensureStorageDir() {
  const dir = path.dirname(STORAGE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Reads the stored theme preference from disk.
 * @returns {string|null} 'light', 'dark', or null if no preference is set.
 */
function readThemePreference() {
  try {
    ensureStorageDir();
    if (!fs.existsSync(STORAGE_FILE)) {
      return null;
    }
    const data = fs.readFileSync(STORAGE_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (parsed && (parsed[THEME_KEY] === 'light' || parsed[THEME_KEY] === 'dark')) {
      return parsed[THEME_KEY];
    }
  } catch (error) {
    console.error('Failed to read theme preference:', error);
  }
  return null;
}

/**
 * Saves the theme preference to disk.
 * @param {string} theme - 'light' or 'dark'.
 */
function saveThemePreference(theme) {
  try {
    ensureStorageDir();
    const data = {
      [THEME_KEY]: theme
    };
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save theme preference:', error);
  }
}

/**
 * Applies the theme to the document body and updates data attributes.
 * @param {string} theme - 'light' or 'dark'.
 */
function applyTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') {
    throw new Error(`Invalid theme: ${theme}. Must be 'light' or 'dark'.`);
  }

  document.body.classList.remove('theme-light', 'theme-dark');
  document.body.classList.add(`theme-${theme}`);
  document.documentElement.setAttribute('data-theme', theme);
  
  // Dispatch a custom event for other modules to listen to if necessary
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
}

/**
 * Initializes the theme manager.
 * 1. Reads persisted preference.
 * 2. If no preference, checks system preference (prefers dark).
 * 3. Applies the determined theme.
 * @returns {string} The current active theme.
 */
function initTheme() {
  let theme = readThemePreference();
  
  if (!theme) {
    // Fallback to system preference or default to dark
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = prefersDark ? 'dark' : 'light';
  }

  applyTheme(theme);
  return theme;
}

/**
 * Switches the theme and saves the new preference.
 * @param {string} newTheme - 'light' or 'dark'.
 */
function setTheme(newTheme) {
  applyTheme(newTheme);
  saveThemePreference(newTheme);
}

module.exports = {
  initTheme,
  setTheme,
  readThemePreference,
  applyTheme
};