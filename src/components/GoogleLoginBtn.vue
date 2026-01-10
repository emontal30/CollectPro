<template>
  <button
    class="google-login-btn"
    :disabled="isLoading"
    @click="handleClick"
  >
    <div class="icon-container" :class="{ 'is-loading': isLoading }">
      <i :class="iconClass"></i>
    </div>
    <span class="btn-text">{{ buttonText }}</span>
  </button>
</template>

<script>
export default {
  name: 'GoogleLoginBtn',
  props: {
    isLoading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['click'],
  computed: {
    iconClass() {
      if (this.isLoading) {
        return 'fas fa-spinner fa-spin';
      }
      return 'fab fa-google';
    },
    buttonText() {
      if (this.isLoading) {
        return 'جاري التوجيه...';
      }
      return 'تسجيل الدخول باستخدام Google';
    }
  },
  methods: {
    handleClick(event) {
      if (!this.isLoading) {
        this.$emit('click', event);
      }
    }
  }
}
</script>

<style scoped>
/* Button Base */
.google-login-btn {
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 14px 20px;
  border: none;
  border-radius: 16px;
  /* color/background moved to centralized _unified-components.css */
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  gap: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: 'Cairo', sans-serif;
  
}

/* Shine Effect */
.google-login-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transition: left 0.5s;
}

.google-login-btn:not(:disabled):hover::before {
  left: 100%;
}

/* Hover State */
.google-login-btn:not(:disabled):hover {
  transform: translateY(-3px);
}

/* Disabled State */
.google-login-btn:disabled {
  cursor: not-allowed;
  opacity: 0.9;
}

/* Icon Container */
.icon-container {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.icon-container i {
  font-size: 18px;
}

/* Loading State for Icon Container */
.icon-container.is-loading {
  background: transparent !important;
  box-shadow: none !important;
}

.icon-container.is-loading i {
  font-size: 22px;
}

/* Spin Animation */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.fa-spin {
  animation: spin 0.8s linear infinite !important;
}

/* Button Text */
.btn-text {
  margin-right: 4px;
}

/* Media Queries */
@media (max-width: 400px) {
  .google-login-btn {
    font-size: 14px;
    padding: 12px 15px;
  }
}
</style>
