﻿<template>
  <div class="dashboard-page">
    
    <PageHeader 
      title="إدخال البيانات" 
      subtitle="ألصق البيانات من الحافظة ثم احفظ وانتقل لصفحة التحصيل"
      icon="📝"
    />

    <div class="input-section">
      <div class="input-container">
        <label for="dataInput" class="input-label">
          <i class="fas fa-table text-primary"></i>
          ادخل البيانات
        </label>
        <textarea 
          id="dataInput"
          v-model="store.clientData"
          placeholder="ألصق البيانات هنا..."
          class="data-input"
          rows="15"
          dir="rtl"
        ></textarea>
        <div v-if="store.clientData" class="input-info">
          <span class="char-count">{{ store.clientData.length }} حرف</span>
          <span class="line-count">{{ store.clientData.split('\n').length }} سطر</span>
        </div>
        
        <!-- شريط الحالة السفلي -->
        <transition name="slide-status">
          <div v-if="statusMessage" :class="['status-bar', statusMessage.type]">
            <!-- أيقونة ديناميكية مع تأثيرات -->
            <div class="status-icon-wrapper">
              <i v-if="statusMessage.type === 'paste'" class="fas fa-paste animate-pulse"></i>
              <i v-if="statusMessage.type === 'saving'" class="fas fa-hourglass-half animate-spin"></i>
              <i v-if="statusMessage.type === 'success'" class="fas fa-check-circle animate-bounce"></i>
              <i v-if="statusMessage.type === 'error'" class="fas fa-exclamation-circle animate-shake"></i>
            </div>
            <!-- النص مع النص الفرعي -->
            <div class="status-content">
              <span class="status-text">{{ statusMessage.message }}</span>
              <span v-if="statusMessage.subtext" class="status-subtext">{{ statusMessage.subtext }}</span>
            </div>
            <!-- خط التقدم -->
            <div v-if="statusMessage.type === 'success'" class="progress-line"></div>
          </div>
        </transition>
      </div>
    </div>

    <div class="buttons-container">
      <div class="buttons-row">
        <button class="btn btn-dashboard btn-dashboard--paste" type="button" @click="handlePaste">
          <i class="fas fa-paste"></i>
          <span>لصق البيانات</span>
        </button>

        <button class="btn btn-dashboard btn-dashboard--save" type="button" @click="handleSaveAndGo">
          <i class="fas fa-save"></i>
          <span>حفظ وانتقال لصفحة التحصيل</span>
        </button>
      </div>

      <div class="buttons-row">
        <router-link to="/app/archive" class="btn btn-dashboard btn-dashboard--archive">
          <i class="fas fa-archive"></i>
          <span>الذهاب للأرشيف</span>
        </router-link>

        <button class="btn btn-dashboard btn-dashboard--clear" type="button" @click="handleClear">
          <i class="fas fa-trash-alt"></i>
          <span>مسح البيانات</span>
        </button>
      </div>
    </div>


    <div class="help-section">
      <div class="help-card">
        <h3>📋 تعليمات الاستخدام</h3>
        <ul>
          <li>نسخ البيانات من الملف المطلوب (يجب أن تبدأ بـ "المسلسل")</li>
          <li>استخدام زر "لصق البيانات" للصق من الحافظة تلقائياً</li>
          <li>أو نسخ البيانات يدويًا والصقها في مربع النص</li>
          <li>مراجعة البيانات في مربع النص قبل الحفظ</li>
          <li>استخدام "حفظ وانتقال" للانتقال لصفحة التحصيل</li>
        </ul>
      </div>
    </div>

  </div>
</template>

<script setup>
import { inject, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useDashboardStore } from '@/stores/dashboard';
import PageHeader from '@/components/layout/PageHeader.vue';

const router = useRouter();
const store = useDashboardStore();

// نظام الإشعارات الموحد
const { confirm, addNotification } = inject('notifications');

// حالة شريط الحالة
const statusMessage = ref(null);
let statusTimeout = null;

const showStatusMessage = (type, message, subtext = null, duration = 4000) => {
  if (statusTimeout) clearTimeout(statusTimeout);
  statusMessage.value = { type, message, subtext };
  statusTimeout = setTimeout(() => { statusMessage.value = null; }, duration);
};

const handlePaste = async () => {
  try {
    await store.pasteData();
    showStatusMessage('paste', '✅ تم لصق البيانات بنجاح!', `${store.clientData.length} حرف - ${store.clientData.split('\n').length} سطر`);
  } catch (error) {
    showStatusMessage('error', '❌ فشل لصق البيانات', 'تأكد من نسخ البيانات بشكل صحيح');
  }
};

const handleClear = async () => {
  const result = await confirm({
    title: 'تأكيد مسح البيانات',
    text: 'هل أنت متأكد من مسح جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه.',
    icon: 'warning',
    confirmButtonText: 'مسح البيانات',
    confirmButtonColor: 'var(--danger)'
  });

  if (result.isConfirmed) {
    store.clearData();
    addNotification('تم مسح البيانات بنجاح', 'info');
  }
};

const handleSaveAndGo = async () => {
  try {
    showStatusMessage('saving', '⏳ جاري حفظ البيانات...', 'يرجى الانتظار');
    const result = await store.processAndSave();

    if (result.status === 'success') {
      showStatusMessage('success', '✅ تم حفظ البيانات بنجاح!', 'جاري الانتقال لصفحة التحصيلات...');
      setTimeout(() => {
        router.push('/app/harvest');
      }, 2000);
    } else {
      showStatusMessage('error', '❌ فشل في حفظ البيانات', result.message);
    }
  } catch (error) {
    showStatusMessage('error', '❌ حدث خطأ أثناء الحفظ');
  }
};

onMounted(() => {
  document.getElementById('dataInput')?.focus();
});
</script>

<style scoped>
/* Animations local to Dashboard */
.animate-pulse { animation: pulse 2s ease-in-out infinite; }
.animate-spin { animation: spin 1s linear infinite; }
.animate-bounce { animation: bounce 0.6s ease-in-out; }
.animate-shake { animation: shake 0.4s ease-in-out; }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-2px); } 75% { transform: translateX(2px); } }

.slide-status-enter-active, .slide-status-leave-active { transition: all 0.3s ease; }
.slide-status-enter-from { opacity: 0; transform: translateY(10px); }
.slide-status-leave-to { opacity: 0; transform: translateY(-10px); }
</style>
