// @ts-check
import { defineConfig, defaultClientConditions } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Read @msl/shared straight from its TypeScript source (see its "exports").
  resolve: { conditions: ['source', ...defaultClientConditions] },
  server: {
    port: 5173,
    // Same-origin in dev: the browser talks to Vite, Vite proxies /api to the API.
    proxy: { '/api': 'http://localhost:4000' },
  },
});
