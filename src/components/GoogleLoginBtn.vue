<template>
  <button
    class="google-login-btn"
    :disabled="isLoading"
    @click="handleClick"
  >
    <i :class="iconClass"></i>
    {{ buttonText }}
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
  padding: 16px 20px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, #007965 0%, #00a080 100%);
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(0, 121, 101, 0.3);
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
  background: linear-gradient(135deg, #006d56 0%, #007965 100%);
  transform: translateY(-3px);
  box-shadow: 0 12px 25px rgba(0, 121, 101, 0.4);
}

/* Disabled State */
.google-login-btn:disabled {
  cursor: not-allowed;
  opacity: 0.8;
}

/* Icon Container */
.google-login-btn i {
  margin-left: 12px;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ea4335;
  font-size: 24px;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

/* Icon Hover Effect */
.google-login-btn:not(:disabled):hover i:not(.fa-spin) {
  transform: scale(1.1);
  background: white;
}

/* Loading Spin Animation */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.fa-spin {
  animation: spin 1s linear infinite;
  color: white !important; /* Spinner is white */
  background: transparent !important; /* Remove white circle bg for spinner */
  box-shadow: none !important;
}
</style>
