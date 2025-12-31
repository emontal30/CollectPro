<template>
  <div class="footer">
    <div class="footer-content">
      <p class="copyright">© <span id="year">{{ currentYear }}</span> جميع الحقوق محفوظة.</p>
      <p class="developer-info">
        تم التصميم والتطوير بواسطة | <strong class="developer-name">أيمن حافظ</strong> 💻
        <span class="footer-separator">|</span>
        <span class="version-badge">v2.9.8</span>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const currentYear = ref(new Date().getFullYear())

onMounted(() => {
  currentYear.value = new Date().getFullYear()
})
</script>

<style scoped>
.footer {
  text-align: center;
  padding: 15px 15px;
  margin-top: 40px;
  background: var(--footer-bg, var(--primary));
  color: white;
  font-size: 13px;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  box-shadow: 0 -4px 15px rgba(0,0,0,0.1);
  position: relative;
  z-index: 10;
  width: 100%;
  /* ضمان أن الخلفية تغطي العرض الكامل المطلوب */
  min-width: var(--app-min-width, 768px);
  transition: background 0.3s ease;
}

.footer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  width: 100%;
  max-width: var(--app-min-width, 768px);
  margin: 0 auto;
}

.footer p {
  margin: 2px 0;
  line-height: 1.5;
  letter-spacing: 0.3px;
}

.developer-name {
  color: #ff9f43;
  font-weight: 700;
}

.version-badge {
  background: rgba(255, 255, 255, 0.12);
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11px;
}
</style>