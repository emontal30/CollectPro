<template>
  <div class="footer">
    <p>© <span id="year">{{ currentYear }}</span> جميع الحقوق محفوظة.</p>
    <p>تم التصميم والتطوير بواسطة | <strong style="color:#ff6600;">أيمن حافظ</strong> 💻 v2.8.3</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const currentYear = ref(new Date().getFullYear())

onMounted(() => {
  // Update year if needed
  currentYear.value = new Date().getFullYear()
})
</script>

<style scoped>
.footer {
  text-align: center;
  padding: 20px;
  margin-top: 30px;
  background: var(--primary);
  color: white;
  font-size: 14px;
  border-top-left-radius: 15px;
  border-top-right-radius: 15px;
  box-shadow: 0 -4px 10px rgba(0,0,0,0.1);
}

.footer p {
  margin: 5px 0;
  line-height: 1.4;
}

.footer strong {
  color: var(--secondary);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .footer {
    font-size: 12px;
    padding: 15px;
  }
  
  .footer p {
    margin: 3px 0;
  }
}
</style>