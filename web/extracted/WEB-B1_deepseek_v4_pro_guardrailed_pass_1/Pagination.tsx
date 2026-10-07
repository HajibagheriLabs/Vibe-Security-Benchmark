// Pagination.tsx
import React, { useCallback, useMemo } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  boundaryCount?: number;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

interface PageItem {
  type: 'page' | 'ellipsis-start' | 'ellipsis-end';
  page: number;
  key: string;
}

const range = (start: number, end: number): number[] => {
  const length = end - start + 1;
  return Array.from({ length }, (_, i) => start + i);
};

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  boundaryCount = 1,
  disabled = false,
  ariaLabel = 'Pagination',
  className = '',
}) => {
  // Validate props
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
  const safeTotalPages = Math.max(1, totalPages);

  const handlePageChange = useCallback(
    (page: number) => {
      if (disabled) return;
      if (page < 1 || page > safeTotalPages) return;
      if (page === safeCurrentPage) return;
      onPageChange(page);
    },
    [disabled, safeTotalPages, safeCurrentPage, onPageChange]
  );

  const pageItems = useMemo<PageItem[]>(() => {
    if (safeTotalPages <= 1) return [];

    const items: PageItem[] = [];
    const startPages = range(1, Math.min(boundaryCount, safeTotalPages));
    const endPages = range(
      Math.max(safeTotalPages - boundaryCount + 1, boundaryCount + 1),
      safeTotalPages
    );

    const siblingStart = Math.max(
      safeCurrentPage - siblingCount,
      boundaryCount + 1
    );
    const siblingEnd = Math.min(
      safeCurrentPage + siblingCount,
      safeTotalPages - boundaryCount
    );

    const shouldShowStartEllipsis = siblingStart > boundaryCount + 1;
    const shouldShowEndEllipsis =
      siblingEnd < safeTotalPages - boundaryCount;

    // Add start boundary pages
    startPages.forEach((page) => {
      items.push({ type: 'page', page, key: `page-${page}` });
    });

    // Add start ellipsis
    if (shouldShowStartEllipsis) {
      items.push({
        type: 'ellipsis-start',
        page: siblingStart - 1,
        key: 'ellipsis-start',
      });
    }

    // Add sibling pages
    if (siblingStart <= siblingEnd) {
      range(siblingStart, siblingEnd).forEach((page) => {
        if (page > boundaryCount && page <= safeTotalPages - boundaryCount) {
          items.push({ type: 'page', page, key: `page-${page}` });
        }
      });
    }

    // Add end ellipsis
    if (shouldShowEndEllipsis) {
      items.push({
        type: 'ellipsis-end',
        page: siblingEnd + 1,
        key: 'ellipsis-end',
      });
    }

    // Add end boundary pages
    endPages.forEach((page) => {
      if (page > boundaryCount) {
        items.push({ type: 'page', page, key: `page-${page}` });
      }
    });

    // Deduplicate and sort
    const uniqueItems = items.filter(
      (item, index, self) =>
        index === self.findIndex((t) => t.key === item.key)
    );

    return uniqueItems.sort((a, b) => a.page - b.page);
  }, [safeCurrentPage, safeTotalPages, siblingCount, boundaryCount]);

  if (safeTotalPages <= 1) return null;

  return (
    <nav
      aria-label={ariaLabel}
      className={`pagination ${className}`.trim()}
      role="navigation"
    >
      <ul className="pagination-list" style={{ listStyle: 'none', padding: 0, display: 'flex', gap: '4px', alignItems: 'center', margin: 0 }}>
        {/* Previous button */}
        <li>
          <button
            type="button"
            onClick={() => handlePageChange(safeCurrentPage - 1)}
            disabled={disabled || safeCurrentPage === 1}
            aria-label="Previous page"
            className="pagination-button pagination-previous"
          >
            &laquo; Prev
          </button>
        </li>

        {/* Page items */}
        {pageItems.map((item) => {
          if (item.type === 'ellipsis-start' || item.type === 'ellipsis-end') {
            return (
              <li key={item.key}>
                <span
                  className="pagination-ellipsis"
                  aria-hidden="true"
                  style={{ padding: '4px 8px', userSelect: 'none' }}
                >
                  &hellip;
                </span>
              </li>
            );
          }

          const isActive = item.page === safeCurrentPage;
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => handlePageChange(item.page)}
                disabled={disabled}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`Page ${item.page}`}
                className={`pagination-button ${isActive ? 'pagination-button-active' : ''}`.trim()}
                style={{
                  fontWeight: isActive ? 'bold' : 'normal',
                  backgroundColor: isActive ? '#e0e0e0' : 'transparent',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                {item.page}
              </button>
            </li>
          );
        })}

        {/* Next button */}
        <li>
          <button
            type="button"
            onClick={() => handlePageChange(safeCurrentPage + 1)}
            disabled={disabled || safeCurrentPage === safeTotalPages}
            aria-label="Next page"
            className="pagination-button pagination-next"
          >
            Next &raquo;
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;