// LoadingSkeleton.tsx
import React from 'react';

interface LoadingSkeletonProps {
  /**
   * Number of skeleton lines to render
   * @default 3
   */
  lineCount?: number;
  /**
   * Optional className for the container
   */
  className?: string;
  /**
   * Optional className for individual lines
   */
  lineClassName?: string;
  /**
   * Height of each skeleton line in pixels
   * @default 16
   */
  lineHeight?: number;
  /**
   * Gap between lines in pixels
   * @default 8
   */
  gap?: number;
}

/**
 * A loading skeleton component with configurable line count and shimmer animation.
 * Uses Tailwind CSS for styling and animation.
 */
const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  lineCount = 3,
  className = '',
  lineClassName = '',
  lineHeight = 16,
  gap = 8,
}) => {
  // Ensure lineCount is a positive integer
  const safeLineCount = Math.max(1, Math.floor(lineCount));

  return (
    <div
      className={`w-full ${className}`}
      role="status"
      aria-label="Loading content"
      aria-busy="true"
    >
      <div
        className="flex flex-col"
        style={{ gap: `${gap}px` }}
      >
        {Array.from({ length: safeLineCount }, (_, index) => (
          <div
            key={index}
            className={`
              relative
              overflow-hidden
              rounded-md
              bg-gray-200
              dark:bg-gray-700
              animate-pulse
              ${lineClassName}
            `}
            style={{ height: `${lineHeight}px` }}
          >
            {/* Shimmer overlay */}
            <div
              className="
                absolute
                inset-0
                -translate-x-full
                animate-shimmer
                bg-gradient-to-r
                from-transparent
                via-white/60
                dark:via-white/10
                to-transparent
              "
            />
          </div>
        ))}
      </div>
      {/* Screen reader only text */}
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSkeleton;