<template>
  <div class="page-container">
    <PageHeader
      title="مشاركة التحصيل"
      subtitle="مشاركة بيانات التحصيل مع مستخدمين آخرين"
      icon="🤝"
    />
    <div class="content-card">
      <h3 class="text-lg font-bold mb-4">قيد الإنشاء</h3>
      <p>هذه الصفحة قيد التطوير حاليًا. سيتم إضافة وظائف المشاركة قريبًا.</p>
    </div>
  </div>
</template>

<script setup>
import PageHeader from '@/components/layout/PageHeader.vue';
</script>

<style scoped>
.page-container {
  padding: 1rem;
}
.content-card {
  background: var(--surface-bg);
  padding: 2rem;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  text-align: center;
  color: var(--text-muted);
}
</style>
