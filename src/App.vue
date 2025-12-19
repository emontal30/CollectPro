<template>
  <div id="app" :class="pageClasses">
    <OfflineBanner />
    <router-view />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import OfflineBanner from '@/components/ui/OfflineBanner.vue';
import { useAuthStore } from '@/stores/auth';
import { useArchiveStore } from '@/stores/archiveStore';
import { useMySubscriptionStore } from '@/stores/mySubscriptionStore';
import { initializeSyncListener } from '@/services/archiveSyncQueue';
import logger from '@/utils/logger.js';

// --- Stores & Composables ---
const authStore = useAuthStore();
const archiveStore = useArchiveStore();
const mySubscriptionStore = useMySubscriptionStore();
const route = useRoute();

// --- Local State ---
const isLoaded = ref(false);

// --- Computed: Page Classes ---
const pageClasses = computed(() => {
  const currentRoute = route.name;
  
  const classMap = {
    'Harvest': 'harvest-page',
    'Archive': 'archive-page',
    'Dashboard': 'dashboard-page',
    'Counter': 'counter-page',
    'Subscriptions': 'subscriptions-page',
    'Admin': 'admin-page',
    'MySubscription': 'my-subscription-page'
  };

  const specificClass = classMap[currentRoute] || (currentRoute ? `${currentRoute.toLowerCase()}-page` : '');

  return {
    [specificClass]: !!specificClass,
    'loaded': isLoaded.value
  };
});

// --- Lifecycle Hooks ---
onMounted(async () => {
  logger.info('🚀 App initializing...');

  try {
    // 1. Initialize Auth
    await authStore.initializeAuth();

    // 2. Initialize Archive Services
    archiveStore.cleanupOldArchives();
    initializeSyncListener();

    // 3. Initialize Subscription Store
    if(authStore.isAuthenticated) {
      mySubscriptionStore.init();
    }

    // 4. Mark App as Loaded
    setTimeout(() => {
      isLoaded.value = true;
      logger.info('✅ Application Mounted Successfully');
    }, 100);

  } catch (error) {
    logger.error('❌ Critical App Initialization Error:', error);
  }
});

onUnmounted(() => {
  logger.info('🧹 App cleaning up...');
});

</script>

<style>
/* Global styles managed in assets/css */
</style>