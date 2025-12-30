import { defineStore } from 'pinia';
import { ref } from 'vue';
import localforage from 'localforage';
import { QUEUE_KEY } from '@/services/archiveSyncQueue';

export const useSyncStore = defineStore('sync', () => {
  const isOnline = ref(navigator.onLine);
  const queueLength = ref(0);
  
  // Status: 'synced' (green), 'pending' (yellow), 'offline' (red)
  const syncStatus = ref('synced'); 

  function updateStatus() {
    isOnline.value = navigator.onLine;

    if (!isOnline.value) {
      syncStatus.value = 'offline';
    } else if (queueLength.value > 0) {
      syncStatus.value = 'pending';
    } else {
      syncStatus.value = 'synced';
    }
  }

  async function checkQueue() {
    try {
      const queue = (await localforage.getItem(QUEUE_KEY)) || [];
      queueLength.value = queue.length;
      updateStatus();
    } catch (err) {
      // ignore
    }
  }

  // Listeners
  window.addEventListener('online', () => {
    isOnline.value = true;
    checkQueue();
  });

  window.addEventListener('offline', () => {
    isOnline.value = false;
    updateStatus();
  });

  // Call this whenever queue changes
  return {
    isOnline,
    queueLength,
    syncStatus,
    checkQueue,
    updateStatus
  };
});
