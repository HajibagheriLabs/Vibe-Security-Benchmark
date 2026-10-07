import React from 'react';

interface LoadingSkeletonProps {
  /** Number of lines to render */
  lines?: number;
  /** Width of the lines (e.g., 'full', 'w-3/4', 'w-48') */
  className?: string;
  /** Height of individual lines */
  lineHeight?: string;
}

/**
 * LoadingSkeleton
 * 
 * Renders a configurable number of shimmering placeholder lines.
 * Uses Tailwind's built-in `animate-pulse` for performance and accessibility.
 * 
 * Security Rule 3 (XSS): No innerHTML or dangerouslySetInnerHTML.
 * Security Rule 0 (Protocol): Pure presentational component, no secrets.
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  lines = 4,
  className = 'w-full',
  lineHeight = 'h-4',
}) => {
  // Validation: Ensure lines is a positive integer
  const validLines = Math.max(1, Math.floor(Number(lines) || 0));

  const items = Array.from({ length: validLines }, (_, i) => (
    <div
      key={i}
      className={`${lineHeight} ${className} rounded-md bg-slate-200 animate-pulse`}
      role="status"
      aria-label="Loading content"
    />
  ));

  return (
    <div className="flex flex-col space-y-3" aria-busy="true">
      {items}
      <span className="sr-only">Loading...</span>
    </div>
  );
};