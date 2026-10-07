@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }

  * {
    @apply border-gray-200 dark:border-gray-700;
  }

  body {
    @apply bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 antialiased;
  }

  html {
    scroll-behavior: smooth;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}