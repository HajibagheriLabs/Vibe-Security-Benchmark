import React from 'react';
import PropTypes from 'prop-types';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) {
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

  const handlePageClick = (page) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5; // Maximum number of page buttons to show
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages are few
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      // Determine range around current page
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust range if we are at the edges
      if (currentPage <= 2) {
        start = 2;
        end = 4;
      } else if (currentPage >= totalPages - 1) {
        start = totalPages - 3;
        end = totalPages - 1;
      }
      
      // Add ellipsis after first page if needed
      if (start > 2) {
        pages.push('ellipsis-start');
      }
      
      // Add range
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pages.push('ellipsis-end');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="pagination" role="navigation" aria-label="Pagination">
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className="pagination-btn pagination-prev"
      >
        Previous
      </button>

      <div className="pagination-numbers">
        {pageNumbers.map((page, index) => {
          if (page === 'ellipsis-start' || page === 'ellipsis-end') {
            return (
              <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                ...
              </span>
            );
          }
          
          return (
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
          );
        })}
      </div>

      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className="pagination-btn pagination-next"
      >
        Next
      </button>
    </div>
  );
};

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};

export default Pagination;