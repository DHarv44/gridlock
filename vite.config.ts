import { defineConfig } from 'vite';

const SERVER_PORT = Number(process.env.GRIDLOCK_PORT ?? 5228);

export default defineConfig({
  root: 'src/client',
  publicDir: false,
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 5229,
    strictPort: true,
    host: true,
    proxy: {
      '/ws': { target: `ws://localhost:${SERVER_PORT}`, ws: true },
      '/api': { target: `http://localhost:${SERVER_PORT}` },
      '/radio': { target: `http://localhost:${SERVER_PORT}` },
      '/soundtrack': { target: `http://localhost:${SERVER_PORT}` },
    },
  },
});
