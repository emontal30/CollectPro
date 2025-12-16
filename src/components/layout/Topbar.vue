<template>
  <!-- 🔝 الشريط العلوي -->
  <div class="header-content">
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
</template>

<script setup>
import { useSidebarStore } from '@/stores/sidebarStore'

const props = defineProps({
  pageTitle: {
    type: String,
    default: ''
  }
})

const sidebarStore = useSidebarStore()

const toggleSidebar = () => {
  sidebarStore.toggleSidebar()
}
</script>

<style scoped>
.header-content {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 70px;
  z-index: 1002;
  display: flex;
  justify-content: space-between;
  align-items: center;
  direction: ltr;
  padding: 15px 20px;
  background: var(--primary, #007965);
  color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  overflow: hidden;
}

/* Logo section */
.logo-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-logo {
  height: 40px;
  width: auto;
  display: block;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  transition: all 0.3s ease;
}

.header-logo:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.app-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
}

/* Header controls section */
.header-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Dark mode toggle button */
.dark-mode-toggle {
  background: none;
  border: none;
  color: white;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  outline: none;
  border-radius: 8px;
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
}

.dark-mode-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.dark-mode-toggle:active {
  transform: scale(0.95);
}

/* Menu toggle styling is now provided by unified component CSS to avoid duplication.
   Left intentionally blank here to avoid scoped overrides. */

/* Night mode rules migrated to src/assets/css/unified-dark-mode.css */
/* Fix content overlap with fixed topbar remains global (body padding set elsewhere) */

/* Mobile responsiveness */
@media (max-width: 1024px) {
  .header-content {
    padding: 14px 18px;
  }
  
  .header-logo {
    height: 38px;
  }
}

@media (max-width: 768px) {
  .header-content {
    padding: 12px 15px;
  }
  
  .header-logo {
    height: 35px;
  }
  
  .app-title {
    font-size: 1.2rem;
  }
  
  /* menu-toggle sizing handled in unified CSS */
}

@media (max-width: 480px) {
  .header-content {
    padding: 10px 12px;
  }
  
  .header-logo {
    height: 30px;
  }
  
  .app-title {
    font-size: 1rem;
  }
  
  /* menu-toggle sizing handled in unified CSS */
  
  .logo-section {
    gap: 8px;
  }
}

@media (max-width: 360px) {
  .header-content {
    padding: 8px 10px;
  }
  
  .header-logo {
    height: 28px;
  }
  
  .app-title {
    font-size: 0.9rem;
  }
  
  /* menu-toggle sizing handled in unified CSS */
}
</style>