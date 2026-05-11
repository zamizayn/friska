import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/admin': {
        target: 'https://friska-api.farmora.in',
        changeOrigin: true
      }
    }
  }
});
