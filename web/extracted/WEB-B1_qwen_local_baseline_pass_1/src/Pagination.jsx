import React from 'react';
import PropTypes from 'prop-types';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (!totalPages || totalPages <= 1) {
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

  const handlePageClick = (page) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const renderPageButtons = () => {
    const buttons = [];
    // Simple pagination: render all pages. 
    // For large numbers of pages, this could be optimized with ellipsis logic.
    for (let i = 1; i <= totalPages; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageClick(i)}
          disabled={i === currentPage}
          className={`pagination-btn ${i === currentPage ? 'active' : ''}`}
          aria-current={i === currentPage ? 'page' : undefined}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        onClick={handlePrev}
        disabled={currentPage === 1}
        className="pagination-btn pagination-prev"
        aria-label="Previous page"
      >
        &laquo; Prev
      </button>
      
      <div className="pagination-pages">
        {renderPageButtons()}
      </div>

      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className="pagination-btn pagination-next"
        aria-label="Next page"
      >
        Next &raquo;
      </button>
    </nav>
  );
};

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};

export default Pagination;