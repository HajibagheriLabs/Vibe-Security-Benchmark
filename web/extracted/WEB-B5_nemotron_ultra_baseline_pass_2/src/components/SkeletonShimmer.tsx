import React from 'react';
import { cn } from '@/lib/utils';

interface ShimmerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  speed?: 'slow' | 'normal' | 'fast';
  direction?: 'ltr' | 'rtl' | 'ttb' | 'btt';
}

export function Shimmer({
  className,
  speed = 'normal',
  direction = 'ltr',
  children,
  ...props
}: ShimmerProps) {
  const speedClasses = {
    slow: 'duration-2000',
    normal: 'duration-1500',
    fast: 'duration-1000',
  };

  const directionClasses = {
    ltr: 'bg-gradient-to-r from-transparent via-white/60 to-transparent',
    rtl: 'bg-gradient-to-l from-transparent via-white/60 to-transparent',
    ttb: 'bg-gradient-to-b from-transparent via-white/60 to-transparent',
    btt: 'bg-gradient-to-t from-transparent via-white/60 to-transparent',
  };

  const animateClasses = {
    ltr: 'animate-shimmer-ltr',
    rtl: 'animate-shimmer-rtl',
    ttb: 'animate-shimmer-ttb',
    btt: 'animate-shimmer-btt',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        speedClasses[speed],
        directionClasses[direction],
        animateClasses[direction],
        className
      )}
      {...props}
    >
      {children}
      <div
        className={cn(
          'absolute inset-0',
          'bg-gradient-to-r from-transparent via-white/40 to-transparent',
          '[background-size:200%_100%]',
          animateClasses[direction],
          speedClasses[speed]
        )}
        aria-hidden="true"
      />
    </div>
  );
}

interface ShimmerTextProps {
  lines?: number;
  className?: string;
  lineHeight?: number;
}

export function ShimmerText({
  lines = 3,
  className,
  lineHeight = 1.5,
}: ShimmerTextProps) {
  return (
    <div className={cn('space-y-2', className)} style={{ lineHeight }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Shimmer
          key={index}
          className="h-4 w-full rounded"
          style={{
            width: index === lines - 1 ? '70%' : '100%',
          }}
        />
      ))}
    </div>
  );
}

interface ShimmerCardProps {
  hasImage?: boolean;
  lines?: number;
  hasAction?: boolean;
  className?: string;
}

export function ShimmerCard({
  hasImage = true,
  lines = 3,
  hasAction = true,
  className,
}: ShimmerCardProps) {
  return (
    <Shimmer className={cn('rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4', className)}>
      {hasImage && (
        <div className="h-32 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
      )}
      <div className="space-y-3">
        <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"
            style={{ width: index === lines - 1 ? '80%' : '100%' }}
          />
        ))}
      </div>
      {hasAction && (
        <div className="flex items-center justify-end gap-2 pt-2">
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-md" />
          <div className="h-8 w-24 bg-primary/20 rounded-md" />
        </div>
      )}
    </Shimmer>
  );
}