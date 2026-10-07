/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --font-inter: "Inter", system-ui, sans-serif;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    @apply text-gray-900;
  }

  * {
    @apply border-gray-200;
  }
}

@layer utilities {
  .focus-ring {
    @apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
  }
}