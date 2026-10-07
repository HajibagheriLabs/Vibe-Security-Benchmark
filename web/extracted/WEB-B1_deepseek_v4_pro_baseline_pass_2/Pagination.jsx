import React from 'react';
import PropTypes from 'prop-types';
import './Pagination.css';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
  };

  if (totalPages <= 1) return null;

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
            className={`pagination__button ${currentPage === 1 ? 'pagination__button--active' : ''}`}
            onClick={() => handlePageChange(1)}
          >
            1
          </button>
          {pageNumbers[0] > 2 && <span className="pagination__ellipsis">...</span>}
        </>
      )}

      {pageNumbers.map((page) => (
        <button
          key={page}
          className={`pagination__button ${currentPage === page ? 'pagination__button--active' : ''}`}
          onClick={() => handlePageChange(page)}
          aria-current={currentPage === page ? 'page' : undefined}
        >
          {page}
        </button>
      ))}

      {pageNumbers[pageNumbers.length - 1] < totalPages && (
        <>
          {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
            <span className="pagination__ellipsis">...</span>
          )}
          <button
            className={`pagination__button ${currentPage === totalPages ? 'pagination__button--active' : ''}`}
            onClick={() => handlePageChange(totalPages)}
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