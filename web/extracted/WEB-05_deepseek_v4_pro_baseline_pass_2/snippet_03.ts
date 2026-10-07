/* app/dashboard/analytics-widget.css */
.analytics-widget {
  padding: 1.5rem;
  border-radius: 0.75rem;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  margin: 0 auto;
}

.analytics-widget__title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #1a1a1a;
}

.analytics-widget__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.analytics-widget__metric {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
}

.analytics-widget__metric-label {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
}

.analytics-widget__metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.analytics-widget__date {
  font-size: 0.875rem;
  color: #6b7280;
  text-align: right;
}

.analytics-widget--loading,
.analytics-widget--error,
.analytics-widget--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  text-align: center;
  color: #6b7280;
}

.analytics-widget--error {
  color: #dc2626;
}

.analytics-widget__spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 0.75rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}