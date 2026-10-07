.analytics-widget {
  --aw-bg: #ffffff;
  --aw-border: #e5e7eb;
  --aw-text: #111827;
  --aw-text-secondary: #6b7280;
  --aw-accent: #3b82f6;
  --aw-accent-hover: #2563eb;
  --aw-bar-bg: #e5e7eb;
  --aw-bar-fill: #3b82f6;
  --aw-error: #ef4444;
  --aw-warning-bg: #fef3c7;
  --aw-warning-text: #92400e;
  --aw-radius: 8px;
  --aw-padding: 1rem;
  --aw-gap: 0.75rem;

  background: var(--aw-bg);
  border: 1px solid var(--aw-border);
  border-radius: var(--aw-radius);
  padding: var(--aw-padding);
  color: var(--aw-text);
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
}

.analytics-widget--loading,
.analytics-widget--error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  gap: var(--aw-gap);
}

.analytics-widget__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--aw-border);
  border-top-color: var(--aw-accent);
  border-radius: 50%;
  animation: aw-spin 0.8s linear infinite;
}

@keyframes aw-spin {
  to {
    transform: rotate(360deg);
  }
}

.analytics-widget__error-message {
  color: var(--aw-error);
  margin: 0;
}

.analytics-widget__retry-button,
.analytics-widget__refresh-button {
  background: var(--aw-accent);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.2s;
}

.analytics-widget__retry-button:hover,
.analytics-widget__refresh-button:hover {
  background: var(--aw-accent-hover);
}

.analytics-widget__refresh-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.analytics-widget__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: var(--aw-gap);
}

.analytics-widget__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.analytics-widget__header-actions {
  display: flex;
  align-items: center;
  gap: var(--aw-gap);
}

.analytics-widget__last-updated {
  font-size: 0.75rem;
  color: var(--aw-text-secondary);
}

.analytics-widget__stale-warning {
  background: var(--aw-warning-bg);
  color: var(--aw-warning-text);
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.analytics-widget__metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--aw-gap);
  margin-bottom: 1.5rem;
}

.analytics-widget__metric-card {
  background: #f9fafb;
  border: 1px solid var(--aw-border);
  border-radius: 6px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.analytics-widget__metric-label {
  font-size: 0.75rem;
  color: var(--aw-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.analytics-widget__metric-value {
  font-size: 1.25rem;
  font-weight: 600;
}

.analytics-widget__sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.analytics-widget__section {
  border-top: 1px solid var(--aw-border);
  padding-top: 0.75rem;
}

.analytics-widget__section--full {
  grid-column: 1 / -1;
}

.analytics-widget__section-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--aw-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.analytics-widget__bar-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.analytics-widget__bar-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
}

.analytics-widget__bar-label {
  flex: 0 0 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.analytics-widget__bar-track {
  flex: 1;
  height: 8px;
  background: var(--aw-bar-bg);
  border-radius: 4px;
  overflow: hidden;
}

.analytics-widget__bar-fill {
  height: 100%;
  background: var(--aw-bar-fill);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.analytics-widget__bar-value {
  flex: 0 0 60px;
  text-align: right;
  color: var(--aw-text-secondary);
  font-variant-numeric: tabular-nums;
}

.analytics-widget__empty {
  color: var(--aw-text-secondary);
  font-size: 0.875rem;
  font-style: italic;
}

.analytics-widget__trend-chart {
  min-height: 150px;
}

.analytics-widget__trend-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 150px;
  padding-top: 0.5rem;
}

.analytics-widget__trend-bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
  gap: 4px;
}

.analytics-widget__trend-bar {
  width: 100%;
  max-width: 40px;
  background: var(--aw-bar-fill);
  border-radius: 3px 3px 0 0;
  min-height: 2px;
  transition: height 0.3s ease;
}

.analytics-widget__trend-date {
  font-size: 0.625rem;
  color: var(--aw-text-secondary);
  white-space: nowrap;
}