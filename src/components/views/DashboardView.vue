<template>
  <div class="dashboard-page">
    
    <PageHeader 
      title="إدخال البيانات" 
      subtitle="ألصق البيانات من الحافظة ثم احفظ وانتقل لصفحة التحصيل"
      icon="📝"
    />

    <div class="input-section">
      <div class="input-container">
        <label for="dataInput" class="input-label">
          <i class="fas fa-table" style="color: var(--primary)"></i>
          البيانات
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

    <div class="buttons-section">
      <div class="buttons-row">
        <button id="pasteBtn" class="btn" type="button" @click="handlePaste">
          <i class="fas fa-paste"></i>
          <span>لصق البيانات</span>
        </button>

        <button id="saveGoBtn" class="btn" type="button" @click="handleSaveAndGo">
          <i class="fas fa-save"></i>
          <span>حفظ وانتقال لصفحة التحصيل</span>
        </button>
      </div>

      <div class="buttons-row">
        <router-link id="goToArchiveBtn" to="/app/archive" class="btn">
          <i class="fas fa-archive"></i>
          <span>الذهاب للأرشيف</span>
        </router-link>

        <button id="clearBtn" class="btn" type="button" @click="handleClear">
          <i class="fas fa-trash-alt"></i>
          <span>مسح البيانات</span>
        </button>
      </div>
    </div>


    <div v-if="!store.clientData" class="help-section">
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
import logger from '@/utils/logger.js'
import { useRouter } from 'vue-router';
import { useDashboardStore } from '@/stores/dashboard';
import PageHeader from '@/components/layout/PageHeader.vue';

const router = useRouter();
const store = useDashboardStore();

// نظام الإشعارات الموحد
const { confirm, addNotification, messages, closeLoading } = inject('notifications');

// حالة شريط الحالة
const statusMessage = ref(null);
let statusTimeout = null;

const showStatusMessage = (type, message, subtext = null, duration = 4000) => {
  // إلغاء أي timeout سابق
  if (statusTimeout) clearTimeout(statusTimeout);
  
  statusMessage.value = {
    type,
    message,
    subtext
  };
  
  // إخفاء الرسالة بعد المدة المحددة
  statusTimeout = setTimeout(() => {
    statusMessage.value = null;
  }, duration);
};

const handlePaste = async () => {
  try {
    await store.pasteData();
    // عرض شريط الحالة مع تأثير النبض
    showStatusMessage(
      'paste',
      '✅ تم لصق البيانات بنجاح!',
      `${store.clientData.length} حرف - ${store.clientData.split('\n').length} سطر`,
      3500
    );
  } catch (error) {
    // عرض خطأ في الشريط
    showStatusMessage(
      'error',
      '❌ فشل لصق البيانات',
      'تأكد من نسخ البيانات بشكل صحيح من الملف المطلوب',
      5000
    );
  }
};

const handleClear = async () => {
  const result = await confirm({
    title: 'تأكيد مسح البيانات',
    text: 'هل أنت متأكد من مسح جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه.',
    icon: 'warning',
    confirmButtonText: 'مسح البيانات',
    confirmButtonColor: '#dc3545'
  });

  if (result.isConfirmed) {
    store.clearData();
    addNotification('تم مسح البيانات بنجاح', 'info');
  }
};

const handleSaveAndGo = async () => {
  try {
    // عرض حالة الحفظ في الشريط
    showStatusMessage(
      'saving',
      '⏳ جاري حفظ البيانات...',
      'يرجى الانتظار',
      10000
    );
    
    const result = await store.processAndSave();

    if (result.status === 'success') {
      // عرض رسالة النجاح مع التأثير البديع
      showStatusMessage(
        'success',
        '✅ تم حفظ البيانات بنجاح!',
        'جاري الانتقال لصفحة التحصيلات...',
        3000
      );
      
      // التوجه بدون تأخير
      setTimeout(() => {
        router.push('/app/harvest');
      }, 2500);
    } else if (result.status === 'error') {
      showStatusMessage(
        'error',
        '❌ فشل في حفظ البيانات',
        result.message || 'حدث خطأ أثناء العملية',
        5000
      );
    }
  } catch (error) {
    logger.error('Save error:', error);
    showStatusMessage(
      'error',
      '❌ حدث خطأ أثناء الحفظ',
      'تأكد من البيانات ثم حاول مرة أخرى',
      5000
    );
  }
};

onMounted(() => {
  // Auto-focus the textarea when component mounts
  const textarea = document.getElementById('dataInput');
  if (textarea) {
    textarea.focus();
  }
  // بدون إشعارات عند الدخول - تحميل صامت
});
</script>

<style scoped>
/* All styles imported from _unified-components.css */

/* تنسيق صفوف الأزرار */
.buttons-row {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 12px;
}

.buttons-row:last-child {
  margin-bottom: 0;
}

/* شريط الحالة السفلي - تصميم احترافي حديث */
.status-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  margin-top: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid transparent;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

/* الأيقونة مع التأثيرات */
.status-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  font-size: 18px;
}

.status-icon-wrapper i {
  display: block;
}

/* المحتوى */
.status-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.status-text {
  font-weight: 600;
  letter-spacing: 0.3px;
}

.status-subtext {
  font-size: 12px;
  opacity: 0.85;
}

/* خط التقدم المتحرك */
.progress-line {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, currentColor, transparent);
  animation: progressMove 2s ease-in-out infinite;
}

/* نوع اللصق - أزرق فاتح */
.status-bar.paste {
  background: linear-gradient(135deg, rgba(23, 162, 184, 0.12), rgba(0, 123, 255, 0.12));
  color: #17a2b8;
  border-color: rgba(23, 162, 184, 0.3);
}

/* نوع الحفظ - برتقالي */
.status-bar.saving {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.12), rgba(255, 152, 0, 0.12));
  color: #ff9800;
  border-color: rgba(255, 152, 0, 0.3);
}

/* نوع النجاح - أخضر */
.status-bar.success {
  background: linear-gradient(135deg, rgba(40, 167, 69, 0.12), rgba(32, 201, 151, 0.12));
  color: #28a745;
  border-color: rgba(40, 167, 69, 0.3);
}

/* نوع الخطأ - أحمر */
.status-bar.error {
  background: linear-gradient(135deg, rgba(220, 53, 69, 0.12), rgba(255, 107, 107, 0.12));
  color: #dc3545;
  border-color: rgba(220, 53, 69, 0.3);
}

/* الوضع الليلي */
/* Night mode rules migrated to src/assets/css/unified-dark-mode.css */
/* التأثيرات المتحركة */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

@keyframes progressMove {
  0% { width: 0%; }
  50% { width: 100%; }
  100% { width: 0%; }
}

.animate-pulse { animation: pulse 2s ease-in-out infinite; }
.animate-spin { animation: spin 1s linear infinite; }
.animate-bounce { animation: bounce 0.6s ease-in-out; }
.animate-shake { animation: shake 0.4s ease-in-out; }

/* انتقال سلس */
.slide-status-enter-active,
.slide-status-leave-active {
  transition: all 0.3s ease;
}

.slide-status-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.slide-status-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>