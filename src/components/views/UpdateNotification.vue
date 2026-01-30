<template>
  <Transition name="fade-scale">
    <div v-if="show" class="update-overlay">
      <div class="update-card">
        <div class="icon-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" class="rocket-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        
        <div class="content">
          <h3>تحديث جديد متاح</h3>
          <p>تم إطلاق نسخة جديدة ومحسنة من التطبيق لضمان أفضل أداء واستقرار. يرجى التحديث الآن.</p>
        </div>

        <button @click="reload" class="update-btn">
          <span>تحديث النظام الآن</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
            <path d="M16 21h5v-5"/>
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

defineProps({
  show: { type: Boolean, required: true }
});

const emit = defineEmits(['reload']);

const reload = () => {
  emit('reload');
};
</script>

<style scoped>
.update-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.update-card {
  background: rgba(255, 255, 255, 0.95);
  width: 100%;
  max-width: 400px;
  border-radius: 24px;
  padding: 2.5rem 2rem;
  text-align: center;
  box-shadow: 
    0 20px 50px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.dark .update-card {
  background: rgba(30, 41, 59, 0.95);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
}

.icon-wrapper {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);
  margin-bottom: 0.5rem;
}

.rocket-icon {
  width: 36px;
  height: 36px;
  color: white;
  stroke-width: 2;
}

.content h3 {
  font-size: 1.5rem;
  font-weight: 800;
  color: #1f2937;
  margin: 0;
  font-family: 'Cairo', sans-serif;
}

.dark .content h3 {
  color: #f3f4f6;
}

.content p {
  color: #6b7280;
  font-size: 1rem;
  line-height: 1.6;
  margin: 0;
}

.dark .content p {
  color: #9ca3af;
}

.update-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 16px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  font-family: 'Cairo', sans-serif;
}

.update-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
}

.update-btn:active {
  transform: translateY(0);
}

/* Animations */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.fade-scale-enter-active .update-card {
  animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes popIn {
  from { transform: scale(0.9) translateY(20px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}
</style>
