<template>
  <div v-if="visible" class="offline-banner" :class="type">
    <div class="banner-content">
      <strong>{{ title }}</strong>
      <span class="message">{{ message }}</span>
    </div>
    <div class="actions">
      <button class="close-btn" @click="close">×</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const visible = ref(false)
const type = ref('info')
const title = ref('')
const message = ref('')

function showBanner(t, msg) {
  type.value = t || 'info'
  title.value = t === 'error' ? 'خطأ في الاتصال' : 'وضع عدم الاتصال'
  message.value = msg || ''
  visible.value = true
}

function close() {
  visible.value = false
  authStore.clearAuthWarning()
}

onMounted(() => {
  // Show when offline
  const updateOnlineStatus = () => {
    if (!navigator.onLine) {
      showBanner('warning', 'لا يوجد اتصال بالإنترنت — التطبيق يعمل محليًا');
    } else {
      // If there is an auth warning, keep it shown; otherwise hide
      if (!authStore.authWarning) visible.value = false
    }
  }

  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
  updateOnlineStatus()

  // Watch auth warning
  watch(() => authStore.authWarning, (val) => {
    if (val) {
      showBanner('error', val)
    } else {
      if (navigator.onLine) visible.value = false
    }
  }, { immediate: true })

  onUnmounted(() => {
    window.removeEventListener('online', updateOnlineStatus)
    window.removeEventListener('offline', updateOnlineStatus)
  })
})
</script>

<style scoped>
.offline-banner {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.12);
  color: #fff;
  min-width: 320px;
}
.offline-banner.info { background: #007965; }
.offline-banner.warning { background: #ff9800; }
.offline-banner.error { background: #dc3545; }
.offline-banner .banner-content { flex: 1; display:flex; flex-direction:column }
.offline-banner .message { font-size: 0.95rem; opacity: 0.95; }
.offline-banner .close-btn { background: transparent; border: none; color: #fff; font-size: 1.2rem; cursor: pointer }
</style>
