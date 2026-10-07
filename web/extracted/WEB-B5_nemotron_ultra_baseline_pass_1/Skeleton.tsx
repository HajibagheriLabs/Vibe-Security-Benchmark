import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
  lineHeight?: string | number;
  spacing?: string | number;
  animated?: boolean;
  baseColor?: string;
  highlightColor?: string;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant = 'text',
      width,
      height,
      lines = 1,
      lineHeight = '1rem',
      spacing = '0.5rem',
      animated = true,
      baseColor,
      highlightColor,
      style,
      ...props
    },
    ref
  ) => {
    const baseStyles = {
      '--skeleton-base': baseColor || 'hsl(var(--muted))',
      '--skeleton-highlight': highlightColor || 'hsl(var(--muted-foreground) / 0.1)',
    } as React.CSSProperties;

    const containerStyles: React.CSSProperties = {
      ...baseStyles,
      ...style,
    };

    if (variant === 'text' && lines > 1) {
      return (
        <div
          ref={ref}
          className={cn('space-y-2', className)}
          style={containerStyles}
          {...props}
        >
          {Array.from({ length: lines }).map((_, index) => (
            <SkeletonLine
              key={index}
              width={index === lines - 1 ? '70%' : width}
              height={lineHeight}
              animated={animated}
              baseColor={baseColor}
              highlightColor={highlightColor}
            />
          ))}
        </div>
      );
    }

    return (
      <SkeletonLine
        ref={ref}
        variant={variant}
        width={width}
        height={height}
        animated={animated}
        baseColor={baseColor}
        highlightColor={highlightColor}
        className={className}
        style={containerStyles}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

interface SkeletonLineProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animated?: boolean;
  baseColor?: string;
  highlightColor?: string;
}

const SkeletonLine = React.forwardRef<HTMLDivElement, SkeletonLineProps>(
  (
    {
      className,
      variant = 'text',
      width = '100%',
      height = '1rem',
      animated = true,
      baseColor,
      highlightColor,
      style,
      ...props
    },
    ref
  ) => {
    const lineStyles: React.CSSProperties = {
      width,
      height,
      backgroundColor: 'var(--skeleton-base)',
      borderRadius: variant === 'circular' ? '9999px' : variant === 'rectangular' ? '0.375rem' : '0.25rem',
      ...(animated && {
        backgroundImage: `
          linear-gradient(
            90deg,
            var(--skeleton-base) 25%,
            var(--skeleton-highlight) 50%,
            var(--skeleton-base) 75%
          )
        `,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
      }),
      ...style,
    };

    return (
      <div
        ref={ref}
        className={cn('overflow-hidden', className)}
        style={lineStyles}
        {...props}
      />
    );
  }
);

SkeletonLine.displayName = 'SkeletonLine';

export const SkeletonText = React.forwardRef<HTMLDivElement, Omit<SkeletonProps, 'variant' | 'lines'>>(
  ({ className, lines = 3, lineHeight = '1rem', spacing = '0.5rem', ...props }, ref) => (
    <Skeleton
      ref={ref}
      variant="text"
      lines={lines}
      lineHeight={lineHeight}
      className={cn('space-y-2', className)}
      {...props}
    />
  )
);

SkeletonText.displayName = 'SkeletonText';

export const SkeletonCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('space-y-4 p-4', className)}
      {...props}
    >
      <Skeleton variant="rectangular" width="100%" height="12rem" />
      <SkeletonText lines={2} />
      <Skeleton variant="text" width="60%" />
      <div className="flex gap-2 pt-2">
        <Skeleton variant="rectangular" width="3rem" height="2.5rem" />
        <Skeleton variant="rectangular" width="3rem" height="2.5rem" />
      </div>
    </div>
  )
);

SkeletonCard.displayName = 'SkeletonCard';

export const SkeletonAvatar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, size = '3rem', ...props }, ref) => (
    <Skeleton
      ref={ref}
      variant="circular"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      {...props}
    />
  )
);

SkeletonAvatar.displayName = 'SkeletonAvatar';

export const SkeletonButton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <Skeleton
      ref={ref}
      variant="rectangular"
      width="100%"
      height="2.5rem"
      className={cn('max-w-xs', className)}
      {...props}
    />
  )
);

SkeletonButton.displayName = 'SkeletonButton';

export const SkeletonTable = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(
  ({ className, rows = 5, columns = 4, ...props }, ref) => (
    <table ref={ref} className={cn('w-full border-collapse', className)} {...props}>
      <thead>
        <tr>
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i} className="p-3 text-left">
              <Skeleton variant="text" width="80%" height="1rem" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <td key={colIndex} className="p-3">
                <Skeleton variant="text" width="90%" height="1rem" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
);

SkeletonTable.displayName = 'SkeletonTable';

export const SkeletonList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { items?: number }>(
  ({ className, items = 5, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-3', className)} {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonAvatar size="2.5rem" />
          <div className="flex-1 space-y-1">
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" height="0.875rem" />
          </div>
        </div>
      ))}
    </div>
  )
);

SkeletonList.displayName = 'SkeletonList';