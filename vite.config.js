import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    // تعريف متغيرات البيئة للوصول إليها في المتصفح
    'process.env': process.env
  }
});