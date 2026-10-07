"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
  className?: string;
}

export function Skeleton({ lines = 3, className, ...props }: SkeletonProps) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse",
            i === lines - 1 && "w-3/4",
            "w-full"
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6 space-y-4", className)} {...props}>
      <div className="h-6 w-1/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <Skeleton lines={4} />
      <div className="h-10 w-1/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { rows?: number; columns?: number }) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, col) => (
            <div key={col} className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}