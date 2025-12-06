/// <reference types="vitest" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^\/$/],
      },
      includeAssets: [
        'favicon.ico', 
        'apple-touch-icon.png', 
        'masked-icon.svg',
        'install-prompt.js',
        'install-prompt.css'
      ],
      manifest: {
        name: 'CollectPro - نظام إدارة التحصيلات',
        short_name: 'CollectPro',
        description: 'تطبيق احترافي لإدارة التحصيلات وتتبع البيانات المالية',
        theme_color: '#007965',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'manifest/icon-48x48.png',
            sizes: '48x48',
            type: 'image/png'
          },
          {
            src: 'manifest/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: 'manifest/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: 'manifest/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png'
          },
          {
            src: 'manifest/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'manifest/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'esbuild',
    target: 'es2015',
  },
  server: {
    port: 3001,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  publicDir: 'public',
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg', '**/*.ico', '**/*.webmanifest'],
  test: {
    globals: true,
    environment: 'jsdom',
  },
});