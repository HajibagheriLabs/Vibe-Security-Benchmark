import React from 'react';

/**
 * LoadingSkeleton Component
 * 
 * Renders a configurable loading skeleton with a shimmer animation effect.
 * Uses Tailwind CSS for styling and animation.
 * 
 * @param {number} lines - The number of skeleton lines to render. Defaults to 3.
 * @param {string} className - Additional CSS classes for the container.
 * @param {boolean} rounded - Whether to round the corners of the lines. Defaults to true.
 */
const LoadingSkeleton = ({ lines = 3, className = '', rounded = true }) => {
  // Generate an array of line indices
  const lineIndices = Array.from({ length: lines }, (_, i) => i);

  return (
    <div className={`flex flex-col space-y-3 ${className}`}>
      {lineIndices.map((index) => (
        <div
          key={index}
          className={`w-full bg-gray-200 dark:bg-gray-700 ${
            rounded ? 'rounded' : 'rounded-none'
          } animate-pulse`}
          style={{
            // Create varying widths for a more realistic skeleton look
            width: `${100 - (index * 10)}%`,
            minHeight: '1rem',
            // Adjust height based on context if needed, defaulting to small blocks
            height: '1rem', 
          }}
        />
      ))}
    </div>
  );
};

export default LoadingSkeleton;