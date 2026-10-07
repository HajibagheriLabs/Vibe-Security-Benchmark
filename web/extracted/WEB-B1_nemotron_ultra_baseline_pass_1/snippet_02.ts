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

.pagination__button--page {
  min-width: 2.5rem;
}

.pagination__button--page.pagination__button--active {
  background-color: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}

.pagination__button--page.pagination__button--active:hover {
  background-color: #2563eb;
  border-color: #2563eb;
}

.pagination__button--prev,
.pagination__button--next {
  min-width: auto;
  padding: 0 1rem;
}

@media (max-width: 480px) {
  .pagination__button--prev,
  .pagination__button--next {
    padding: 0 0.5rem;
  }
  
  .pagination__button {
    min-width: 2rem;
    height: 2rem;
    font-size: 0.8125rem;
  }
}