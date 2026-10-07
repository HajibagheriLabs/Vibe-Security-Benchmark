@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  .animate-shimmer {
    animation: shimmer 1.5s ease-in-out infinite;
  }

  .skeleton-gradient {
    background: linear-gradient(
      90deg,
      hsl(var(--muted)) 25%,
      hsl(var(--muted-foreground) / 0.1) 50%,
      hsl(var(--muted)) 75%
    );
    background-size: 200% 100%;
  }
}