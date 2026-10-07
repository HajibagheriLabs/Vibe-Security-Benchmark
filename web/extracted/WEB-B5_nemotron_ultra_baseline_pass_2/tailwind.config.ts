import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        'shimmer-ltr': 'shimmer-ltr 1.5s ease-in-out infinite',
        'shimmer-rtl': 'shimmer-rtl 1.5s ease-in-out infinite',
        'shimmer-ttb': 'shimmer-ttb 1.5s ease-in-out infinite',
        'shimmer-btt': 'shimmer-btt 1.5s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'shimmer-ltr': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'shimmer-rtl': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'shimmer-ttb': {
          '0%': { backgroundPosition: '0 -200%' },
          '100%': { backgroundPosition: '0 200%' },
        },
        'shimmer-btt': {
          '0%': { backgroundPosition: '0 200%' },
          '100%': { backgroundPosition: '0 -200%' },
        },
      },
    },
  },
  plugins: [],
};

export default config;