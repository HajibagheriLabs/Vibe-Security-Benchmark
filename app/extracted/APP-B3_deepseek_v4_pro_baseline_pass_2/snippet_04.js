/* Theme variables — applied via [data-theme] attribute on <html> */

:root,
:root[data-theme='light'] {
  --color-bg: #ffffff;
  --color-bg-secondary: #f5f5f5;
  --color-text: #1a1a1a;
  --color-text-secondary: #555555;
  --color-border: #dddddd;
  --color-accent: #2563eb;
  --color-accent-hover: #1d4ed8;
  --color-danger: #dc2626;
  --color-success: #16a34a;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.12);
}

:root[data-theme='dark'] {
  --color-bg: #1a1a2e;
  --color-bg-secondary: #16213e;
  --color-text: #e8e8e8;
  --color-text-secondary: #a0a0b0;
  --color-border: #333355;
  --color-accent: #60a5fa;
  --color-accent-hover: #3b82f6;
  --color-danger: #f87171;
  --color-success: #4ade80;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.45);
}

/* Base application styles using theme variables */
body {
  background-color: var(--color-bg);
  color: var(--color-text);
  transition: background-color 0.3s ease, color 0.3s ease;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Theme toggle button styling */
.theme-toggle-button {
  background-color: var(--color-bg-secondary);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.1s ease;
  box-shadow: var(--shadow-sm);
}

.theme-toggle-button:hover {
  background-color: var(--color-accent);
  color: #ffffff;
  border-color: var(--color-accent);
}

.theme-toggle-button:active {
  transform: scale(0.97);
}

.theme-toggle-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.theme-toggle-button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}