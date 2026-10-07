import React from 'react';
import Skeleton from './Skeleton';
import SkeletonShimmer from './SkeletonShimmer';

const Example = () => {
  return (
    <div className="p-8 space-y-8">
      {/* Basic skeleton with 3 lines */}
      <Skeleton lines={3} />
      
      {/* Skeleton with avatar and 4 lines */}
      <Skeleton 
        lines={4} 
        avatar={true} 
        avatarSize="h-16 w-16"
        className="max-w-md"
      />
      
      {/* Custom shimmer animation */}
      <SkeletonShimmer 
        lines={5} 
        className="max-w-lg"
        shimmerColor="via-blue-100"
        baseColor="bg-blue-200"
      />
      
      {/* Non-animated skeleton */}
      <Skeleton lines={2} animate={false} />
    </div>
  );
};

export default Example;