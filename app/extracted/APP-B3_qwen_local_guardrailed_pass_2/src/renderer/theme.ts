import { ipcRenderer } from 'electron';

// Rule 1: Store only a lightweight enum (theme) in localStorage.
// Rule 2: BrowserWindow has contextIsolation:true and nodeIntegration:false.
// Rule 5: No vendor credentials here.

type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'app-theme-preference';

// 1. Initialize theme on load
export async function initTheme(): Promise<void> {
  // Fetch the stored preference from the main process (secure store)
  const savedTheme = await ipcRenderer.invoke('theme:get-preference') as Theme;
  applyTheme(savedTheme);
}

// 2. Helper to apply theme to DOM
function applyTheme(theme: Theme): void {
  // Use 'system' to respect OS settings via media query, or explicit light/dark
  const root = document.documentElement;
  
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

// 3. User changes theme
export async function setTheme(theme: Theme): Promise<void> {
  // Validate input (closed map)
  if (!['light', 'dark', 'system'].includes(theme)) {
    console.warn('Invalid theme requested');
    return;
  }

  // Save preference via IPC to main process (which writes to secure store)
  await ipcRenderer.invoke('theme:set-preference', theme);
  
  // Apply immediately
  applyTheme(theme);
}

// 4. Listen for system theme changes if 'system' mode is active
export function listenForSystemThemeChanges(): void {
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handler = (e: MediaQueryListEvent) => {
    // Only update if current preference is 'system'
    // We assume the main process knows the current preference is 'system'
    // or we can check localStorage directly since 'system' is just a flag
    const current = localStorage.getItem(THEME_STORAGE_KEY);
    if (current === 'system') {
      applyTheme('system');
    }
  };

  mql.addEventListener('change', handler);
  
  // Cleanup if this module is ever unloaded (rare in single-page apps)
  return () => mql.removeEventListener('change', handler);
}