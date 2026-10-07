/* Theme definitions for light and dark modes */

:root[data-theme="light"] {
  --background-color: #ffffff;
  --text-color: #1a1a1a;
  --border-color: #e0e0e0;
  --accent-color: #0066cc;
  --hover-color: #f5f5f5;
  --shadow-color: rgba(0, 0, 0, 0.1);
}

:root[data-theme="dark"] {
  --background-color: #1a1a1a;
  --text-color: #e0e0e0;
  --border-color: #404040;
  --accent-color: #66b3ff;
  --hover-color: #2a2a2a;
  --shadow-color: rgba(255, 255, 255, 0.1);
}

/* Base styles using CSS variables */
body {
  background-color: var(--background-color);
  color: var(--text-color);
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Theme toggle button styles */
[data-theme-toggle] {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--background-color);
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.3s ease;
}

[data-theme-toggle]:hover {
  background-color: var(--hover-color);
}

[data-theme-toggle][aria-pressed="true"] {
  border-color: var(--accent-color);
  color: var(--accent-color);
  font-weight: bold;
}