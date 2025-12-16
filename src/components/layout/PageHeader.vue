<template>
  <div class="page-header">
    <div class="header-content">
      <h1>{{ title }} {{ icon }}</h1>
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
.page-header {
  background: var(--primary, #007965);
  color: white;
  padding: 8px 15px;
  margin: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 121, 101, 0.2);
  position: relative;
  overflow: hidden;
  text-align: center;
}

.header-content {
  position: relative;
  z-index: 1;
}

.page-header h1 {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0 0 2px 0;
  text-shadow: 0 1px 3px rgba(0,0,0,0.3);
  letter-spacing: 0.3px;
}

.subtitle {
  font-size: 0.8rem;
  font-weight: 400;
  margin: 0;
  opacity: 0.9;
  line-height: 1.2;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .page-header {
    margin: 8px;
    padding: 6px 12px;
  }
  
  .page-header h1 {
    font-size: 1.1rem;
  }
  
  .subtitle {
    font-size: 0.75rem;
  }
}

@media (max-width: 480px) {
  .page-header {
    margin: 6px;
    padding: 5px 10px;
  }
  
  .page-header h1 {
    font-size: 1rem;
  }
  
  .subtitle {
    font-size: 0.7rem;
  }
}
</style>
