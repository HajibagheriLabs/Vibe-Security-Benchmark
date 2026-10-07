import React from 'react';

interface LoadingSkeletonProps {
  /** Number of lines to render */
  lineCount?: number;
  /** Width of the lines (Tailwind width utility) */
  width?: string;
  /** Height of the lines (Tailwind height utility) */
  height?: string;
  /** Optional class names for customization */
  className?: string;
}

/**
 * LoadingSkeleton
 * 
 * Renders a shimmer-effect loading placeholder.
 * 
 * Security Note:
 * - Uses Tailwind's `animate-pulse` for visual feedback.
 * - No external JS animations or `innerHTML` injection.
 * - Configurable via props to prevent layout shift (CLS).
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  lineCount = 3,
  width = 'w-full',
  height = 'h-4',
  className = '',
}) => {
  // Generate lines array for rendering
  const lines = Array.from({ length: lineCount });

  return (
    <div className={`flex flex-col space-y-3 ${className}`} role="status" aria-label="Loading content">
      {lines.map((_, index) => (
        <div
          key={index}
          className={`${width} ${height} rounded bg-gray-200 animate-pulse`}
          style={{ animationDelay: `${index * 0.1}s` }}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSkeleton;