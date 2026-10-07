:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #1a1a1a;
  --text-secondary: #4a4a4a;
  --border-color: #e0e0e0;
  --accent: #4a90d9;
  --shadow: rgba(0, 0, 0, 0.1);
}

:root[data-theme='dark'] {
  --bg-primary: #1e1e1e;
  --bg-secondary: #2d2d2d;
  --text-primary: #e8e8e8;
  --text-secondary: #b0b0b0;
  --border-color: #444444;
  --accent: #6cb2f0;
  --shadow: rgba(0, 0, 0, 0.4);
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.theme-toggle-button {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.theme-toggle-button:hover {
  background-color: var(--border-color);
}

.theme-toggle-button:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}