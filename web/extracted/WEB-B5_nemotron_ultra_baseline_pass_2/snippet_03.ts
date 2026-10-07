@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  .animate-shimmer-ltr {
    animation: shimmer-ltr 1.5s ease-in-out infinite;
  }

  .animate-shimmer-rtl {
    animation: shimmer-rtl 1.5s ease-in-out infinite;
  }

  .animate-shimmer-ttb {
    animation: shimmer-ttb 1.5s ease-in-out infinite;
  }

  .animate-shimmer-btt {
    animation: shimmer-btt 1.5s ease-in-out infinite;
  }

  @keyframes shimmer-ltr {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  @keyframes shimmer-rtl {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  @keyframes shimmer-ttb {
    0% {
      background-position: 0 -200%;
    }
    100% {
      background-position: 0 200%;
    }
  }

  @keyframes shimmer-btt {
    0% {
      background-position: 0 200%;
    }
    100% {
      background-position: 0 -200%;
    }
  }

  .animate-pulse-slow {
    animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .animate-pulse-fast {
    animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
}

@layer components {
  .skeleton-base {
    @apply bg-gray-200 dark:bg-gray-700 rounded animate-pulse;
  }

  .skeleton-text {
    @apply skeleton-base h-4 w-full;
  }

  .skeleton-text-last {
    @apply skeleton-text w-3/4;
  }

  .skeleton-avatar {
    @apply skeleton-base h-12 w-12 rounded-full;
  }

  .skeleton-image {
    @apply skeleton-base h-32 w-full rounded-lg;
  }

  .skeleton-card {
    @apply rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4;
  }

  .skeleton-button {
    @apply skeleton-base h-8 w-24 rounded-md;
  }

  .skeleton-button-primary {
    @apply skeleton-button bg-primary/20;
  }
}