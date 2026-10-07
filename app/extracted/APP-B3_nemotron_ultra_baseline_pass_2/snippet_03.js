/* Theme Styles - Import this in your renderer HTML */
/* CSS Custom Properties for theming */

:root {
  /* Light theme (default) */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #e8e8e8;
  --bg-hover: #e0e0e0;
  --bg-active: #d0d0d0;
  
  --text-primary: #1a1a1a;
  --text-secondary: #4a4a4a;
  --text-muted: #888888;
  --text-inverse: #ffffff;
  
  --border-color: #dddddd;
  --border-focus: #0066cc;
  
  --accent-primary: #0066cc;
  --accent-hover: #0052a3;
  --accent-light: #e6f0fa;
  
  --success: #28a745;
  --warning: #ffc107;
  --danger: #dc3545;
  --info: #17a2b8;
  
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', monospace;
  
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
}

[data-theme="dark"] {
  --bg-primary: #1e1e1e;
  --bg-secondary: #252526;
  --bg-tertiary: #2d2d2d;
  --bg-hover: #383838;
  --bg-active: #404040;
  
  --text-primary: #e0e0e0;
  --text-secondary: #b0b0b0;
  --text-muted: #808080;
  --text-inverse: #1a1a1a;
  
  --border-color: #3c3c3c;
  --border-focus: #4a9eff;
  
  --accent-primary: #4a9eff;
  --accent-hover: #6ab0ff;
  --accent-light: #1e3a5f;
  
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.4);
}

/* Theme Toggle Button Styles */
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 13px;
  font-family: var(--font-sans);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.theme-toggle:hover {
  background: var(--bg-hover);
  border-color: var(--border-focus);
}

.theme-toggle:active {
  background: var(--bg-active);
  transform: scale(0.98);
}

.theme-toggle:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

.theme-toggle[data-theme="dark"] {
  /* Dark mode specific tweaks if needed */
}

/* Theme Select Styles */
.theme-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 140px;
}

.theme-select:hover {
  border-color: var(--border-focus);
}

.theme-select:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--accent-light);
}

.theme-select option {
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 8px;
}

/* Utility classes for themed components */
.themed-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: 24px;
  color: var(--text-primary);
}

.themed-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  font-family: var(--font-sans);
  transition: all var(--transition-fast);
}

.themed-input:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--accent-light);
}

.themed-input::placeholder {
  color: var(--text-muted);
}

.themed-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--accent-primary);
  color: var(--text-inverse);
  font-size: 14px;
  font-family: var(--font-sans);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.themed-button:hover {
  background: var(--accent-hover);
}

.themed-button:active {
  transform: scale(0.98);
}

.themed-button:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

.themed-button.secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.themed-button.secondary:hover {
  background: var(--bg-hover);
}

.themed-button.ghost {
  background: transparent;
  color: var(--text-primary);
}

.themed-button.ghost:hover {
  background: var(--bg-hover);
}

/* Scrollbar theming */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* Selection theming */
::selection {
  background: var(--accent-light);
  color: var(--text-primary);
}

/* Focus visible polyfill */
:focus:not(:focus-visible) {
  outline: none;
}

:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}