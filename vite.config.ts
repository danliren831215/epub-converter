import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base 使用相对路径，保证既能部署在根域名，也能部署在 GitHub Pages 的子路径下
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 900,
  },
});
