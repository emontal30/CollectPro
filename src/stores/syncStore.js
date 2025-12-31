import { defineStore } from 'pinia';
import { ref } from 'vue';
import localforage from 'localforage';
import { QUEUE_KEY } from '@/services/archiveSyncQueue';

export const useSyncStore = defineStore('sync', () => {
  const isOnline = ref(navigator.onLine);
  const queueLength = ref(0);
  
  // الحالة الابتدائية تعتمد على حالة الاتصال الحالية فوراً
  const syncStatus = ref(navigator.onLine ? 'synced' : 'offline'); 

  /**
   * تحديث الحالة بناءً على الاتصال ووجود بيانات معلقة
   */
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

  /**
   * فحص طابور المزامنة وتحديث الحالة
   */
  async function checkQueue() {
    try {
      const queue = (await localforage.getItem(QUEUE_KEY)) || [];
      queueLength.value = queue.length;
      updateStatus();
    } catch (err) {
      updateStatus(); // استدعاء التحديث حتى في حالة الخطأ
    }
  }

  // مستمعات أحداث الشبكة
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      isOnline.value = true;
      checkQueue(); // المزامنة قد تبدأ عند العودة للاتصال
    });

    window.addEventListener('offline', () => {
      isOnline.value = false;
      updateStatus();
    });
  }

  // تشغيل فحص أولي عند تهيئة المتجر
  checkQueue();

  return {
    isOnline,
    queueLength,
    syncStatus,
    checkQueue,
    updateStatus
  };
});
