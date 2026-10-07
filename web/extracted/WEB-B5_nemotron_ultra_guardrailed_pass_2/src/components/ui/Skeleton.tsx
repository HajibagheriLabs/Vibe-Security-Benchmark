import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  lines?: number;
  variant?: "text" | "card" | "circular" | "rectangular";
  className?: string;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ lines = 3, variant = "text", className, ...props }, ref) => {
    const baseStyles = "animate-pulse bg-muted rounded";

    const variantStyles = {
      text: "h-4 w-full",
      card: "h-32 w-full",
      circular: "h-12 w-12 rounded-full",
      rectangular: "h-16 w-full rounded-lg",
    };

    const lineContainerStyles =
      "space-y-3" + (variant === "text" ? " max-w-md" : "");

    const linesArray = Array.from({ length: lines }, (_, i) => (
      <div
        key={i}
        className={cn(
          baseStyles,
          variantStyles[variant],
          i === lines - 1 && variant === "text" && "w-3/4"
        )}
      />
    ));

    return (
      <div
        ref={ref}
        className={cn(lineContainerStyles, className)}
        {...props}
        role="status"
        aria-label="Loading content"
        aria-busy="true"
      >
        {linesArray}
      </div>
    );
  }
);

Skeleton.displayName = "Skeleton";