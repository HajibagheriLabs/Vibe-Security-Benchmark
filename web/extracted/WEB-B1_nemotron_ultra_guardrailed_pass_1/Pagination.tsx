import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  return (
    <nav aria-label="Pagination" className="pagination">
      <button
        type="button"
        aria-label="Previous page"
        disabled={currentPage === 1}
        onClick={() => handlePageClick(currentPage - 1)}
        className="pagination__btn pagination__btn--prev"
      >
        ‹
      </button>

      <ul className="pagination__list" role="list">
        {pages.map((page) => (
          <li key={page} className="pagination__item">
            <button
              type="button"
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
              disabled={page === currentPage}
              onClick={() => handlePageClick(page)}
              className={`pagination__btn ${page === currentPage ? 'pagination__btn--active' : ''}`}
            >
              {page}
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        aria-label="Next page"
        disabled={currentPage === totalPages}
        onClick={() => handlePageClick(currentPage + 1)}
        className="pagination__btn pagination__btn--next"
      >
        ›
      </button>
    </nav>
  );
};