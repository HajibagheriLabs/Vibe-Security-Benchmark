import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
  variant?: 'text' | 'card' | 'circular' | 'rectangular';
  className?: string;
}

export function Skeleton({
  lines = 3,
  variant = 'text',
  className,
  ...props
}: SkeletonProps) {
  const baseStyles = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded';

  const variantStyles = {
    text: 'h-4 w-full',
    card: 'h-32 w-full',
    circular: 'h-12 w-12 rounded-full',
    rectangular: 'h-20 w-full rounded-lg',
  };

  if (variant !== 'text') {
    return (
      <div
        className={cn(baseStyles, variantStyles[variant], className)}
        {...props}
      />
    );
  }

  return (
    <div className={cn('space-y-3', className)} {...props}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={cn(
            baseStyles,
            variantStyles.text,
            index === lines - 1 && 'w-3/4'
          )}
        />
      ))}
    </div>
  );
}

interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
  hasImage?: boolean;
  hasAction?: boolean;
  className?: string;
}

export function SkeletonCard({
  lines = 3,
  hasImage = true,
  hasAction = true,
  className,
  ...props
}: SkeletonCardProps) {
  return (
    <div className={cn('rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4', className)} {...props}>
      {hasImage && (
        <div className={cn(baseStyles, 'h-32 w-full rounded-lg')} />
      )}
      <div className="space-y-3">
        <div className={cn(baseStyles, 'h-6 w-3/4')} />
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              baseStyles,
              'h-4 w-full',
              index === lines - 1 && 'w-5/6'
            )}
          />
        ))}
      </div>
      {hasAction && (
        <div className="flex items-center justify-end gap-2 pt-2">
          <div className={cn(baseStyles, 'h-8 w-20 rounded-md')} />
          <div className={cn(baseStyles, 'h-8 w-24 rounded-md bg-primary/20')} />
        </div>
      )}
    </div>
  );
}

interface SkeletonListProps {
  count?: number;
  lines?: number;
  hasAvatar?: boolean;
  hasAction?: boolean;
  className?: string;
}

export function SkeletonList({
  count = 5,
  lines = 2,
  hasAvatar = true,
  hasAction = false,
  className,
}: SkeletonListProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-start gap-4">
          {hasAvatar && (
            <div className={cn(baseStyles, 'h-12 w-12 rounded-full flex-shrink-0')} />
          )}
          <div className="flex-1 min-w-0 space-y-2">
            <div className={cn(baseStyles, 'h-5 w-1/4')} />
            {Array.from({ length: lines }).map((_, lineIndex) => (
              <div
                key={lineIndex}
                className={cn(
                  baseStyles,
                  'h-4 w-full',
                  lineIndex === lines - 1 && 'w-3/4'
                )}
              />
            ))}
            {hasAction && (
              <div className={cn(baseStyles, 'h-8 w-24 rounded-md mt-2')} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  hasHeader?: boolean;
  className?: string;
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  hasHeader = true,
  className,
}: SkeletonTableProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        {hasHeader && (
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="p-3 text-left">
                  <div className={cn(baseStyles, 'h-4 w-3/4')} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="p-3">
                  <div className={cn(baseStyles, 'h-4 w-full')} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const baseStyles = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded';