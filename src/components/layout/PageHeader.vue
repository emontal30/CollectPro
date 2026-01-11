<template>
  <div class="page-header-container">
    <div class="page-header">
      <!-- Professional Zoom Selector -->
      <div class="zoom-selector-wrapper">
        <div class="zoom-dropdown">
          <button @click.stop="toggleZoomMenu" class="zoom-trigger-btn" :class="{ 'active': isMenuOpen }" title="ضبط حجم الخط">
            <span class="zoom-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
            </span>
            <span class="zoom-current-value">{{ currentZoomLabel }}</span>
          </button>
          
          <div v-if="isMenuOpen" class="zoom-menu" v-click-outside="closeZoomMenu">
            <div class="zoom-menu-header">حجم الخط</div>
            <div class="zoom-options-grid">
              <button 
                v-for="level in zoomLevels" 
                :key="level.value"
                @click="setZoom(level.value)"
                class="zoom-option"
                :class="{ 'selected': settingsStore.zoomLevel === level.value }"
              >
                {{ level.label }}
              </button>
            </div>
            <button @click="resetZoom" class="zoom-reset-btn">إعادة ضبط (0)</button>
          </div>
        </div>
      </div>

      <div class="header-main-content">
        <div class="header-icon" v-if="icon">
          <span class="icon-plain">{{ icon }}</span>
        </div>
        <h1>{{ title }}</h1>
      </div>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useSettingsStore } from '@/stores/settings';

const settingsStore = useSettingsStore();
const isMenuOpen = ref(false);

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  }
});

// Mapping zoom level (0-10) to display labels (-5 to +5)
const zoomLevels = [
  { value: 12, label: '+7' },
  { value: 11, label: '+6' },
  { value: 10, label: '+5' },
  { value: 9, label: '+4' },
  { value: 8, label: '+3' },
  { value: 7, label: '+2' },
  { value: 6, label: '+1' },
  { value: 5, label: '0' },
  { value: 4, label: '-1' },
  { value: 3, label: '-2' },
  { value: 2, label: '-3' }
];

const currentZoomLabel = computed(() => {
  const level = settingsStore.zoomLevel;
  const val = level - 5;
  return val > 0 ? `+${val}` : val;
});

const toggleZoomMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};

const closeZoomMenu = () => {
  isMenuOpen.value = false;
};

const setZoom = (value) => {
  settingsStore.setZoomLevel(value);
  closeZoomMenu();
};

const resetZoom = () => {
  settingsStore.setZoomLevel(5);
  closeZoomMenu();
};
</script>

<style scoped>
.page-header-container {
  padding: 0 5px;
  margin-bottom: 20px;
}

.page-header {
  background: var(--primary, #007965);
  color: white;
  padding: 15px 20px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 121, 101, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: visible; /* Changed to visible for dropdown */
  text-align: center;
}

/* Zoom Selector Styles */
.zoom-selector-wrapper {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
}

.zoom-dropdown {
  position: relative;
}

.zoom-trigger-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 6px 12px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(8px);
  min-width: 70px;
  justify-content: center;
}

.zoom-trigger-btn:hover, .zoom-trigger-btn.active {
  background: rgba(255, 255, 255, 0.3);
  border-color: white;
}

.zoom-icon {
  display: flex;
  align-items: center;
}

.zoom-current-value {
  font-weight: 700;
  font-size: 14px;
  font-family: var(--font-family-mono);
}

.zoom-menu {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  background: var(--surface-bg, white);
  border-radius: 14px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  padding: 12px;
  min-width: 180px;
  color: var(--gray-900);
  animation: slideIn 0.2s ease-out;
  border: 1px solid var(--border-color);
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.zoom-menu-header {
  font-size: 12px;
  font-weight: 700;
  color: var(--gray-500);
  margin-bottom: 10px;
  text-align: center;
  text-transform: uppercase;
}

.zoom-options-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 10px;
}

.zoom-option {
  background: var(--gray-100);
  border: 1px solid var(--gray-200);
  color: var(--gray-800);
  padding: 8px 4px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.zoom-option:hover {
  background: var(--primary-light);
  color: white;
  border-color: var(--primary);
}

.zoom-option.selected {
  background: var(--primary);
  color: white;
  border-color: var(--primary-dark);
}

.zoom-reset-btn {
  width: 100%;
  padding: 8px;
  background: transparent;
  border: 1px dashed var(--primary);
  color: var(--primary);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.zoom-reset-btn:hover {
  background: rgba(var(--primary-rgb), 0.05);
}

.header-main-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 4px;
}

.page-header::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%);
  pointer-events: none;
}

.header-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-plain {
  font-size: 28px;
  display: inline-block;
  filter: drop-shadow(0 4px 4px rgba(0, 0, 0, 0.25));
  transition: transform 0.3s ease;
}

.icon-plain:hover {
  transform: scale(1.1) rotate(5deg);
}

.page-header h1 {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.subtitle {
  font-size: 0.9rem;
  font-weight: 400;
  margin: 0;
  opacity: 0.95;
  line-height: 1.4;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .page-header {
    padding: 12px 15px;
    border-radius: 14px;
  }
  
  .zoom-selector-wrapper {
    left: 10px;
  }
  
  .zoom-trigger-btn {
    padding: 4px 8px;
    min-width: 60px;
    font-size: 12px;
  }

  .header-main-content {
    gap: 10px;
  }

  .icon-plain {
    font-size: 24px;
  }
  
  .page-header h1 {
    font-size: 1.2rem;
  }
  
  .subtitle {
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .page-header {
    padding: 10px 12px;
    border-radius: 12px;
  }
  
  .zoom-selector-wrapper {
    position: static;
    transform: none;
    margin-bottom: 10px;
    order: 3;
  }

  .zoom-menu {
    left: 50%;
    transform: translateX(-50%);
    top: auto;
    bottom: calc(100% + 10px);
  }

  .icon-plain {
    font-size: 22px;
  }
  
  .page-header h1 {
    font-size: 1.1rem;
  }
  
  .subtitle {
    font-size: 0.75rem;
  }
}
</style>