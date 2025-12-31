/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';
import pkg from './package.json';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';

  return {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [
      vue(),
      VitePWA({
        registerType: 'prompt', // تم التغيير من autoUpdate لضمان تحكم أفضل في التحديثات وعدم فقدان البيانات
        injectRegister: 'auto',
        workbox: {
          cleanupOutdatedCaches: true,
          // تضمين كافة الملفات الضرورية للعمل أوفلاين عند الريفرش
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, 
          // هذا الإعداد بالغ الأهمية لنجاح عملية الـ Refresh أوفلاين
          navigateFallback: 'index.html',
          navigateFallbackAllowlist: [/^(?!\/__).*/], // السماح بكافة المسارات ما عدا مسارات النظام الداخلية
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
              handler: 'NetworkFirst', 
              options: {
                cacheName: 'supabase-api-cache',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 500,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // كاش لملفات الخطوط والأيقونات (FontAwesome & Google Fonts)
              urlPattern: /^https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'external-resources-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
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
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-vue': ['vue', 'vue-router', 'pinia'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-utils': ['sweetalert2', 'localforage']
          }
        }
      }
    },
    server: {
      port: 3001,
      host: true,
    }
  };
});
