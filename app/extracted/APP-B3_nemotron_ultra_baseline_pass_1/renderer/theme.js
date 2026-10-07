class ThemeManager {
  constructor() {
    this.currentTheme = 'light';
    this.selectElement = null;
    this.unsubscribe = null;
  }

  async init() {
    this.selectElement = document.getElementById('theme-select');
    if (!this.selectElement) {
      console.warn('Theme select element not found');
      return;
    }

    try {
      this.currentTheme = await window.themeAPI.getTheme();
      this.applyTheme(this.currentTheme);
      this.selectElement.value = this.currentTheme;

      this.selectElement.addEventListener('change', (e) => {
        this.setTheme(e.target.value);
      });

      this.unsubscribe = window.themeAPI.onThemeChanged((theme) => {
        this.currentTheme = theme;
        this.applyTheme(theme);
        this.selectElement.value = theme;
      });
    } catch (error) {
      console.error('Failed to initialize theme:', error);
    }
  }

  async setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    try {
      await window.themeAPI.setTheme(theme);
    } catch (error) {
      console.error('Failed to set theme:', error);
      this.selectElement.value = this.currentTheme;
    }
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.selectElement) {
      this.selectElement.removeEventListener('change', this.handleChange);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const themeManager = new ThemeManager();
  themeManager.init();
  window.themeManager = themeManager;
});