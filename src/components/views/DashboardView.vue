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
        
        <transition name="slide-status">
          <div v-if="statusMessage" :class="['status-bar', statusMessage.type]">
            <div class="status-icon-wrapper">
              <i v-if="statusMessage.type === 'paste'" class="fas fa-paste animate-pulse"></i>
              <i v-if="statusMessage.type === 'saving'" class="fas fa-hourglass-half animate-spin"></i>
              <i v-if="statusMessage.type === 'success'" class="fas fa-check-circle animate-bounce"></i>
              <i v-if="statusMessage.type === 'error'" class="fas fa-exclamation-circle animate-shake"></i>
            </div>
            <div class="status-content">
              <span class="status-text">{{ statusMessage.message }}</span>
              <span v-if="statusMessage.subtext" class="status-subtext">{{ statusMessage.subtext }}</span>
            </div>
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
      <div class="help-card help-card--tabs">
        <div class="instructions-header">
          <div class="instructions-title">
             <div class="pulse-icon">
               <i class="fas fa-book-open"></i>
             </div>
             <h3>تعليمات الاستخدام <span class="important-text">( هام )</span></h3>
          </div>
        </div>

        <div class="help-tabs">
          <button 
            :class="['tab-btn', { active: activeTab === 'manual' }]" 
            @click="activeTab = 'manual'"
          >
            <i class="fas fa-pen-to-square"></i>
            نسخ يدوي
          </button>
          <button 
            :class="['tab-btn', { active: activeTab === 'auto' }]" 
            @click="activeTab = 'auto'"
          >
            <i class="fas fa-wand-magic-sparkles"></i>
            نسخ تلقائي (احترافي)
          </button>
        </div>

        <div class="tab-content" v-if="activeTab === 'manual'">
          <h3 class="tab-title">📋 تعليمات النسخ اليدوي</h3>
          <ul class="help-list">
          <li>قم بالدخول على موقع  "ممكن" وادخل على التقارير واضبط تاريخ التحصيله بعنايه</li>
          <li>نسخ بيانات التحصيل بدقه عن طريق التحديد  (يجب أن تبدأ بـ "المسلسل الى نهايه الجدول")</li>
          <li>استخدام زر "لصق البيانات"هنا للصق من الحافظة تلقائياً</li>
          <li>أو نسخ البيانات يدويًا والصقها في مربع النص</li>
          <li>مراجعة البيانات في مربع النص قبل الحفظ</li>
          <li>استخدام "حفظ وانتقال" للانتقال لصفحة التحصيل</li>
        </ul>
        </div>

        <div class="tab-content auto-instructions" v-else>
          <h3 class="tab-title">🚀 النسخ التلقائي الاحترافي</h3>
          
          <div class="instruction-steps">
            <div class="istep">
              <div class="istep-num">1</div>
              <div class="istep-content">
                <h4>تنزيل متصفح Kiwi Browser</h4>
                <p>قم بتنزيل متصفح Kiwi Browser من خلال الرابط التالي:</p>
                <a href="https://kiwi-browser.latestmodapks.com/" target="_blank" class="instruction-link kiwi-bg">
                  <img src="/instructions/kiwi.png" alt="Kiwi" class="link-img" />
                  <span>اضغط هنا للتحميل المباشر</span>
                </a>
                <p class="small-text">عند الضغط على أيقونة Kiwi سيتم تحويلك مباشرة إلى صفحة التنزيل.</p>
              </div>
            </div>

            <div class="istep">
              <div class="istep-num">2</div>
              <div class="istep-content">
                <h4>تثبيت متصفح Kiwi</h4>
                <p>بعد اكتمال التحميل، قم بتثبيت التطبيق على جهازك.</p>
                <div class="security-note">
                  <i class="fas fa-shield-alt"></i>
                  في حال ظهور رسالة أمان، يرجى السماح بالتثبيت من مصادر غير معروفة.
                </div>
              </div>
            </div>

            <div class="istep">
              <div class="istep-num">3</div>
              <div class="istep-content">
                <h4>تثبيت أداة Table Capture</h4>
                <p>بعد تثبيت متصفح Kiwi، افتح الرابط التالي <strong>باستخدام متصفح Kiwi فقط</strong>:</p>
                <a href="https://chromewebstore.google.com/detail/table-capture/iebpjdmgckacbodjpijphcplhebcmeop" target="_blank" class="instruction-link table-bg">
                  <i class="fas fa-file-invoice link-icon"></i>
                  <span>إضافة Table Capture إلى المتصفح</span>
                </a>
                <p>اضغط على <strong>Add to Chrome / إضافة إلى Chrome</strong>.</p>
              </div>
            </div>

            <div class="istep">
              <div class="istep-num">4</div>
              <div class="istep-content">
                <h4>نسخ جدول البيانات</h4>
                <ul class="sub-steps">
                  <li>من خلال متصفح Kiwi، انتقل إلى صفحة التقارير فى موقع "ممكن" واضبط تاريخ التحصيل المراد نسخه.</li>
                  <li>قم بضبط التاريخ المطلوب.</li>
                  <li>اضغط على قائمة الثلاث نقاط (⋮) أعلى المتصفح.</li>
                  <li>من القائمة الجانبية، مرّر لأسفل واختر <strong>Table Capture</strong>.</li>
                  <li>اضغط على علامة ( + ) كما هو موضح بالصورة:</li>
                </ul>
                <div class="table-img-container">
                  <img src="/instructions/table.png" alt="Table Capture Step" class="table-instruction-img" />
                </div>
                <p class="success-msg">تم الآن نسخ الجدول بنجاح، ويمكنك لصقه مباشرة هنا او الضغط على لصق البيانات.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { inject, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useDashboardStore } from '@/stores/dashboard';
import { useItineraryStore } from '@/stores/itineraryStore'; // إضافة store خط السير
import { useHarvestStore } from '@/stores/harvest';
import PageHeader from '@/components/layout/PageHeader.vue';

const router = useRouter();
const store = useDashboardStore();
const itineraryStore = useItineraryStore(); // تعريف الـ store
const harvestStore = useHarvestStore();

const activeTab = ref('manual');

const { confirm, addNotification } = inject('notifications');

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
    // First, check if there's data in the harvest page
    if (harvestStore.hasData) {
      const { isConfirmed } = await confirm({
        title: 'تحذير: بيانات موجودة',
        text: 'هناك بيانات فى صفحه التحصيلات تاكد من ارشفتها اولا , لان بهذا الاجراء سيتم فقدها واستبدالها بالبيانات الحاليه',
        icon: 'warning',
        confirmButtonText: 'متابعة واستبدال',
        cancelButtonText: 'إلغاء',
        showCancelButton: true,
      });

      if (!isConfirmed) {
        addNotification('تم إلغاء العملية.', 'info');
        return; // Abort if user cancels
      }
    }

    showStatusMessage('saving', '⏳ جاري حفظ البيانات...', 'يرجى الانتظار');
    
    // Proceed with processing and saving
    const result = await store.processAndSave();

    if (result.status === 'success') {
      // Sync data with Itinerary Store
      if (result.routeData && result.routeData.length > 0) {
        await itineraryStore.syncFromDashboard(result.routeData);
      }

      showStatusMessage('success', '✅ تم حفظ البيانات بنجاح!', 'جاري الانتقال لصفحة التحصيلات...');
      setTimeout(() => {
        router.push('/app/harvest');
      }, 2000);
    } else {
      showStatusMessage('error', '❌ فشل في حفظ البيانات', result.message);
    }
  } catch (error) {
    console.error('Save error:', error);
    showStatusMessage('error', '❌ حدث خطأ أثناء الحفظ');
  }
};

onMounted(() => {
  document.getElementById('dataInput')?.focus();
});
</script>

<script>
export default {
  name: 'DashboardView'
}
</script>

<style scoped>
/* Instructions Header Styling */
.instructions-header {
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.15) 0%, rgba(var(--primary-rgb), 0.05) 50%, rgba(var(--primary-rgb), 0.15) 100%);
  border-bottom: 2px solid var(--border-color);
  position: relative;
  overflow: hidden;
}

.instructions-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--primary), transparent);
}

.instructions-title {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
}

.instructions-title h3 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.5px;
}

.important-text {
  color: var(--danger);
  font-weight: 900;
  text-shadow: 0 0 10px rgba(231, 76, 60, 0.2);
  margin-right: 8px;
}

.pulse-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  box-shadow: 0 4px 15px rgba(var(--primary-rgb), 0.3);
  animation: pulse-glow 2s infinite;
  flex-shrink: 0;
}

@keyframes pulse-glow {
  0% { transform: scale(1); box-shadow: 0 4px 15px rgba(var(--primary-rgb), 0.3); }
  50% { transform: scale(1.05); box-shadow: 0 4px 25px rgba(var(--primary-rgb), 0.5); }
  100% { transform: scale(1); box-shadow: 0 4px 15px rgba(var(--primary-rgb), 0.3); }
}

.help-card--tabs {
  padding: 0 !important;
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: var(--surface-bg);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
}

.help-tabs {
  display: flex;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.tab-btn {
  flex: 1;
  padding: 1.25rem;
  border: none;
  background: none;
  color: var(--text-muted);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: var(--transition);
  font-size: 1rem;
}

.tab-btn.active {
  color: var(--primary);
  background: var(--surface-bg);
  border-bottom: 4px solid var(--primary);
}

.tab-btn i {
  font-size: 1.2rem;
}

.tab-content {
  padding: 2rem;
  animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-title {
  margin-bottom: 1.5rem;
  color: var(--text-main);
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.help-list {
  list-style: none;
  padding: 0;
}

.help-list li {
  padding: 10px 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: var(--text-main);
  line-height: 1.5;
}

.help-list li::before {
  content: '✦';
  color: var(--primary);
  font-weight: bold;
}

.instruction-steps {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.istep {
  display: flex;
  gap: 20px;
  position: relative;
}

.istep-num {
  width: 36px;
  height: 36px;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.2);
}

.istep-content h4 {
  margin-bottom: 10px;
  color: var(--primary);
  font-size: 1.1rem;
}

.istep-content p {
  margin-bottom: 12px;
  line-height: 1.6;
  color: var(--text-main);
}

.instruction-link {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  border-radius: 14px;
  text-decoration: none;
  color: white !important;
  font-weight: bold;
  transition: var(--transition);
  margin: 8px 0;
}

.kiwi-bg { background: linear-gradient(135deg, #35b6ab, #2a9289); }
.table-bg { background: linear-gradient(135deg, #4285f4, #3367d6); }

.instruction-link:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 15px rgba(0,0,0,0.15);
}

.link-img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.link-icon {
  font-size: 24px;
}

.small-text {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 6px;
}

.security-note {
  background: rgba(var(--warning-rgb), 0.08);
  border-right: 5px solid var(--warning);
  padding: 15px;
  border-radius: 12px;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 12px;
}

.sub-steps {
  padding-right: 20px;
  margin-bottom: 15px;
}

.sub-steps li {
  margin-bottom: 8px;
}

.table-img-container {
  background: var(--light-bg);
  padding: 20px;
  border-radius: 16px;
  border: 2px dashed var(--border-color);
  text-align: center;
  margin: 20px 0;
}

.table-instruction-img {
  max-width: 100%;
  height: auto;
  border-radius: 10px;
  box-shadow: 0 8px 25px rgba(0,0,0,0.12);
}

.success-msg {
  color: var(--success);
  font-weight: 700;
  text-align: center;
  margin-top: 15px;
  padding: 10px;
  background: rgba(var(--success-rgb), 0.1);
  border-radius: 8px;
}

.slide-status-enter-active, .slide-status-leave-active { transition: all 0.3s ease; }
.slide-status-enter-from { opacity: 0; transform: translateY(10px); }
.slide-status-leave-to { opacity: 0; transform: translateY(-10px); }

@media (max-width: 768px) {
  .help-tabs {
    flex-direction: row;
  }
  .tab-btn {
    padding: 1rem 0.5rem;
    font-size: 0.85rem;
    gap: 5px;
  }
  .instructions-title {
    gap: 10px;
  }
  .instructions-title h3 {
    font-size: 1.15rem;
  }
  .pulse-icon {
    width: 38px;
    height: 38px;
    font-size: 1.1rem;
  }
}
</style>