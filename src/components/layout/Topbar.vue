<template>
  <!-- 🔝 الشريط العلوي -->
  <div class="header-content">
    <div class="header-container">
      <!-- Logo and App Name on the left -->
      <div class="logo-section">
        <img src="/logo-momkn.png" alt="شعار التطبيق" class="header-logo" />
        <div class="title-wrapper">
          <span class="app-title">Collect<span 
            class="pro-part" 
            :class="statusClass"
            :title="statusTitle"
          >Pro</span></span>
        </div>
      </div>

      <!-- Menu toggle on the right -->
      <button class="menu-toggle" title="فتح القائمة" @click="toggleSidebar">
        <i class="fas fa-bars"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useSyncStore } from '@/stores/syncStore';

const sidebarStore = useSidebarStore();
const syncStore = useSyncStore();

const toggleSidebar = () => {
  sidebarStore.toggleSidebar();
};

onMounted(() => {
  syncStore.checkQueue();
});

const statusClass = computed(() => {
  switch (syncStore.syncStatus) {
    case 'offline': return 'status-offline';
    case 'pending': return 'status-pending';
    case 'synced': return 'status-synced';
    default: return 'status-synced';
  }
});

const statusTitle = computed(() => {
  switch (syncStore.syncStatus) {
    case 'offline': return 'أنت غير متصل بالإنترنت - البيانات محفوظة محلياً';
    case 'pending': return 'جاري المزامنة - توجد بيانات قيد الانتظار';
    case 'synced': return 'متصل - جميع البيانات متزامنة';
    default: return '';
  }
});
</script>

<style scoped>
.header-content {
  position: sticky;
  top: 0;
  left: 0;
  width: 100%;
  /* ضمان أن الخلفية تغطي العرض الكامل المطلوب */
  min-width: var(--app-min-width, 768px);
  height: var(--header-height, 70px);
  z-index: 1002;
  background: var(--header-bg, var(--primary));
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  transition: background 0.3s ease;
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 0 20px;
  width: 100%;
  max-width: var(--app-min-width, 768px);
  margin: 0 auto;
  direction: ltr;
}

/* Logo section */
.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-logo {
  height: 42px;
  width: auto;
  display: block;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.title-wrapper {
  display: flex;
  align-items: baseline;
  gap: 0;
}

.app-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: white;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
  letter-spacing: 0.5px;
  font-family: 'Poppins', sans-serif;
  display: flex;
  align-items: center;
}

/* PRO Part Styles within Title */
.pro-part {
  color: #fbbf24; /* Amber-400 Default Gold-ish */
  transition: color 0.3s ease;
  cursor: help;
  padding: 0 2px;
  text-shadow: none; /* No shadow as requested */
}

/* Status Colors - Clean colors only, no effects */
.pro-part.status-synced {
  color: #a7f3d0; /* Emerald-200 Light Green */
}

.pro-part.status-pending {
  color: #fb923c; /* Orange-400 */
}

.pro-part.status-offline {
  color: #fca5a5; /* Red-300 Light Red */
}

.menu-toggle {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  width: 45px;
  height: 45px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>