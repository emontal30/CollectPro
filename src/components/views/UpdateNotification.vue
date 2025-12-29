<template>
  <div v-if="show" class="update-notification">
    <div class="update-content">
      <span>نسخة جديدة من التطبيق متاحة.</span>
      <button @click="reload" class="reload-button">تحديث الآن</button>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

defineProps({
  show: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['reload']);

const reload = () => {
  emit('reload');
};
</script>

<style scoped>
.update-notification {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 20px;
  width: 90%;
  max-width: 400px;
  background-color: #2c3e50;
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  padding: 1rem;
  transition: all 0.3s ease-in-out;
  border: 1px solid #34495e;
}

.update-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.reload-button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  white-space: nowrap;
  transition: background-color 0.2s;
}

.reload-button:hover {
  background-color: #2980b9;
}
</style>
