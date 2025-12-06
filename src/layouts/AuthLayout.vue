<template>
  <div class="login-page">
    <div class="login-container">
      <router-view />
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
/* Auth layout specific styles */
</style>