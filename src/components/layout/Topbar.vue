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
  direction: ltr; /* Keeps logo on left and menu on right consistently */
  padding: 0 20px;
  background: var(--primary, #007965);
  color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
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
}

.menu-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.menu-toggle:active {
  transform: translateY(0);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .header-content {
    padding: 0 15px;
    height: 65px;
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

@media (max-width: 480px) {
  .header-logo {
    height: 32px;
  }
  
  .app-title {
    font-size: 1.1rem;
  }
  
  .logo-section {
    gap: 8px;
  }
}
</style>