<template>
  <div class="loading-spinner" role="status" aria-live="polite">
    <i class="fas fa-spinner fa-spin" aria-hidden="true"></i>
    <p>{{ message }}</p>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'

const props = defineProps({
  message: { type: String, default: 'جاري التحميل...' }
})
</script>

<style scoped>
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.loading-spinner i {
  font-size: 28px;
  color: var(--primary-color, #007965);
  margin-bottom: 8px;
}
.loading-spinner p {
  margin: 0;
  font-size: 14px;
  color: var(--text-muted, #666);
}
</style>
