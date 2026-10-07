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
  // Guard against invalid states
  if (totalPages < 1 || currentPage < 1 || currentPage > totalPages) {
    return null;
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page: number) => {
    if (page !== currentPage) {
      onPageChange(page);
    }
  };

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className="pagination-btn"
      >
        Previous
      </button>

      <div className="pagination-numbers" role="group" aria-label="Page numbers">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => handlePageClick(page)}
            disabled={page === currentPage}
            aria-current={page === currentPage ? 'page' : undefined}
            aria-label={`Go to page ${page}`}
            className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className="pagination-btn"
      >
        Next
      </button>
    </nav>
  );
};