<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { useRoute, useRouter } from 'vue-router';

const authStore = useAuthStore();
const uiStore = useUIStore();
const settingsStore = useSettingsStore();
const route = useRoute();
const router = useRouter();

// مراقبة التبديل بين الصفحات
let pageVisibilityHandler = null;
let beforeUnloadHandler = null;

// Function to update body class based on route
function updateBodyClass(routeName) {
  document.body.classList.remove('harvest-page', 'archive-page');
  if (routeName === 'harvest') {
    document.body.classList.add('harvest-page');
  } else if (routeName === 'archive') {
    document.body.classList.add('archive-page');
  }
}

// Watch for route changes
watch(() => route.name, (newName) => {
  updateBodyClass(newName);
});

onMounted(async () => {
  console.log('App mounted, initializing...')

  // NON-BLOCKING: Initialize auth without await to prevent UI freeze
  const authInitPromise = authStore.initializeAuth().catch(error => {
    console.error('Auth initialization failed:', error);
  });

  // Load other stores immediately (non-blocking)
  if (uiStore && uiStore.loadFromLocalStorage) {
    uiStore.loadFromLocalStorage()
  }

  if (settingsStore && settingsStore.loadSettings) {
    settingsStore.loadSettings()
  }

  updateBodyClass(route.name);

  pageVisibilityHandler = () => {
    console.log('Page became visible');
  };

  beforeUnloadHandler = () => {
    if (authStore.stopSessionMonitoring) {
      authStore.stopSessionMonitoring();
    }
  };

  document.addEventListener('visibilitychange', pageVisibilityHandler);
  window.addEventListener('beforeunload', beforeUnloadHandler);

  document.body.classList.add('loaded')
  console.log('App initialization complete, body should be visible now')

  // Optionally wait for auth to complete if needed
  // await authInitPromise;
})

onUnmounted(() => {
  // تنظيف مستمعي الأحداث
  if (pageVisibilityHandler) {
    document.removeEventListener('visibilitychange', pageVisibilityHandler);
  }
  if (beforeUnloadHandler) {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
  }

  // إيقاف المراقبة
  authStore.stopSessionMonitoring?.();
  authStore.stopActivityTracking?.();

  // تنظيف page tracker
  if (window.pageTracker && window.pageTracker.cleanup) {
    window.pageTracker.cleanup();
  }
})
</script>

<style>
/* Global styles are imported in main.js */
</style>