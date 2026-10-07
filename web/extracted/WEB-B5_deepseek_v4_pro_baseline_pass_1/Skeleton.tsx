import React from 'react';

interface SkeletonProps {
  /** Number of skeleton lines to render */
  lines?: number;
  /** Height of each skeleton line in pixels */
  lineHeight?: number;
  /** Gap between lines in pixels */
  gap?: number;
  /** Optional className for the container */
  className?: string;
  /** Optional className for individual lines */
  lineClassName?: string;
  /** Whether to show a circular avatar placeholder */
  showAvatar?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({
  lines = 3,
  lineHeight = 16,
  gap = 12,
  className = '',
  lineClassName = '',
  showAvatar = false,
}) => {
  return (
    <div
      className={`w-full animate-pulse ${className}`}
      role="status"
      aria-label="Loading content"
      aria-busy="true"
    >
      {showAvatar && (
        <div className="flex items-center gap-4 mb-4">
          <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700 shimmer" />
            <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-gray-700 shimmer" />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`shimmer rounded bg-gray-200 dark:bg-gray-700 ${
              index === lines - 1 ? 'w-2/3' : 'w-full'
            } ${lineClassName}`}
            style={{ height: `${lineHeight}px` }}
          />
        ))}
      </div>

      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Skeleton;