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
/* Styles for `BaseButton` are centralized in
   src/assets/css/components/buttons.css to avoid duplication.
   Keep this file minimal to allow component-specific overrides. */
.btn i { font-size: 1.25rem; color: inherit; }
</style>