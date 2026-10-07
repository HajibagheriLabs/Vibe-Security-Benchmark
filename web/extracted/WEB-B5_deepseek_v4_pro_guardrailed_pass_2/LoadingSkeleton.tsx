// LoadingSkeleton.tsx
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  /** Number of skeleton lines to render */
  lines?: number;
  /** Optional custom className for the container */
  className?: string;
  /** Optional custom className for each line */
  lineClassName?: string;
  /** Height of each line in pixels */
  lineHeight?: number;
  /** Gap between lines in pixels */
  gap?: number;
  /** Whether to show a circular avatar placeholder */
  showAvatar?: boolean;
  /** Whether to show a title line (wider than body lines) */
  showTitle?: boolean;
  /** Whether to show a footer line (shorter than body lines) */
  showFooter?: boolean;
  /** Accessibility label for screen readers */
  ariaLabel?: string;
}

/**
 * A configurable loading skeleton component with shimmer animation.
 * Uses Tailwind CSS for styling and animation.
 */
export function LoadingSkeleton({
  lines = 3,
  className,
  lineClassName,
  lineHeight = 16,
  gap = 8,
  showAvatar = false,
  showTitle = true,
  showFooter = false,
  ariaLabel = "Loading content",
}: LoadingSkeletonProps) {
  // Build the array of line widths based on configuration
  const lineWidths: string[] = [];

  if (showTitle) {
    lineWidths.push("w-3/4");
  }

  for (let i = 0; i < lines; i++) {
    // Alternate between full width and slightly shorter lines for visual variety
    lineWidths.push(i % 2 === 0 ? "w-full" : "w-5/6");
  }

  if (showFooter) {
    lineWidths.push("w-1/2");
  }

  return (
    <div
      className={cn("flex items-start gap-4", className)}
      role="status"
      aria-label={ariaLabel}
      aria-busy="true"
    >
      {showAvatar && (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-200">
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
      )}

      <div
        className="flex flex-1 flex-col"
        style={{ gap: `${gap}px` }}
      >
        {lineWidths.map((width, index) => (
          <div
            key={index}
            className={cn(
              "relative overflow-hidden rounded bg-gray-200",
              width,
              lineClassName
            )}
            style={{ height: `${lineHeight}px` }}
          >
            {/* Shimmer overlay */}
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          </div>
        ))}
      </div>

      {/* Visually hidden text for screen readers */}
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}