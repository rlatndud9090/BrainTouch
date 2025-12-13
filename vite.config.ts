import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // 상대 경로로 빌드 (앱인토스 웹뷰 호환)
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    target: 'es2015',
  },
});
