import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    // تعريف متغيرات البيئة للوصول إليها في المتصفح
    'process.env': process.env
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        dashboard: './dashboard.html',
        harvest: './harvest.html',
        archive: './archive.html',
        admin: './admin.html',
        subscriptions: './subscriptions.html',
        'my-subscription': './my-subscription.html',
        payment: './payment.html'
      }
    }
  }
});