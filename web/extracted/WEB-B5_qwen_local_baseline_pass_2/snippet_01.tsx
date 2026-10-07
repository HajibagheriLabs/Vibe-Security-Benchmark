import React from 'react';

interface LoadingSkeletonProps {
  /** Number of lines to render. Defaults to 4. */
  lineCount?: number;
  /** Width of the lines. Accepts any valid CSS width value. Defaults to '100%'. */
  width?: string;
  /** Height of each line in pixels. Defaults to 16. */
  lineHeight?: number;
  /** Spacing between lines in pixels. Defaults to 8. */
  gap?: number;
  /** Optional class names for the container. */
  containerClassName?: string;
  /** Optional class names for the lines. */
  lineClassName?: string;
}

/**
 * A reusable loading skeleton component with a shimmer animation.
 * Uses Tailwind CSS classes. Ensure the Tailwind config includes the 'shimmer' keyframe.
 */
const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  lineCount = 4,
  width = '100%',
  lineHeight = 16,
  gap = 8,
  containerClassName = '',
  lineClassName = '',
}) => {
  const lines = Array.from({ length: lineCount });

  return (
    <div
      className={`flex flex-col ${containerClassName}`}
      style={{
        width,
        gap: `${gap}px`,
      }}
    >
      {lines.map((_, index) => (
        <div
          key={index}
          className={`h-4 rounded-md bg-gray-200 animate-shimmer ${lineClassName}`}
          style={{
            height: `${lineHeight}px`,
            // Make the last line narrower to simulate text alignment, or keep full width
            width: index === lineCount - 1 ? '75%' : '100%',
          }}
        />
      ))}
    </div>
  );
};

export default LoadingSkeleton;