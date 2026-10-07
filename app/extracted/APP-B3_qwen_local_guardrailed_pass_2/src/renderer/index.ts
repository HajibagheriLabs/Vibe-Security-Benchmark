import { initTheme, setTheme, listenForSystemThemeChanges } from './theme';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize theme
  await initTheme();
  
  // Listen for system changes
  listenForSystemThemeChanges();

  // Attach event listeners to UI elements (assuming buttons exist)
  const lightBtn = document.getElementById('theme-light');
  const darkBtn = document.getElementById('theme-dark');
  const systemBtn = document.getElementById('theme-system');

  if (lightBtn) lightBtn.addEventListener('click', () => setTheme('light'));
  if (darkBtn) darkBtn.addEventListener('click', () => setTheme('dark'));
  if (systemBtn) systemBtn.addEventListener('click', () => setTheme('system'));
});