<template>
  <!-- 🔝 الشريط العلوي -->
  <div class="header-content">
    <div class="header-container">
      <!-- Logo and App Name on the left -->
      <div class="logo-section">
        <img src="/logo-momkn.png" alt="شعار التطبيق" class="header-logo" />
        <span class="app-title">CollectPro</span>
      </div>

      <!-- Menu toggle on the right -->
      <button class="menu-toggle" title="فتح القائمة" @click="toggleSidebar">
        <i class="fas fa-bars"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { useSidebarStore } from '@/stores/sidebarStore'

const sidebarStore = useSidebarStore()

const toggleSidebar = () => {
  sidebarStore.toggleSidebar()
}
</script>

<style scoped>
.header-content {
  position: sticky;
  top: 0;
  left: 0;
  width: 100%;
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
  max-width: var(--app-min-width, 768px); /* توحيد العرض مع الصفحات */
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
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.header-logo:hover {
  transform: scale(1.1) rotate(-5deg);
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}

.app-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: white;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
  letter-spacing: 0.5px;
  font-family: 'Poppins', sans-serif;
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
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.menu-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .header-content {
    height: calc(var(--header-height, 70px) - 5px);
  }
  
  .header-container {
    padding: 0 15px;
  }

  .header-logo {
    height: 35px;
  }
  
  .app-title {
    font-size: 1.25rem;
  }

  .menu-toggle {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }
}
</style>