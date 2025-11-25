import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        admin: resolve(__dirname, 'admin.html'),
        harvest: resolve(__dirname, 'harvest.html'),
        counter: resolve(__dirname, 'counter.html'),
        archive: resolve(__dirname, 'archive.html'),
        subscriptions: resolve(__dirname, 'subscriptions.html'),
        'my-subscription': resolve(__dirname, 'my-subscription.html'),
        payment: resolve(__dirname, 'payment.html'),
      },
      external: ['install-prompt.js'],
    },
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2015',
  },
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  publicDir: 'public',
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg', '**/*.ico', '**/*.webmanifest'],
});