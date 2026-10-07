import React from 'react';
import PropTypes from 'prop-types';

const SkeletonShimmer = ({ 
  lines = 3, 
  className = '', 
  lineClassName = '',
  shimmerColor = 'via-gray-100',
  baseColor = 'bg-gray-200'
}) => {
  return (
    <div 
      className={`w-full space-y-3 ${className}`}
      role="status"
      aria-label="Loading content"
      aria-busy="true"
    >
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`relative h-4 overflow-hidden rounded ${baseColor} ${
            index === lines - 1 ? 'w-2/3' : 'w-full'
          } ${lineClassName}`}
        >
          <div 
            className={`absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent ${shimmerColor} to-transparent`}
          />
        </div>
      ))}
      
      <span className="sr-only">Loading...</span>
    </div>
  );
};

SkeletonShimmer.propTypes = {
  lines: PropTypes.number,
  className: PropTypes.string,
  lineClassName: PropTypes.string,
  shimmerColor: PropTypes.string,
  baseColor: PropTypes.string
};

export default SkeletonShimmer;