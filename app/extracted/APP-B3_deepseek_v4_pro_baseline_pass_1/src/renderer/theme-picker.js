const themeManager = require('./theme-manager');

class ThemePicker {
  constructor(container) {
    this.container = container;
    this.button = null;
    this._render();
    this._bindEvents();
  }

  _render() {
    this.button = document.createElement('button');
    this.button.className = 'theme-toggle-button';
    this.button.setAttribute('aria-label', 'Toggle theme');
    this.button.setAttribute('role', 'switch');
    this._updateButtonAppearance();
    this.container.appendChild(this.button);
  }

  _updateButtonAppearance() {
    const isDark = themeManager.isDark();
    this.button.textContent = isDark ? '🌙 Dark Mode' : '☀️ Light Mode';
    this.button.setAttribute('aria-checked', String(isDark));
    this.button.title = isDark ? 'Switch to light theme' : 'Switch to dark theme';
  }

  _bindEvents() {
    this.button.addEventListener('click', () => {
      themeManager.toggleTheme();
    });

    themeManager.onChange(() => {
      this._updateButtonAppearance();
    });
  }

  destroy() {
    if (this.button && this.button.parentNode) {
      this.button.parentNode.removeChild(this.button);
    }
    this.button = null;
  }
}

module.exports = ThemePicker;