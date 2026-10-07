.pagination {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.pagination__button {
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  border: 1px solid #d1d5db;
  background-color: #ffffff;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease,
    color 0.15s ease;
}

.pagination__button:hover:not(:disabled):not(.pagination__button--active) {
  background-color: #f3f4f6;
  border-color: #9ca3af;
}

.pagination__button:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.pagination__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination__button--active {
  background-color: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
  cursor: default;
}

.pagination__button--nav {
  font-weight: 600;
  padding: 0 14px;
}

.pagination__ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  color: #6b7280;
  font-size: 14px;
  user-select: none;
}