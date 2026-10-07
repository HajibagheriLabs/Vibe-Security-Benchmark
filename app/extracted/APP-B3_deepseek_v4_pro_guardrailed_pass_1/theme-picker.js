// Electron renderer module for theme selection with secure persistence.
// Uses main-process IPC for storage via safeStorage-backed encrypted file.
// No Node.js modules are exposed to this renderer context.

const THEME_CHANNEL = {
  GET: 'theme:get',
  SET: 'theme:set'
};

const VALID_THEMES = Object.freeze(['light', 'dark']);

/**
 * Theme picker module for the renderer process.
 * Communicates with the main process through a narrow, typed IPC bridge.
 */
const ThemePicker = (() => {
  /**
   * Validate a theme value against the allowlist.
   * @param {unknown} theme - Value to validate
   * @returns {string} Validated theme or 'light' as safe default
   */
  function validateTheme(theme) {
    return VALID_THEMES.includes(theme) ? theme : 'light';
  }

  /**
   * Get the currently stored theme preference.
   * @returns {Promise<string>} Resolves with 'light' or 'dark'
   */
  async function getTheme() {
    try {
      const theme = await window.themeAPI.getTheme();
      return validateTheme(theme);
    } catch (error) {
      console.error('Failed to retrieve theme:', error);
      return 'light';
    }
  }

  /**
   * Set and persist the user's theme preference.
   * @param {string} theme - 'light' or 'dark'
   * @returns {Promise<string>} The validated theme that was stored
   */
  async function setTheme(theme) {
    const validatedTheme = validateTheme(theme);
    try {
      await window.themeAPI.setTheme(validatedTheme);
      return validatedTheme;
    } catch (error) {
      console.error('Failed to persist theme:', error);
      throw error;
    }
  }

  /**
   * Apply the theme to the document.
   * @param {string} theme - 'light' or 'dark'
   */
  function applyTheme(theme) {
    const validatedTheme = validateTheme(theme);
    document.documentElement.setAttribute('data-theme', validatedTheme);
  }

  /**
   * Initialize the theme picker: load persisted theme and apply it.
   * @returns {Promise<string>} The applied theme
   */
  async function initialize() {
    const theme = await getTheme();
    applyTheme(theme);
    return theme;
  }

  return {
    getTheme,
    setTheme,
    applyTheme,
    initialize,
    VALID_THEMES
  };
})();

// Expose for use by the renderer application
window.ThemePicker = ThemePicker;