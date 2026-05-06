import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'app',
  publicDir: '../public',
  plugins: [react()],
  base: '/cdeKingGeorge/',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
});
