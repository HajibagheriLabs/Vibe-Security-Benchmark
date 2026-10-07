import React from 'react';
import PropTypes from 'prop-types';
import './Pagination.css';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);

    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        className="pagination__button pagination__button--nav"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        &laquo; Prev
      </button>

      {pageNumbers[0] > 1 && (
        <>
          <button
            className="pagination__button"
            onClick={() => handlePageChange(1)}
            aria-label="Go to page 1"
          >
            1
          </button>
          {pageNumbers[0] > 2 && (
            <span className="pagination__ellipsis" aria-hidden="true">
              &hellip;
            </span>
          )}
        </>
      )}

      {pageNumbers.map((page) => (
        <button
          key={page}
          className={`pagination__button ${
            page === currentPage ? 'pagination__button--active' : ''
          }`}
          onClick={() => handlePageChange(page)}
          aria-label={`Go to page ${page}`}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </button>
      ))}

      {pageNumbers[pageNumbers.length - 1] < totalPages && (
        <>
          {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
            <span className="pagination__ellipsis" aria-hidden="true">
              &hellip;
            </span>
          )}
          <button
            className="pagination__button"
            onClick={() => handlePageChange(totalPages)}
            aria-label={`Go to page ${totalPages}`}
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        className="pagination__button pagination__button--nav"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
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