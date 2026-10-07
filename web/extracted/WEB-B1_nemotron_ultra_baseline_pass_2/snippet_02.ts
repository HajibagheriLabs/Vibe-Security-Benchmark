.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  flex-wrap: wrap;
}

.pagination__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  height: 2.5rem;
  padding: 0 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background-color: #fff;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pagination__button:hover:not(:disabled) {
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
  color: #fff;
}

.pagination__button--active:hover {
  background-color: #2563eb;
  border-color: #2563eb;
}

.pagination__pages {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.pagination__ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  height: 2.5rem;
  color: #9ca3af;
  font-size: 0.875rem;
}