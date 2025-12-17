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
@import url('../../../assets/css/variables.css');

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--btn-padding-y) var(--btn-padding-x);
  font-family: var(--font-family-sans);
  font-weight: 500;
  line-height: 1.5;
  text-align: center;
  text-decoration: none;
  white-space: nowrap;
  vertical-align: middle;
  cursor: pointer;
  user-select: none;
  border: 1px solid transparent;
  border-radius: var(--btn-border-radius);
  transition: var(--btn-transition);
  gap: 10px;
  min-height: 50px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,121,101,0.3);
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s;
}

.btn:hover::before {
  left: 100%;
}

.btn:disabled,
.btn.disabled {
  opacity: 0.65;
  cursor: not-allowed;
  pointer-events: none;
}

.btn-primary {
  color: white;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  border-color: var(--primary);
}

.btn-primary:hover {
  background: linear-gradient(135deg, var(--primary-dark), var(--primary));
  border-color: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 121, 101, 0.3);
}

.btn-success {
  color: white;
  background: linear-gradient(135deg, var(--success), #1e7e34);
  border-color: var(--success);
}

.btn-success:hover {
  background: linear-gradient(135deg, #1e7e34, var(--success));
  border-color: #1e7e34;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(40, 167, 69, 0.3);
}

.btn-secondary {
  color: white;
  background: linear-gradient(135deg, var(--gray-600), var(--gray-700));
  border-color: var(--gray-600);
}

.btn-secondary:hover {
  background: linear-gradient(135deg, var(--gray-700), var(--gray-600));
  border-color: var(--gray-700);
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(108, 117, 125, 0.3);
}

.btn-danger {
  color: white;
  background: linear-gradient(135deg, var(--danger), #c82333);
  border-color: var(--danger);
}

.btn-danger:hover {
  background: linear-gradient(135deg, #c82333, var(--danger));
  border-color: #c82333;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(220, 53, 69, 0.3);
}

.btn i {
  font-size: 1.25rem;
  color: inherit;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .btn {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }
}
</style>