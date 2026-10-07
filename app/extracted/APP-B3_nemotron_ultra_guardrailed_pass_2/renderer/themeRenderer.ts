// SECURITY: Renderer uses only the typed contextBridge API. No Node APIs, no ipcRenderer.
// Theme applied via data-theme attribute on documentElement.

import type { ThemeMode, ThemeStore } from './themeStore';

const store = window.themeStore as ThemeStore;
const currentEl = document.getElementById('current')!;
const toggleBtn = document.getElementById('toggle')!;

function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode;
  currentEl.textContent = mode;
}

async function init() {
  const mode = await store.getTheme();
  applyTheme(mode);
  store.onThemeChange(applyTheme);
  toggleBtn.addEventListener('click', async () => {
    const next = mode === 'light' ? 'dark' : 'light';
    await store.setTheme(next);
  });
}

let mode: ThemeMode = 'light';
store.getTheme().then(m => { mode = m; init(); });