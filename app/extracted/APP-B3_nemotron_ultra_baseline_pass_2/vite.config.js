// Vite Config for Electron Renderer
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'renderer',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});