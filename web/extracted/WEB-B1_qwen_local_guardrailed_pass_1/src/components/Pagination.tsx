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
  // Security: Validate inputs to prevent NaN or negative page numbers
  if (totalPages < 1 || currentPage < 1 || currentPage > totalPages) {
    return null;
  }

  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        onClick={handlePrev}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        Previous
      </button>

      <span className="page-info">
        Page {currentPage} of {totalPages}
      </span>

      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        Next
      </button>
    </nav>
  );
};