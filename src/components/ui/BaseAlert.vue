<template>
  <div
    v-if="show"
    :class="['alert', `alert-${type}`, { show }]"
    role="alert"
  >
    <i :class="iconClass"></i>
    <span>{{ message }}</span>
    <button
      v-if="dismissible"
      class="alert-close"
      aria-label="إغلاق"
      @click="dismiss"
    >
      <i class="fas fa-times"></i>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['info', 'success', 'warning', 'danger'].includes(value)
  },
  duration: {
    type: Number,
    default: 5000
  },
  dismissible: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['dismiss'])

const show = ref(true)

const iconClass = computed(() => {
  const icons = {
    info: 'fas fa-info-circle',
    success: 'fas fa-check-circle',
    warning: 'fas fa-exclamation-triangle',
    danger: 'fas fa-exclamation-circle'
  }
  return icons[props.type] || icons.info
})

const dismiss = () => {
  show.value = false
  emit('dismiss')
}

onMounted(() => {
  if (props.duration > 0 && props.dismissible) {
    setTimeout(() => {
      dismiss()
    }, props.duration)
  }
})
</script>

<style scoped>
.alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  margin-bottom: 10px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.3s ease;
  border: 1px solid;
  position: relative;
}

.alert.show {
  opacity: 1;
  transform: translateY(0);
}

.alert-info {
  background: #d1ecf1;
  color: #0c5460;
  border-color: #bee5eb;
}

.alert-success {
  background: #d4edda;
  color: #155724;
  border-color: #c3e6cb;
}

.alert-warning {
  background: #fff3cd;
  color: #856404;
  border-color: #ffeaa7;
}

.alert-danger {
  background: #f8d7da;
  color: #721c24;
  border-color: #f5c6cb;
}

.alert-close {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0;
  margin-left: auto;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.alert-close:hover {
  opacity: 1;
}

/* Dark mode support */
body.dark .alert-info {
  background: rgba(23, 162, 184, 0.1);
  color: #5bc0de;
  border-color: rgba(23, 162, 184, 0.3);
}

body.dark .alert-success {
  background: rgba(40, 167, 69, 0.1);
  color: #5cb85c;
  border-color: rgba(40, 167, 69, 0.3);
}

body.dark .alert-warning {
  background: rgba(255, 193, 7, 0.1);
  color: #ffc107;
  border-color: rgba(255, 193, 7, 0.3);
}

body.dark .alert-danger {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
  border-color: rgba(220, 53, 69, 0.3);
}
</style>