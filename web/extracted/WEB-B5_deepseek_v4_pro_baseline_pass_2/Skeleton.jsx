import React from 'react';
import PropTypes from 'prop-types';

const Skeleton = ({ 
  lines = 3, 
  className = '', 
  lineClassName = '',
  avatar = false,
  avatarSize = 'h-12 w-12',
  animate = true 
}) => {
  const shimmerClass = animate ? 'animate-pulse' : '';
  
  return (
    <div 
      className={`w-full space-y-3 ${shimmerClass} ${className}`}
      role="status"
      aria-label="Loading content"
      aria-busy="true"
    >
      {avatar && (
        <div className="flex items-center space-x-3">
          <div className={`${avatarSize} rounded-full bg-gray-200 ${lineClassName}`} />
          <div className="flex-1 space-y-2">
            <div className={`h-3 w-1/3 rounded bg-gray-200 ${lineClassName}`} />
            <div className={`h-3 w-1/4 rounded bg-gray-200 ${lineClassName}`} />
          </div>
        </div>
      )}
      
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`h-4 rounded bg-gray-200 ${
            index === lines - 1 ? 'w-2/3' : 'w-full'
          } ${lineClassName}`}
        />
      ))}
      
      <span className="sr-only">Loading...</span>
    </div>
  );
};

Skeleton.propTypes = {
  lines: PropTypes.number,
  className: PropTypes.string,
  lineClassName: PropTypes.string,
  avatar: PropTypes.bool,
  avatarSize: PropTypes.string,
  animate: PropTypes.bool
};

export default Skeleton;