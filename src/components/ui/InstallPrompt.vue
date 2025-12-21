<template>
  <div v-if="show" class="install-prompt-overlay">
    <div class="install-card">
      <div class="install-icon-wrapper">
        <img src="/logo-momkn.png" alt="CollectPro" class="app-logo-mini" />
      </div>
      <div class="install-info">
        <h3>تثبيت CollectPro</h3>
        <p>استخدم التطبيق بشكل أسرع وأكثر استقراراً</p>
      </div>
      <div class="install-actions">
        <button class="btn-install-now" @click="install">
          تثبيت الآن
        </button>
        <button class="btn-dismiss" @click="dismiss">
          ليس الآن
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import logger from '@/utils/logger.js'

const show = ref(false)

const install = async () => {
  const promptEvent = window.deferredPrompt
  if (promptEvent) {
    promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    logger.info('Install outcome:', outcome)

    if (outcome === 'accepted') {
      localStorage.setItem('appInstalled', 'true')
      show.value = false
    }
    window.deferredPrompt = null
  }
}

const dismiss = () => {
  show.value = false
  // كتم التنبيه لمدة 24 ساعة لعدم إزعاج المستخدم
  const expiry = new Date().getTime() + (24 * 60 * 60 * 1000)
  localStorage.setItem('installPromptDismissedUntil', expiry.toString())
}

const checkPrompt = () => {
  // عدم الإظهار إذا كان مثبت بالفعل
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  if (isStandalone) return

  // التحقق من الكتم المؤقت
  const dismissedUntil = localStorage.getItem('installPromptDismissedUntil')
  if (dismissedUntil && new Date().getTime() < parseInt(dismissedUntil)) {
    return
  }

  if (window.deferredPrompt) {
    show.value = true
  }
}

let interval = null

onMounted(() => {
  // التحقق بشكل دوري أو عند الحدث
  window.addEventListener('beforeinstallprompt', () => {
    setTimeout(checkPrompt, 2000) // تأخير بسيط لتجربة أفضل
  })
  
  // فحص أولي بعد 3 ثوانٍ من التحميل
  setTimeout(checkPrompt, 3000)

  // مراقبة الحدث إذا تم التقاطه عالمياً
  interval = setInterval(() => {
    if (window.deferredPrompt && !show.value) {
      checkPrompt()
    }
  }, 5000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>

<style scoped>
.install-prompt-overlay {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  justify-content: center;
  animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.install-card {
  background: white;
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 15px;
  max-width: 500px;
  width: 100%;
  border: 1px solid rgba(0, 121, 101, 0.1);
}

.dark .install-card {
  background: #1e1e1e;
  border-color: rgba(255,255,255,0.1);
  color: white;
}

.install-icon-wrapper {
  width: 50px;
  height: 50px;
  background: #f0fdfa;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.app-logo-mini {
  width: 35px;
  height: 35px;
}

.install-info {
  flex-grow: 1;
}

.install-info h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--primary, #007965);
}

.install-info p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #666;
}

.dark .install-info p {
  color: #aaa;
}

.install-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-install-now {
  background: var(--primary, #007965);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.btn-dismiss {
  background: transparent;
  color: #888;
  border: none;
  font-size: 12px;
  cursor: pointer;
}

@keyframes slideUp {
  from { transform: translateY(100px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@media (max-width: 480px) {
  .install-card {
    padding: 12px;
    gap: 10px;
  }
  .install-info h3 { font-size: 14px; }
  .install-info p { font-size: 11px; }
  .btn-install-now { padding: 6px 12px; font-size: 12px; }
}
</style>