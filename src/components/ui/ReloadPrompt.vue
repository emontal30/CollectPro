<template>
  <div v-if="needRefresh" class="update-prompt">
    <div class="update-content">
      <div class="update-icon">
        <div class="icon-circle">
          <i class="fas fa-rocket"></i>
        </div>
      </div>
      <div class="update-text">
        <h3>تحديث جديد متاح!</h3>
        <p>يتوفر إصدار جديد من التطبيق مع تحسينات ومميزات جديدة.</p>
      </div>
      <div class="update-actions">
        <button @click="updateServiceWorker" class="btn-update">
          <i class="fas fa-sync-alt"></i>
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
  z-index: 11000;
  background: var(--surface-bg, #ffffff);
  border-radius: 20px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
  padding: 24px;
  max-width: 360px;
  border: 1px solid var(--border-color, rgba(0, 121, 101, 0.2));
  animation: slideIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  direction: rtl;
}

.update-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  text-align: center;
}

.icon-circle {
  width: 50px;
  height: 50px;
  background: rgba(var(--primary-rgb, 0, 121, 101), 0.1);
  color: var(--primary, #007965);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin-bottom: 4px;
}

.update-text h3 {
  margin: 0 0 8px 0;
  color: var(--gray-900, #212529);
  font-size: 1.2rem;
  font-weight: 800;
}

.update-text p {
  margin: 0;
  font-size: 0.95rem;
  color: var(--gray-700, #495057);
  line-height: 1.5;
}

.update-actions {
  display: flex;
  gap: 12px;
  width: 100%;
}

.btn-update {
  flex: 2;
  background: var(--primary, #007965);
  color: white !important;
  border: none;
  padding: 12px;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(var(--primary-rgb, 0, 121, 101), 0.2);
}

.btn-update:hover {
  background: var(--primary-dark, #005a4b);
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(var(--primary-rgb, 0, 121, 101), 0.3);
}

.btn-later {
  flex: 1;
  background: var(--gray-100, #f8f9fa);
  color: var(--gray-700, #495057);
  border: 1px solid var(--gray-200, #e9ecef);
  padding: 12px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-later:hover {
  background: var(--gray-200, #e9ecef);
}

/* Dark Mode Overrides */
:deep(body.dark) .update-prompt {
  background: #1e293b;
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
}

:deep(body.dark) .update-text h3 {
  color: #f1f5f9;
}

:deep(body.dark) .update-text p {
  color: #cbd5e1;
}

:deep(body.dark) .btn-later {
  background: #334155;
  color: #e2e8f0;
  border-color: #475569;
}

:deep(body.dark) .btn-later:hover {
  background: #475569;
}

:deep(body.dark) .icon-circle {
  background: rgba(45, 212, 191, 0.1);
  color: #2dd4bf;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(50px) scale(0.9); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (max-width: 480px) {
  .update-prompt {
    bottom: 20px;
    right: 20px;
    left: 20px;
    max-width: none;
    padding: 20px;
  }
}
</style>