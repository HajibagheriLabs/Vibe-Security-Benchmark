// Theme Toggle UI Component
// Provides a ready-to-use theme toggle button

import themeManager from './theme-manager.js';

/**
 * Create a theme toggle button element
 * @param {Object} options - Configuration options
 * @param {string} options.lightLabel - Label for light mode (default: '☀️ Light')
 * @param {string} options.darkLabel - Label for dark mode (default: '🌙 Dark')
 * @param {string} options.tooltip - Tooltip text (default: 'Toggle theme')
 * @param {string} options.className - Additional CSS classes
 * @returns {HTMLButtonElement} Toggle button element
 */
export function createThemeToggle(options = {}) {
  const {
    lightLabel = '☀️ Light',
    darkLabel = '🌙 Dark',
    tooltip = 'Toggle theme (Ctrl+Shift+T)',
    className = ''
  } = options;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = `theme-toggle ${className}`.trim();
  button.setAttribute('aria-label', tooltip);
  button.setAttribute('title', tooltip);
  
  // Initial state
  updateButtonLabel(button, themeManager.getTheme(), lightLabel, darkLabel);

  // Click handler
  button.addEventListener('click', () => {
    themeManager.toggleTheme();
  });

  // Update on theme change
  const unsubscribe = themeManager.subscribe((theme) => {
    updateButtonLabel(button, theme, lightLabel, darkLabel);
  });

  // Cleanup on removal
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.removedNodes) {
        if (node === button || node.contains?.(button)) {
          unsubscribe();
          observer.disconnect();
          return;
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return button;
}

/**
 * Update button label based on current theme
 */
function updateButtonLabel(button, theme, lightLabel, darkLabel) {
  button.textContent = theme === 'dark' ? darkLabel : lightLabel;
  button.setAttribute('data-theme', theme);
}

/**
 * Create a theme select dropdown
 * @param {Object} options - Configuration options
 * @returns {HTMLSelectElement} Select element
 */
export function createThemeSelect(options = {}) {
  const { className = '', labels = { light: 'Light', dark: 'Dark', system: 'System' } } = options;

  const select = document.createElement('select');
  select.className = `theme-select ${className}`.trim();
  select.setAttribute('aria-label', 'Select theme');

  const themes = [
    { value: 'light', label: labels.light },
    { value: 'dark', label: labels.dark },
    { value: 'system', label: labels.system }
  ];

  themes.forEach(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  });

  // Set initial value
  const savedTheme = localStorage.getItem('app-theme-preference');
  select.value = savedTheme || 'system';

  select.addEventListener('change', (e) => {
    const value = e.target.value;
    if (value === 'system') {
      localStorage.removeItem('app-theme-preference');
      themeManager.setTheme(themeManager.getSystemTheme());
    } else {
      themeManager.setTheme(value);
    }
  });

  // Update on theme change (only for explicit light/dark)
  const unsubscribe = themeManager.subscribe((theme) => {
    const saved = localStorage.getItem('app-theme-preference');
    if (saved) {
      select.value = saved;
    }
  });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.removedNodes) {
        if (node === select || node.contains?.(select)) {
          unsubscribe();
          observer.disconnect();
          return;
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return select;
}

/**
 * Register global keyboard shortcut (Ctrl+Shift+T)
 * @param {Object} options - Options
 * @param {boolean} options.enable - Enable shortcut (default: true)
 */
export function registerThemeShortcut(options = {}) {
  const { enable = true } = options;
  
  if (!enable) return () => {};

  const handler = (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      themeManager.toggleTheme();
    }
  };

  document.addEventListener('keydown', handler);
  
  return () => {
    document.removeEventListener('keydown', handler);
  };
}

// Auto-register shortcut when module loads
let shortcutCleanup = null;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    shortcutCleanup = registerThemeShortcut();
  });
} else {
  shortcutCleanup = registerThemeShortcut();
}

export function unregisterThemeShortcut() {
  if (shortcutCleanup) {
    shortcutCleanup();
    shortcutCleanup = null;
  }
}