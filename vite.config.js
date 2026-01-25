/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';
import fs from 'fs';
import pkg from './package.json';

// Ensure public/manifest.json version stays in sync with package.json
try {
  const publicManifestPath = resolve(process.cwd(), 'public', 'manifest.json');
  if (fs.existsSync(publicManifestPath)) {
    const raw = fs.readFileSync(publicManifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    if (manifest.version !== pkg.version) {
      manifest.version = pkg.version;
      fs.writeFileSync(publicManifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    }
  }
} catch (err) {
  // do not block Vite if manifest update fails
  // console.warn('Could not update public/manifest.json version:', err)
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';

  return {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    esbuild: {
      drop: isProd ? ['console', 'debugger'] : [],
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
              // إعداد ذكي لطلبات Supabase: 
              // نستخدم StaleWhileRevalidate بدلاً من NetworkFirst للبيانات التي تتحمل التأخير البسيط
              // لضمان استجابة فورية للواجهة مع التحديث في الخلفية
              urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'supabase-api-cache',
                expiration: {
                  maxEntries: 1000, // زيادة عدد المدخلات لخدمة 3000 مستخدم
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 أيام
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // طلبات RPC و Auth تظل NetworkFirst ولكن بتوقيت أسرع (3 ثواني) لعدم تعليق الواجهة
              urlPattern: /^https:\/\/.*\.supabase\.co\/(?:rpc|auth)\/.*/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-rpc-auth-cache',
                networkTimeoutSeconds: 3, // تقليل وقت الانتظار من 5 لـ 3 ثواني
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60, // ساعة واحدة فقط للبيانات الحساسة
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
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // 1. Core Framework (Vue, Pinia, Router)
              if (id.includes('vue') || id.includes('pinia')) {
                return 'vendor-core';
              }
              // 2. Database & Auth (Supabase)
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              // 3. UI & Charts (SweetAlert, Charts)
              if (id.includes('chart.js') || id.includes('sweetalert2') || id.includes('vue-chartjs')) {
                return 'vendor-ui';
              }
              // 4. Utilities (LocalForage, Axios, etc.)
              return 'vendor-utils';
            }
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
