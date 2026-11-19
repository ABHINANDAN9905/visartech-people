import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: false
  },
  build: {
    // Raise warning threshold to 600 kB; vendors chunk will still be below
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — cached aggressively by browsers
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Chart / visualisation library (if present)
          'vendor-charts': ['recharts'],
        },
      },
    },
  },
});
