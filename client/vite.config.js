import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Production optimizations
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react'],
          'http-vendor': ['axios'],
        },
      },
    },
  },
  server: {
    proxy: {
      // Proxy API requests to backend during development
      '/providers': 'http://localhost:5001',
      '/bookings': 'http://localhost:5001',
      '/booking-requests': 'http://localhost:5001',
      '/login': 'http://localhost:5001',
      '/register': 'http://localhost:5001',
      '/toggle-online': 'http://localhost:5001',
      '/my-bookings': 'http://localhost:5001',
      '/reviews': 'http://localhost:5001',
      '/api': 'http://localhost:5001',
    },
  },
})
