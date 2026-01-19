<template>
  <div v-if="hasError" class="error-boundary">
    <div class="error-container">
      <div class="error-icon">⚠️</div>
      <h2 class="error-title">حدث خطأ غير متوقع</h2>
      <p class="error-message">نعتذر عن هذا الإزعاج. حدث خطأ غير متوقع في التطبيق.</p>
      
      <div class="error-details" v-if="showDetails">
        <pre>{{ errorDetails }}</pre>
      </div>
      
      <div class="error-actions">
        <button @click="reload" class="btn btn-primary">
          <i class="fas fa-sync-alt"></i>
          إعادة تحميل الصفحة
        </button>
        <button @click="toggleDetails" class="btn btn-secondary">
          <i class="fas fa-info-circle"></i>
          {{ showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل' }}
        </button>
      </div>
    </div>
  </div>
  <slot v-else />
</template>

<script setup>
import { ref, onErrorCaptured, onMounted, getCurrentInstance } from 'vue'
import logger from '@/utils/logger'

const hasError = ref(false)
const errorDetails = ref('')
const showDetails = ref(false)

// Catch errors from child components
onErrorCaptured((err, instance, info) => {
  hasError.value = true
  errorDetails.value = `Error: ${err.message}\n\nComponent: ${instance?.$options?.name || 'Unknown'}\n\nInfo: ${info}\n\nStack: ${err.stack}`
  
  logger.error('ErrorBoundary caught error:', {
    message: err.message,
    component: instance?.$options?.name,
    info,
    stack: err.stack
  })
  
  return false // Prevent error from propagating
})

// Also catch global errors (for lifecycle hooks like onMounted)
onMounted(() => {
  const app = getCurrentInstance()?.appContext.app
  
  if (app && !app.config.errorHandler) {
    app.config.errorHandler = (err, instance, info) => {
      hasError.value = true
      errorDetails.value = `Error: ${err.message}\n\nComponent: ${instance?.$options?.name || 'Unknown'}\n\nInfo: ${info}\n\nStack: ${err.stack}`
      
      logger.error('Global error handler caught:', {
        message: err.message,
        component: instance?.$options?.name,
        info,
        stack: err.stack
      })
    }
  }
})

const reload = () => {
  window.location.reload()
}

const toggleDetails = () => {
  showDetails.value = !showDetails.value
}
</script>

<style scoped>
.error-boundary {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #007965 0%, #005a4d 100%);
  padding: 2rem;
}

.error-container {
  background: white;
  border-radius: 16px;
  padding: 3rem;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

.error-title {
  font-size: 1.8rem;
  color: #333;
  margin-bottom: 1rem;
  font-weight: 700;
}

.error-message {
  color: #666;
  font-size: 1.1rem;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.error-details {
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  text-align: right;
  max-height: 300px;
  overflow-y: auto;
}

.error-details pre {
  margin: 0;
  font-size: 0.85rem;
  color: #333;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #007965 0%, #005a4d 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 121, 101, 0.4);
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

@media (max-width: 768px) {
  .error-container {
    padding: 2rem 1.5rem;
  }
  
  .error-title {
    font-size: 1.5rem;
  }
  
  .error-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style>
