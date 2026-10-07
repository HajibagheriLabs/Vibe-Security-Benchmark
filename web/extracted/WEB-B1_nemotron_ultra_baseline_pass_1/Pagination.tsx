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

  const handlePrev = () => handlePageClick(currentPage - 1);
  const handleNext = () => handlePageClick(currentPage + 1);

  return (
    <nav aria-label="Pagination" className="pagination">
      <button
        onClick={handlePrev}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className="pagination__button pagination__button--prev"
      >
        ‹ Prev
      </button>

      <div className="pagination__pages" role="group" aria-label="Page numbers">
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => handlePageClick(page)}
            className={`pagination__button pagination__button--page ${page === currentPage ? 'pagination__button--active' : ''}`}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className="pagination__button pagination__button--next"
      >
        Next ›
      </button>
    </nav>
  );
};