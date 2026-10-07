.pagination {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
}

.pagination__list {
  display: flex;
  gap: 0.25rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.pagination__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.5rem;
  height: 2.5rem;
  padding: 0 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: #fff;
  color: #111827;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.pagination__btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.pagination__btn:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.pagination__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination__btn--active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}

.pagination__btn--active:hover {
  background: #2563eb;
  border-color: #2563eb;
}