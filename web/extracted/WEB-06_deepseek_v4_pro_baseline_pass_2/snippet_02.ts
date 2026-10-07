/* styles/autocomplete-search.css */
.autocomplete-search {
  position: relative;
  width: 100%;
  max-width: 600px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
}

.autocomplete-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.autocomplete-input-wrapper:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.autocomplete-search-icon {
  position: absolute;
  left: 12px;
  color: #94a3b8;
  pointer-events: none;
}

.autocomplete-input {
  width: 100%;
  padding: 12px 40px 12px 40px;
  font-size: 16px;
  border: none;
  outline: none;
  background: transparent;
  color: #1e293b;
}

.autocomplete-input::placeholder {
  color: #94a3b8;
}

.autocomplete-loading-spinner {
  position: absolute;
  right: 12px;
  color: #3b82f6;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.autocomplete-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  max-height: 400px;
  overflow-y: auto;
  z-index: 50;
}

.autocomplete-list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
}

.autocomplete-item-wrapper {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.autocomplete-item-wrapper:hover,
.autocomplete-item-wrapper.active {
  background-color: #f1f5f9;
}

.autocomplete-item {
  padding: 0;
}

.autocomplete-item-content {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  gap: 12px;
}

.autocomplete-item-image {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
}

.autocomplete-item-text {
  flex: 1;
  min-width: 0;
}

.autocomplete-item-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.autocomplete-item-description {
  margin: 2px 0 0;
  font-size: 13px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.autocomplete-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-top: 1px solid #e2e8f0;
  font-size: 12px;
  color: #94a3b8;
}

.autocomplete-view-all {
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.autocomplete-view-all:hover {
  color: #2563eb;
}

.autocomplete-empty {
  padding: 16px;
  text-align: center;
  color: #64748b;
  font-size: 14px;
}

.autocomplete-empty p {
  margin: 0;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .autocomplete-input-wrapper {
    background: #1e293b;
    border-color: #334155;
  }

  .autocomplete-input {
    color: #f1f5f9;
  }

  .autocomplete-input::placeholder {
    color: #64748b;
  }

  .autocomplete-panel {
    background: #1e293b;
    border-color: #334155;
  }

  .autocomplete-item-wrapper:hover,
  .autocomplete-item-wrapper.active {
    background-color: #334155;
  }

  .autocomplete-item-title {
    color: #f1f5f9;
  }

  .autocomplete-item-description {
    color: #94a3b8;
  }

  .autocomplete-footer {
    border-top-color: #334155;
    color: #64748b;
  }

  .autocomplete-empty {
    color: #94a3b8;
  }
}