<template>
  <div v-if="needRefresh" class="update-prompt">
    <div class="update-content">
      <div class="update-icon">
        <i class="fas fa-sync-alt fa-spin"></i>
      </div>
      <div class="update-text">
        <h3>تحديث جديد متاح!</h3>
        <p>يتوفر إصدار جديد من التطبيق مع تحسينات ومميزات جديدة.</p>
      </div>
      <div class="update-actions">
        <button @click="updateServiceWorker" class="btn-update">
          تحديث الآن
        </button>
        <button @click="closePrompt" class="btn-later">
          لاحقاً
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRegisterSW } from 'virtual:pwa-register/vue';

const {
  needRefresh,
  updateServiceWorker,
} = useRegisterSW();

const closePrompt = () => {
  needRefresh.value = false;
};
</script>

<style scoped>
.update-prompt {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 9999;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  padding: 20px;
  max-width: 350px;
  border: 2px solid var(--primary);
  animation: slideIn 0.5s ease-out;
  direction: rtl;
}

.update-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: center;
  text-align: center;
}

.update-icon {
  font-size: 2rem;
  color: var(--primary);
}

.update-text h3 {
  margin: 0 0 5px 0;
  color: var(--gray-900);
}

.update-text p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--gray-600);
}

.update-actions {
  display: flex;
  gap: 10px;
  width: 100%;
}

.btn-update {
  flex: 2;
  background: var(--primary);
  color: white;
  border: none;
  padding: 10px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-later {
  flex: 1;
  background: var(--gray-200);
  color: var(--gray-700);
  border: none;
  padding: 10px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-update:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(50px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 480px) {
  .update-prompt {
    bottom: 20px;
    right: 20px;
    left: 20px;
    max-width: none;
  }
}
</style>