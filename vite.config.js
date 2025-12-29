/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';

  return {
    plugins: [
      vue(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        devOptions: {
          enabled: true,
          type: 'module',
        },
        workbox: {
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, 
          navigateFallback: 'index.html',
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
              // تم تغيير الاستراتيجية من StaleWhileRevalidate إلى NetworkFirst
              // لضمان دقة البيانات المالية (التحصيلات) وتجنب رؤية بيانات قديمة
              handler: 'NetworkFirst', 
              options: {
                cacheName: 'supabase-api-cache',
                networkTimeoutSeconds: 10, // الانتظار لمدة 10 ثوانٍ قبل العودة للكاش في حالة ضعف الشبكة
                expiration: {
                  maxEntries: 500,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
            {
               urlPattern: /\.(?:png|jpg|jpeg|svg|gif|woff2?|ttf|eot)$/,
               handler: 'CacheFirst',
               options: {
                  cacheName: 'assets-cache',
                  expiration: {
                     maxEntries: 200,
                     maxAgeSeconds: 30 * 24 * 60 * 60,
                  },
               },
            }
          ],
        },
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
            { src: 'manifest/icon-48x48.png', sizes: '48x48', type: 'image/png', purpose: 'any' },
            { src: 'manifest/icon-72x72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
            { src: 'manifest/icon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
            { src: 'manifest/icon-144x144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
            { src: 'manifest/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: 'manifest/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
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
      sourcemap: !isProd,
      minify: 'esbuild',
      target: 'es2020',
    },
    server: {
      port: 3001,
      host: true,
    }
  };
});
