<template>
  <div class="notification-container">
    <transition-group name="notification" tag="div">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="['notification', `notification-${notification.type}`]"
        @click="removeNotification(notification.id)"
      >
        <div class="notification-content">
          <i :class="getIconClass(notification.type)"></i>
          <span class="notification-message">{{ notification.message }}</span>
          <button class="notification-close" @click.stop="removeNotification(notification.id)">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { inject } from 'vue';

const { notifications, removeNotification } = inject('notifications');

const getIconClass = (type) => {
  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };
  return icons[type] || 'fas fa-info-circle';
};
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 20px; /* تم تعديله من 100px ليظهر دائماً بالاعلى */
  right: 20px;
  z-index: 10000;
  max-width: 400px;
  pointer-events: none;
}

.notification {
  margin-bottom: 10px;
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.3s ease;
}

.notification:hover {
  transform: translateX(-5px);
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-family: 'Cairo', sans-serif;
  font-size: 14px;
  font-weight: 500;
  min-width: 300px;
  max-width: 400px;
}

.notification-success {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
  border-left: 5px solid #1e7e34;
  box-shadow: 0 8px 25px rgba(40, 167, 69, 0.25);
}

.notification-error {
  background: linear-gradient(135deg, #dc3545 0%, #ff6b6b 100%);
  color: white;
  border-left: 5px solid #a82835;
  box-shadow: 0 8px 25px rgba(220, 53, 69, 0.25);
}

.notification-warning {
  background: linear-gradient(135deg, #ffc107 0%, #ffb703 100%);
  color: #333;
  border-left: 5px solid #ff9d00;
  box-shadow: 0 8px 25px rgba(255, 193, 7, 0.25);
}

.notification-info {
  background: linear-gradient(135deg, #17a2b8 0%, #007bff 100%);
  color: white;
  border-left: 5px solid #0c5460;
  box-shadow: 0 8px 25px rgba(23, 162, 184, 0.25);
}

.notification i {
  font-size: 20px;
  flex-shrink: 0;
}

.notification-message {
  flex: 1;
  line-height: 1.4;
  font-weight: 500;
}

.notification-close {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  flex-shrink: 0;
  font-size: 16px;
}

.notification-close:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

/* Night mode rules migrated to src/assets/css/unified-dark-mode.css */
/* Animation */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease;
}

/* Mobile responsiveness */
@media (max-width: 480px) {
  .notification-container {
    right: 10px;
    left: 10px;
    max-width: none;
    top: 10px; /* تم تعديله للهواتف ايضاً */
  }

  .notification-content {
    min-width: auto;
    max-width: none;
    font-size: 13px;
    padding: 14px 16px;
  }

  .notification i {
    font-size: 16px;
  }
}
</style>