/**
 * @fileoverview Entry point for the Electron renderer process.
 */

const ThemeManager = require('./themes/ThemeManager');

// Initialize theme manager
const themeManager = new ThemeManager();

// Setup UI controls
document.addEventListener('DOMContentLoaded', () => {
  const themeSelector = document.getElementById('theme-selector');
  const applyBtn = document.getElementById('apply-btn');

  if (themeSelector) {
    themeSelector.value = themeManager.getMode();
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const selected = themeSelector.value;
      themeManager.setTheme(selected);
    });
  }

  // Listen for system theme changes to update UI if desired (optional sync)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only update if no preference was explicitly stored, or if we want auto-sync
    // For this implementation, we stick to explicit user choice stored in localStorage
  });
});