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
      </div>
    </div>

    <div class="buttons-section">
      <div class="buttons">
        <button id="pasteBtn" class="btn" type="button" @click="handlePaste">
          <i class="fas fa-paste"></i>
          <span>لصق البيانات</span>
        </button>
        
        <button id="saveGoBtn" class="btn" type="button" @click="handleSaveAndGo">
          <i class="fas fa-save"></i>
          <span>حفظ وانتقال لصفحة التحصيل</span>
        </button>
        
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

    <div v-if="statusMessage" class="status-section">
      <div class="status-message" :class="statusType">
        <i :class="getStatusIcon()"></i>
        <span>{{ statusMessage }}</span>
      </div>
    </div>

    <div v-if="!store.clientData" class="help-section">
      <div class="help-card">
        <h3>📋 تعليمات الاستخدام</h3>
        <ul>
          <li>نسخ البيانات من الملف المطلوب (يجب أن تبدأ بـ "المسلسل")</li>
          <li>استخدام زر "لصق البيانات" للصق من الحافظة تلقائياً</li>
          <li>أو نسخ البيانات يدوياً ولصقها في مربع النص</li>
          <li>مراجعة البيانات في مربع النص قبل الحفظ</li>
          <li>استخدام "حفظ وانتقال" للانتقال لصفحة التحصيل</li>
        </ul>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useDashboardStore } from '@/stores/dashboard';
import BaseButton from '@/components/ui/BaseButton.vue';
import PageHeader from '@/components/layout/PageHeader.vue';

const router = useRouter();
const store = useDashboardStore();

const isProcessing = ref(false);
const statusMessage = ref('');
const statusType = ref('info'); // info, success, error, warning

const handlePaste = async () => {
  isProcessing.value = true;
  statusMessage.value = '';
  
  try {
    await store.pasteData();
    statusMessage.value = 'تم لصق البيانات بنجاح!';
    statusType.value = 'success';
  } catch (error) {
    statusMessage.value = 'فشل لصق البيانات: ' + error.message;
    statusType.value = 'error';
  } finally {
    isProcessing.value = false;
  }
};

const handleClear = () => {
  if(confirm("هل أنت متأكد من مسح البيانات؟")) {
    store.clearData();
    statusMessage.value = 'تم مسح البيانات بنجاح';
    statusType.value = 'info';
  }
};

const handleSaveAndGo = () => {
  const result = store.processAndSave();
  if (result.status === 'success') {
    statusMessage.value = 'تم حفظ البيانات بنجاح!';
    statusType.value = 'success';
    setTimeout(() => {
      router.push('/app/harvest');
    }, 1000);
  } else if (result.status === 'error') {
    statusMessage.value = result.message;
    statusType.value = 'error';
  }
};

const showStatus = (message, type) => {
  statusMessage.value = message;
  statusType.value = type;
  
  // Auto hide status message after 5 seconds
  setTimeout(() => {
    statusMessage.value = '';
  }, 5000);
};

const getStatusIcon = () => {
  switch (statusType.value) {
    case 'success': return 'fas fa-check-circle';
    case 'error': return 'fas fa-exclamation-circle';
    case 'warning': return 'fas fa-exclamation-triangle';
    default: return 'fas fa-info-circle';
  }
};

onMounted(() => {
  // Auto-focus the textarea when component mounts
  const textarea = document.getElementById('dataInput');
  if (textarea) {
    textarea.focus();
  }
});
</script>

<style scoped>
.dashboard-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  animation: fadeIn 0.5s ease-in-out;
  font-family: 'Cairo', sans-serif;
  overflow-x: hidden;
  width: 100%;
  box-sizing: border-box;
}

/* Input Section */
.input-section {
  margin-bottom: 40px;
}

.input-container {
  background: white;
  padding: 30px;
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 121, 101, 0.1);
  transition: all 0.3s ease;
}

.input-container:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.input-label {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 700;
  font-size: 1.3rem;
  color: var(--primary, #007965);
  margin-bottom: 20px;
  direction: rtl;
}

.input-label i {
  background: rgba(0, 121, 101, 0.1);
  padding: 10px;
  border-radius: 10px;
  font-size: 1.2rem;
}

.data-input {
  width: 100%;
  padding: 25px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 1.1rem;
  font-family: 'Courier New', monospace;
  direction: rtl;
  text-align: right;
  resize: vertical;
  min-height: 350px;
  transition: all 0.3s ease;
  background: #f8f9fa;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  box-sizing: border-box;
}

.data-input:focus {
  outline: none;
  border-color: var(--primary, #007965);
  box-shadow: 0 0 0 4px rgba(0, 121, 101, 0.1);
  background: white;
}

.input-info {
  display: flex;
  gap: 20px;
  margin-top: 15px;
  font-size: 0.95rem;
  color: #666;
  direction: rtl;
}

.char-count, .line-count {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 8px 15px;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  font-weight: 600;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

/* Buttons Section */
.buttons-section {
  margin-bottom: 40px;
}

.buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  margin-top: 25px;
}

/* --- التنسيق الأساسي للأزرار (.btn) --- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 24px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, #007965, #005a4b); /* التدرج الأخضر الأصلي */
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  font-family: 'Cairo', sans-serif;
  box-shadow: 0 4px 15px rgba(0, 121, 101, 0.3);
  position: relative;
  overflow: hidden;
  min-height: 50px;
  /* تنسيق الأيقونة والنص عمودياً كما في التصميم */
  flex-direction: column; 
  text-align: center;
  margin: 8px;
  min-width: 150px; /* لضمان عرض مناسب */
}

/* تأثير اللمعان عند التحويم */
.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s ease;
}

.btn:hover {
  background: linear-gradient(135deg, #f39c12, #d68910); /* يتحول للبرتقالي عند التحويم */
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 8px 25px rgba(243, 156, 18, 0.4);
}

.btn:hover::before {
  left: 100%;
}

.btn:active {
  transform: translateY(0);
}

/* تنسيق الأيقونة داخل الزر */
.btn i {
  font-size: 1.4em;
  margin-bottom: 4px;
  transition: color 0.3s ease;
}

/* تنسيق النص داخل الزر */
.btn span {
  font-size: 0.9em;
  line-height: 1.2;
}

/* --- تخصيص ألوان الأيقونات لكل زر (نقل دقيق من style.css) --- */

/* زر اللصق (أخضر فاتح) */
#pasteBtn i {
  color: #90EE90 !important; 
}

/* زر الحفظ (برتقالي) */
#saveGoBtn i {
  color: #FFA500 !important; 
}

/* زر الأرشيف (رمادي فاتح) */
#goToArchiveBtn i {
  color: #D3D3D3 !important; 
}

/* زر المسح (أحمر) */
#clearBtn i {
  color: #DC143C !important; 
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

/* Status Section */
.status-section {
  margin-bottom: 40px;
}

.status-message {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px 25px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1.1rem;
  direction: rtl;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.3s ease;
}

.status-message.success {
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  color: #155724;
  border: 1px solid #b8daff;
}

.status-message.error {
  background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
  color: #721c24;
  border: 1px solid #f1b0b7;
}

.status-message.warning {
  background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
  color: #856404;
  border: 1px solid #ffd394;
}

.status-message.info {
  background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%);
  color: #0c5460;
  border: 1px solid #abdde5;
}

.status-message i {
  font-size: 1.3rem;
}

/* All dark mode styles are now handled by unified-dark-mode.css */

/* Help Section */
.help-section {
  margin-top: 40px;
}

.help-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 30px;
  border-radius: 16px;
  border: 2px solid #dee2e6;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.help-card h3 {
  color: var(--primary, #007965);
  margin-bottom: 20px;
  text-align: center;
  font-size: 1.4rem;
  font-weight: 700;
}

.help-card ul {
  list-style: none;
  padding: 0;
  direction: rtl;
}

.help-card li {
  padding: 12px 0;
  border-bottom: 1px solid #dee2e6;
  position: relative;
  padding-right: 25px;
  font-size: 1.05rem;
  line-height: 1.6;
  color: #495057;
}

.help-card li:before {
  content: "🎯";
  position: absolute;
  right: 0;
  font-size: 1rem;
}

.help-card li:last-child {
  border-bottom: none;
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Mobile Responsiveness */
@media (max-width: 1024px) {
  .dashboard-page {
    padding: 20px;
  }
  
  .header-section h1 {
    font-size: 2.2rem;
  }
  
  .data-input {
    padding: 22px;
    font-size: 1.05rem;
  }
  
  .buttons {
    gap: 15px;
  }
}

@media (max-width: 768px) {
  .dashboard-page {
    padding: 15px;
    overflow-x: hidden;
  }
  
  .header-section {
    padding: 20px;
    overflow: hidden;
  }
  
  .header-section h1 {
    font-size: 2rem;
  }
  
  .subtitle {
    font-size: 1rem;
  }
  
  .buttons {
    flex-direction: row;
    gap: 15px;
  }

  .btn {
    width: auto;
    padding: 12px 16px;
    font-size: 14px;
    flex-direction: row; /* في الموبايل تصبح الأيقونة بجانب النص */
    min-height: 48px;
  }
  
  .btn i {
    margin-bottom: 0;
    font-size: 1.2em;
  }
  
  .input-info {
    flex-direction: column;
    gap: 10px;
  }
  
  .data-input {
    min-height: 250px;
    padding: 20px;
    font-size: 1rem;
  }
  
  .input-container {
    padding: 20px;
    overflow: hidden;
  }
}

@media (max-width: 480px) {
  .dashboard-page {
    padding: 10px;
  }
  
  .header-section {
    padding: 15px;
  }
  
  .header-section h1 {
    font-size: 1.5rem;
  }
  
  .subtitle {
    font-size: 0.9rem;
  }
  
  .buttons {
    flex-direction: column;
    align-items: stretch;
  }
  
  .btn {
    width: 100%;
    margin: 5px 0;
  }
  
  .input-container {
    padding: 15px;
    overflow: hidden;
  }
  
  .data-input {
    padding: 15px;
    min-height: 200px;
    font-size: 0.95rem;
  }
  
  .help-card {
    padding: 20px;
    overflow: hidden;
  }
  
  .help-card li {
    font-size: 0.95rem;
  }
}

@media (max-width: 360px) {
  .dashboard-page {
    padding: 8px;
  }
  
  .header-section {
    padding: 12px;
  }
  
  .header-section h1 {
    font-size: 1.3rem;
  }
  
  .subtitle {
    font-size: 0.85rem;
  }
  
  .input-container {
    padding: 12px;
  }
  
  .data-input {
    padding: 12px;
    min-height: 180px;
    font-size: 0.9rem;
  }
  
  .help-card {
    padding: 15px;
  }
  
  .help-card li {
    font-size: 0.9rem;
  }
}

</style>