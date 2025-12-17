<template>
  <component :is="tag" :class="['base-heading', variantClass]">
    <i v-if="icon" :class="icon"></i>
    <span>{{ text }}</span>
  </component>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  tag: {
    type: String,
    default: 'h1',
    validator: (value) => ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(value)
  },
  text: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'muted'].includes(value)
  }
});

const variantClass = computed(() => `heading-${props.variant}`);
</script>

<style scoped>
@import url('../../../assets/css/variables.css');

.base-heading {
  margin: 0;
  font-weight: 700;
  line-height: 1.2;
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 10px;
}

.base-heading i {
  font-size: 1.2em;
  color: var(--primary);
}

.heading-primary {
  font-size: 2rem;
  color: var(--primary);
}

.heading-secondary {
  font-size: 1.5rem;
  color: var(--primary);
}

.heading-muted {
  font-size: 1.2rem;
  color: var(--gray-700);
}

@media (max-width: 768px) {
  .heading-primary {
    font-size: 1.5rem;
  }

  .heading-secondary {
    font-size: 1.2rem;
  }
}
</style>