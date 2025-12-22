<template>
  <div class="auth-layout">
    <router-view />
  </div>
</template>

<script setup>
/* لا حاجة لمنطق إضافي هنا حالياً */
</script>

<style scoped>
.auth-layout {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>