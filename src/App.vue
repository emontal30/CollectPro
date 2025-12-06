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

// Cleanup handler for page visibility changes
let visibilityCleanup = null;

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

// Fallback: Watch for authentication state and redirect if needed
watch(() => authStore.user, (newUser, oldUser) => {
  if (newUser && !oldUser && (route.path === '/' || route.path === '/login')) {
    console.log('User authenticated, performing redirect...');
    router.push('/app/dashboard');
  }
});

onMounted(() => {
  console.log('App mounted, initializing auth and stores...');

  // Initialize auth asynchronously (non-blocking)
  authStore.initializeAuth().catch(error => {
    console.error('Auth initialization failed:', error);
    // Don't block UI for auth errors
  });

  // Initialize other stores immediately (non-blocking)
  if (uiStore?.loadFromLocalStorage) {
    uiStore.loadFromLocalStorage();
  }

  if (settingsStore?.loadSettings) {
    settingsStore.loadSettings();
  }

  updateBodyClass(route.name);

  // Simplified page visibility handler (no looping)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      console.log('Page became visible');
      // Only check auth state when actually needed
      if (authStore.user === null && authStore.isLoading === false) {
        authStore.getUser().catch(console.error);
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
  visibilityCleanup = () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };

  document.body.classList.add('loaded');
  console.log('App initialization complete');
});

onUnmounted(() => {
  // Cleanup event listeners
  if (visibilityCleanup) {
    visibilityCleanup();
  }

  // Stop all monitoring systems
  authStore.stopSessionMonitoring?.();
  authStore.stopActivityTracking?.();

  // Cleanup page tracker
  if (window.pageTracker?.cleanup) {
    window.pageTracker.cleanup();
  }
});
</script>

<style>
/* Global styles are imported in main.js */
</style>