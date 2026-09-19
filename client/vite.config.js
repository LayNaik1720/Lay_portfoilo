import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Preview environments serve the app from a dynamic sandbox hostname.
    allowedHosts: true,
    // Browser-facing code calls /api relatively; Vite proxies it to Express so
    // the client never needs to know the backend's host.
    proxy: {
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/sitemap.xml': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/robots.txt': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:4000', changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split vendor code so the initial bundle stays small.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
