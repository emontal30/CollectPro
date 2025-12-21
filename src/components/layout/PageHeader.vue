<template>
  <div class="page-header-container">
    <div class="page-header">
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
defineProps({
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
})
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
  overflow: hidden;
  text-align: center;
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
  /* ظل عصري وخفيف يعطي عمق للأيقونة */
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