// LoadingSkeleton.example.tsx
import React from 'react';
import LoadingSkeleton from './LoadingSkeleton';

/**
 * Example usage of LoadingSkeleton component
 */
const LoadingSkeletonExample: React.FC = () => {
  return (
    <div className="space-y-8 p-6">
      {/* Default usage - 3 lines */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold mb-2">Default (3 lines)</h3>
        <LoadingSkeleton />
      </div>

      {/* Custom line count */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold mb-2">5 lines</h3>
        <LoadingSkeleton lineCount={5} />
      </div>

      {/* Custom styling */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold mb-2">Custom styling</h3>
        <LoadingSkeleton
          lineCount={4}
          lineHeight={20}
          gap={12}
          className="max-w-md"
          lineClassName="bg-blue-100 dark:bg-blue-900"
        />
      </div>

      {/* Card-like skeleton */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold mb-2">Card skeleton</h3>
        <div className="border rounded-lg p-4">
          <LoadingSkeleton
            lineCount={2}
            lineHeight={24}
            gap={8}
            lineClassName="bg-gray-100 dark:bg-gray-800"
          />
        </div>
      </div>
    </div>
  );
};

export default LoadingSkeletonExample;