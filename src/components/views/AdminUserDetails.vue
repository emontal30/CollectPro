<template>
  <div class="admin-user-details p-4">
    <PageHeader 
      title="تفاصيل المستخدم" 
      :subtitle="user?.full_name || 'جاري التحميل...'"
      icon="👤"
    >
      <template #actions>
        <button class="btn btn-secondary" @click="goBack">
          <i class="fas fa-arrow-right ml-1"></i> عودة
        </button>
      </template>
    </PageHeader>

    <div v-if="loading" class="text-center p-5">
      <i class="fas fa-spinner fa-spin fa-2x text-primary"></i>
      <p class="mt-2 text-muted">جاري تحميل بيانات المستخدم...</p>
    </div>

    <div v-else-if="error" class="alert alert-danger">
      <i class="fas fa-exclamation-triangle"></i> {{ error }}
      <button class="btn btn-sm btn-outline-danger mr-3" @click="fetchUserDetails">إعادة المحاولة</button>
    </div>

    <div v-else-if="user" class="details-content fade-in">
      
      <!-- User Info Card -->
      <section class="admin-section mb-4">
        <div class="admin-section-header">
          <h2><i class="fas fa-info-circle"></i> المعلومات الأساسية</h2>
        </div>
        <div class="info-grid p-3">
          <div class="info-item">
            <label>الاسم الكامل:</label>
            <div class="font-bold">{{ user.full_name || 'غير متوفر' }}</div>
          </div>
          <div class="info-item">
            <label>البريد الإلكتروني:</label>
            <div class="font-bold copy-text" @click="copy(user.email)">
              {{ user.email }} <i class="fas fa-copy text-muted text-xs"></i>
            </div>
          </div>
          <div class="info-item">
            <label>معرف المستخدم (User Code):</label>
            <div class="font-mono text-primary font-bold copy-text" @click="copy(user.user_code)">
              {{ user.user_code || '---' }} <i class="fas fa-copy text-muted text-xs"></i>
            </div>
          </div>
          <div class="info-item">
            <label>المعرف الداخلي (UUID):</label>
            <div class="font-mono text-xs text-muted copy-text" @click="copy(user.id)">
              {{ user.id }} <i class="fas fa-copy text-muted text-xs"></i>
            </div>
          </div>
          <div class="info-item">
            <label>تاريخ التسجيل:</label>
            <div>{{ formatDate(user.created_at) }}</div>
          </div>
           <div class="info-item">
            <label>آخر ظهور:</label>
            <div>{{ formatDate(user.last_sign_in_at) }}</div>
          </div>
        </div>
      </section>

      <!-- Subscription Card -->
      <section class="admin-section mb-4">
        <div class="admin-section-header d-flex justify-between">
          <h2><i class="fas fa-star"></i> حالة الاشتراك</h2>
          <span class="status-badge" :class="hasActiveSub ? 'status-active' : 'status-expired'">
            {{ hasActiveSub ? 'نشط' : 'غير نشط' }}
          </span>
        </div>
        <div class="p-3">
          <div v-if="subscription">
            <div class="info-grid">
              <div class="info-item">
                <label>الخطة:</label>
                <div class="font-bold text-primary">{{ subscription.plan_name || 'مخصص' }}</div>
              </div>
              <div class="info-item">
                <label>تاريخ البدء:</label>
                <div>{{ formatDate(subscription.start_date) }}</div>
              </div>
              <div class="info-item">
                <label>تاريخ الانتهاء:</label>
                <div class="font-bold" :class="isExpiringSoon ? 'text-warning' : (hasActiveSub ? 'text-success' : 'text-danger')">
                  {{ formatDate(subscription.end_date) }}
                </div>
              </div>
              <div class="info-item">
                <label>الأيام المتبقية:</label>
                <div class="font-bold">{{ remainingDays }} يوم</div>
              </div>
            </div>
          </div>
          <div v-else class="text-center p-3 text-muted">
            لا يوجد اشتراك نشط حالياً.
          </div>
          
          <div class="actions mt-3 pt-3 border-top d-flex gap-2">
            <div class="input-with-notch" style="max-width: 150px;">
              <input v-model.number="manualDays" type="number" class="editable-input w-full no-spin" placeholder="أيام">
              <button class="btn-notch-sign" @click="manualDays = -1 * manualDays">-</button>
            </div>
             <button class="btn btn-primary btn-sm" @click="handleManualActivation">
               <i class="fas fa-play-circle"></i> تحديث الاشتراك
             </button>
          </div>
        </div>
      </section>

      <!-- Errors/Support Card -->
      <section class="admin-section">
        <div class="admin-section-header">
          <h2><i class="fas fa-tools"></i> الدعم الفني وسجل الأخطاء</h2>
        </div>
        <div class="p-3">
           <div class="support-actions d-flex gap-2 mb-4">
              <button class="btn btn-outline-primary flex-1" @click="runRepair">
                <i class="fas fa-magic"></i> إصلاح الحساب
              </button>
              <button class="btn btn-outline-warning flex-1" @click="clearCache">
                <i class="fas fa-eraser"></i> مسح الكاش
              </button>
              <button class="btn btn-outline-danger flex-1" @click="forceLogout">
                <i class="fas fa-sign-out-alt"></i> خروج إجباري
              </button>
           </div>
           
           <h4 class="text-sm font-bold mb-2 border-bottom pb-1">سجل الأخطاء الحديثة</h4>
           <div v-if="userErrors.length === 0" class="text-muted text-center p-2 text-sm">
             سجل نظيف ✅
           </div>
           <div v-else class="error-list">
             <div v-for="err in userErrors" :key="err.id" class="error-item bg-light p-2 rounded mb-1 border-danger border-start border-3">
               <div class="d-flex justify-between">
                 <span class="text-danger font-bold text-xs">{{ err.error_message }}</span>
                 <span class="text-muted text-xs">{{ formatDate(err.created_at) }}</span>
               </div>
               <div class="text-xs text-muted truncate mt-1">{{ err.context?.url || 'No URL' }}</div>
             </div>
           </div>
        </div>
      </section>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import { supabase } from '@/supabase';
import { TimeService } from '@/utils/time';
import logger from '@/utils/logger';
import { useAdminStore } from '@/stores/adminStore';

const route = useRoute();
const router = useRouter();
const store = useAdminStore();
const { addNotification, confirm } = inject('notifications');

const userId = route.params.id;
const user = ref(null);
const subscription = ref(null);
const userErrors = ref([]);
const loading = ref(true);
const error = ref(null);
const manualDays = ref(30);

const hasActiveSub = computed(() => {
  if (!subscription.value) return false;
  return subscription.value.status === 'active' && new Date(subscription.value.end_date) > new Date();
});

const remainingDays = computed(() => {
  if (!subscription.value?.end_date) return 0;
  return TimeService.calculateDaysRemaining(subscription.value.end_date);
});

const isExpiringSoon = computed(() => remainingDays.value > 0 && remainingDays.value <= 7);

async function fetchUserDetails() {
  if (!userId) {
    error.value = 'معرف المستخدم غير موجود';
    return;
  }
  
  loading.value = true;
  error.value = null;

  // ⚡ CRITICAL FIX: Add timeout protection (15s max)
  const FETCH_TIMEOUT = 15000;
  
  try {
    await Promise.race([
      // Main fetch logic
      (async () => {
        // 1. Fetch Profile/User Data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError && profileError.code !== 'PGRST116') throw profileError;
        
        // Try to find in admin store cache first (faster)
        let cachedUser = store.usersList.find(u => u.id === userId);
        
        if (cachedUser) {
          user.value = cachedUser;
        } else if (profileData) {
          user.value = profileData;
        } else {
          // Fallback: try to fetch from rpc
          const { data: userData } = await supabase.rpc('get_user_by_id', { target_id: userId });
          if (userData) user.value = userData;
          else throw new Error('لم يتم العثور على المستخدم');
        }

        // 2. Fetch Subscription
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*, subscription_plans(name_ar)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (subData) {
          subscription.value = {
            ...subData,
            plan_name: subData.subscription_plans?.name_ar || subData.plan_name
          };
        }

        // 3. Fetch Errors
        const { data: errorsData } = await supabase
          .from('app_errors')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);

        userErrors.value = errorsData || [];
      })(),
      
      // Timeout promise
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('FETCH_TIMEOUT')), FETCH_TIMEOUT)
      )
    ]);

  } catch (err) {
    const isTimeout = err.message === 'FETCH_TIMEOUT';
    
    if (isTimeout) {
      logger.warn('⚠️ User details fetch timed out');
      error.value = 'انتهت مهلة التحميل. يرجى التحقق من الاتصال وإعادة المحاولة';
    } else {
      logger.error('Error fetching user details:', err);
      error.value = err.message || 'حدث خطأ أثناء تحميل البيانات';
    }
  } finally {
    loading.value = false;
  }
}

async function handleManualActivation() {
  if (!manualDays.value) return;
  await store.activateManualSubscription(userId, manualDays.value, hasActiveSub.value);
  await fetchUserDetails(); // Refresh
}

async function runRepair() {
  await store.runRepairTool(userId);
  await fetchUserDetails();
}

async function clearCache() {
  await store.sendRemoteCommand(userId, 'clear_cache');
}

async function forceLogout() {
  await store.sendRemoteCommand(userId, 'force_logout');
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function goBack() {
  router.push({ name: 'Admin' });
}

function copy(text) {
  if(text) {
    navigator.clipboard.writeText(text);
    addNotification('تم النسخ', 'success');
  }
}

onMounted(() => {
  fetchUserDetails();
});
</script>

<style scoped>
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.info-item label {
  font-size: 0.85rem;
  color: var(--text-muted);
  display: block;
  margin-bottom: 0.25rem;
}

.copy-text {
  cursor: pointer;
  transition: opacity 0.2s;
}
.copy-text:hover {
  opacity: 0.8;
}

.details-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
