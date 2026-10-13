/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_PORT = Number(process.env.API_PORT) || 8787;
const apiProxy = { '/api': { target: `http://localhost:${API_PORT}`, changeOrigin: false } };

// GitHub Pages serves the site under /Doodav/. Locally and on other hosts it is the root.
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/Doodav/' : '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: apiProxy,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
    proxy: apiProxy,
  },
  test: {
    environment: 'node',
    include: ['shared/**/*.test.ts', 'server/**/*.test.ts'],
  },
});
