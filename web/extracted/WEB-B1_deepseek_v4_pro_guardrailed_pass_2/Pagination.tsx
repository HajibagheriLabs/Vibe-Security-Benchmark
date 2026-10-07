// Pagination.tsx
import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    if (page === currentPage) return;
    onPageChange(page);
  };

  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage: number;
    let endPage: number;

    if (totalPages <= maxVisiblePages) {
      startPage = 1;
      endPage = totalPages;
    } else {
      const halfVisible = Math.floor(maxVisiblePages / 2);
      
      if (currentPage <= halfVisible + 1) {
        startPage = 1;
        endPage = maxVisiblePages;
      } else if (currentPage >= totalPages - halfVisible) {
        startPage = totalPages - maxVisiblePages + 1;
        endPage = totalPages;
      } else {
        startPage = currentPage - halfVisible;
        endPage = currentPage + halfVisible;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav aria-label="Pagination">
      <ul style={{ display: 'flex', listStyle: 'none', padding: 0, gap: '8px' }}>
        <li>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            Previous
          </button>
        </li>

        {pageNumbers.map((page) => (
          <li key={page}>
            <button
              onClick={() => handlePageChange(page)}
              disabled={page === currentPage}
              aria-current={page === currentPage ? 'page' : undefined}
              style={{
                fontWeight: page === currentPage ? 'bold' : 'normal',
                backgroundColor: page === currentPage ? '#e0e0e0' : 'transparent',
              }}
            >
              {page}
            </button>
          </li>
        ))}

        <li>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;