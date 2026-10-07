// Electron renderer module for theme selection
// Security note: Theme preference is non-sensitive UI state, safe for localStorage
// All DOM operations are sandboxed through contextBridge-exposed APIs

(function () {
  'use strict';

  const THEME_STORAGE_KEY = 'app-theme-preference';
  const VALID_THEMES = Object.freeze(['light', 'dark']);
  const DEFAULT_THEME = 'light';

  class ThemePicker {
    constructor() {
      this.currentTheme = this.loadTheme();
      this.applyTheme(this.currentTheme);
      this.bindEvents();
    }

    loadTheme() {
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored && VALID_THEMES.includes(stored)) {
          return stored;
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
      return DEFAULT_THEME;
    }

    saveTheme(theme) {
      if (!VALID_THEMES.includes(theme)) {
        throw new Error(`Invalid theme: ${theme}`);
      }
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    }

    applyTheme(theme) {
      if (!VALID_THEMES.includes(theme)) {
        throw new Error(`Invalid theme: ${theme}`);
      }
      
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.style.colorScheme = theme;
      
      // Update any theme toggle buttons/indicators
      this.updateThemeControls(theme);
    }

    updateThemeControls(theme) {
      const controls = document.querySelectorAll('[data-theme-toggle]');
      controls.forEach(control => {
        control.setAttribute('aria-pressed', String(control.dataset.theme === theme));
      });
    }

    setTheme(theme) {
      if (!VALID_THEMES.includes(theme)) {
        throw new Error(`Invalid theme: ${theme}`);
      }
      
      this.currentTheme = theme;
      this.applyTheme(theme);
      this.saveTheme(theme);
      
      // Dispatch event for other components to react
      window.dispatchEvent(new CustomEvent('theme-changed', {
        detail: { theme }
      }));
    }

    toggleTheme() {
      const nextTheme = this.currentTheme === 'light' ? 'dark' : 'light';
      this.setTheme(nextTheme);
    }

    bindEvents() {
      // Handle theme toggle buttons
      document.addEventListener('click', (event) => {
        const toggleButton = event.target.closest('[data-theme-toggle]');
        if (toggleButton) {
          const targetTheme = toggleButton.dataset.theme;
          if (VALID_THEMES.includes(targetTheme)) {
            this.setTheme(targetTheme);
          }
        }
      });

      // Handle keyboard shortcuts (e.g., Ctrl+Shift+T to toggle)
      document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.shiftKey && event.key === 'T') {
          event.preventDefault();
          this.toggleTheme();
        }
      });
    }

    getCurrentTheme() {
      return this.currentTheme;
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.themePicker = new ThemePicker();
    });
  } else {
    window.themePicker = new ThemePicker();
  }
})();