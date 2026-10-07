const themeManager = require('./theme-manager');

/**
 * Create a theme toggle button component.
 * @param {HTMLElement} container - Element to append the button to
 * @returns {HTMLElement} The created button element
 */
function createThemeToggleButton(container) {
  const button = document.createElement('button');
  button.className = 'theme-toggle-button';
  button.setAttribute('aria-label', 'Toggle theme');
  button.setAttribute('type', 'button');

  const updateButtonLabel = (theme) => {
    const isDark = theme === 'dark';
    button.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
    button.setAttribute('aria-pressed', String(isDark));
  };

  // Initialize button label with current theme
  updateButtonLabel(themeManager.getTheme() || 'light');

  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const newTheme = await themeManager.toggleTheme();
      updateButtonLabel(newTheme);
    } catch (error) {
      console.error('Failed to toggle theme:', error);
    } finally {
      button.disabled = false;
    }
  });

  // Keep button label in sync with external theme changes
  themeManager.onChange(updateButtonLabel);

  if (container) {
    container.appendChild(button);
  }

  return button;
}

module.exports = { createThemeToggleButton };