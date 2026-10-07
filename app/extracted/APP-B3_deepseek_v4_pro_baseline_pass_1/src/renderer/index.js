const ThemePicker = require('./theme-picker');
require('./theme-styles.css');

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('theme-picker-container');
  if (container) {
    const picker = new ThemePicker(container);
    window.themePicker = picker;
  }
});