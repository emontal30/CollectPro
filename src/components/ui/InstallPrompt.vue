<template>
  <div v-if="show" class="install-prompt">
    <div class="install-prompt-content">
      <div class="install-icon">
        <img src="/logo-momkn.png" alt="CollectPro" />
      </div>

      <div class="install-text">
        <h3>تثبيت التطبيق</h3>
        <p>احصل على تجربة أفضل مع إمكانية العمل بدون اتصال</p>
      </div>

      <div class="install-buttons">
        <button class="install-btn" @click="install">
          <i class="fas fa-download"></i>
          تثبيت
        </button>
        <button class="dismiss-btn" @click="dismiss">
          <i class="fas fa-times"></i>
          لاحقاً
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useUIStore } from '@/stores/ui'
import logger from '@/utils/logger.js'

const uiStore = useUIStore()
const show = ref(false)
let deferredPrompt = null

const install = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    logger.info('Install outcome:', outcome)

    if (outcome === 'accepted') {
      localStorage.setItem('appInstalled', 'true')
      uiStore.showAlert('تم تثبيت التطبيق بنجاح!', 'success')
    }

    deferredPrompt = null
    show.value = false
  }
}

const dismiss = () => {
  show.value = false
  localStorage.setItem('installPromptDismissed', 'true')
}

const showInstallPrompt = (event) => {
  // Prevent the default browser install prompt
  event.preventDefault()
  deferredPrompt = event

  // Only show if not already dismissed and not installed
  const dismissed = localStorage.getItem('installPromptDismissed')
  const installed = localStorage.getItem('appInstalled')

  if (!dismissed && !installed) {
    // Delay showing the prompt for better UX
    setTimeout(() => {
      show.value = true
    }, 3000)
  }
}

onMounted(() => {
  // Listen for the beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', showInstallPrompt)

  // Check if app is already installed
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    localStorage.setItem('appInstalled', 'true')
  }
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', showInstallPrompt)
})
</script>

<style scoped>
/* Install prompt styles are in main.css */
</style>