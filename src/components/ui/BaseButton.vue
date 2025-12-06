<template>
  <button :class="['btn', variantClass]" :type="type" :disabled="disabled" @click="$emit('click', $event)">
    <i :class="icon"></i>
    <span>{{ text }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'success', 'secondary', 'danger'].includes(value)
  },
  type: {
    type: String,
    default: 'button'
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const variantClass = computed(() => `btn-${props.variant}`);

defineEmits(['click']);
</script>

<style scoped>
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 18px 24px;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 700;
  font-family: 'Cairo', sans-serif;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  min-height: 60px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.btn:hover::before {
  left: 100%;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.btn-primary {
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  color: white;
}

.btn-success {
  background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
  color: white;
}

.btn-secondary {
  background: linear-gradient(135deg, #6c757d 0%, #545b62 100%);
  color: white;
}

.btn-danger {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
}

.btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
  box-shadow: 0 8px 25px rgba(0, 123, 255, 0.3);
}

.btn-success:hover:not(:disabled) {
  background: linear-gradient(135deg, #1e7e34 0%, #155724 100%);
  box-shadow: 0 8px 25px rgba(40, 167, 69, 0.3);
}

.btn-secondary:hover:not(:disabled) {
  background: linear-gradient(135deg, #545b62 0%, #495057 100%);
  box-shadow: 0 8px 25px rgba(108, 117, 125, 0.3);
}

.btn-danger:hover:not(:disabled) {
  background: linear-gradient(135deg, #c82333 0%, #bd2130 100%);
  box-shadow: 0 8px 25px rgba(220, 53, 69, 0.3);
}

.btn i {
  font-size: 1.2rem;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(5px);
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .btn {
    padding: 15px 20px;
    font-size: 1rem;
  }
}
</style>