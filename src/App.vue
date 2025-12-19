<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue';
import { initializeSyncListener } from '@/services/archiveSyncQueue';
import logger from '@/utils/logger';

// عند بدء تشغيل التطبيق بالكامل
onMounted(() => {
  logger.info('🚀 App Mounted - System Initialized');
  
  // تشغيل مستمع المزامنة التلقائية
  // هذا يضمن أنه لو فتح المستخدم التطبيق وكان هناك بيانات معلقة (Offline Data)
  // سيتم رفعها تلقائياً بمجرد استشعار الإنترنت
  initializeSyncListener();
});
</script>

<style>
/* يمكن وضع التنسيقات العالمية هنا إذا لزم الأمر، 
  ولكن يفضل الاعتماد على ملفات CSS الموجودة في assets/css 
  التي تم استدعاؤها في main.js
*/
</style>