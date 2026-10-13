/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API server (npm run dev:api) listens here. Vite forwards /api to it so
// the phone only ever talks to one origin, which keeps HTTPS tunnels simple.
const API_PORT = Number(process.env.API_PORT) || 8787;
const apiProxy = { '/api': { target: `http://localhost:${API_PORT}`, changeOrigin: false } };

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // reachable from your phone on the Wi-Fi network
    port: 5173,
    allowedHosts: true, // accept tunnel hostnames such as *.trycloudflare.com and *.ngrok-free.app
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
