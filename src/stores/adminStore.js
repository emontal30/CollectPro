import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import api from '@/services/api';
import { useNotifications } from '@/composables/useNotifications';
import eventBus from '@/utils/eventBus';
import logger from '@/utils/logger.js'
import { supabase } from '@/supabase';
import { useAuthStore } from './auth';

export const useAdminStore = defineStore('admin', () => {
  const stats = ref({});
  const chartsData = ref({ piePercentages: [0, 0, 0, 0], monthlyLabels: [], monthlyValues: [] });
  const usersList = ref([]);
  const pendingSubscriptions = ref([]);
  const allSubscriptions = ref([]);
  
  const savedPeriod = localStorage.getItem('admin_active_users_period');
  const filters = ref({ 
    status: 'all', 
    expiry: 'all', 
    usersSearch: '',
    activeUsersPeriod: savedPeriod ? parseInt(savedPeriod) : 30
  });
  
  const isLoading = ref(false);
  const isSubscriptionEnforced = ref(false);

  const { addNotification, confirm, success: showSuccess, error: showError, loading: showLoading, closeLoading } = useNotifications();
  const authStore = useAuthStore();

  watch(() => filters.value.activeUsersPeriod, (newVal) => {
    localStorage.setItem('admin_active_users_period', newVal);
  });

  async function loadDashboardData() {
    isLoading.value = true;
    try {
      await Promise.all([
        fetchStats(true),
        fetchPendingSubscriptions(),
        fetchAllSubscriptions(),
        fetchUsers(),
        fetchSystemConfig()
      ]);
    } catch (err) {
      logger.error('Error loading admin data:', err);
      addNotification('فشل تحميل البيانات', 'error');
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchSystemConfig() {
    try {
      const { data } = await supabase.from('system_config').select('value').eq('key', 'enforce_subscription').maybeSingle();
      if (data) {
        const val = data.value === true || data.value === 'true';
        isSubscriptionEnforced.value = val;
        localStorage.setItem('sys_config_enforce', String(val));
      }
    } catch (e) {
      logger.error('Error fetching system config:', e);
    }
  }

  // --- دالة إبطال الجلسة المعدلة (مع مهلة زمنية وحماية من الأخطاء) ---
  async function signOutUser(userId, userName) {
    const result = await confirm({
        title: 'تأكيد إبطال الجلسة',
        text: `هل أنت متأكد من تسجيل الخروج القسري للمستخدم "${userName}"؟ سيتم إجباره على تسجيل الدخول مرة أخرى.`,
        icon: 'warning',
        confirmButtonText: 'نعم، قم بإبطال الجلسة',
        confirmButtonColor: 'var(--danger)'
    });

    if (!result.isConfirmed) return;

    showLoading('جاري إبطال جلسة المستخدم...');
     
    // إعداد مهلة زمنية (Timeout) للطلب مدتها 15 ثانية لتجنب التعليق
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        // 1. الحصول على توكن حديث لضمان الصلاحية مع معالجة آمنة للبيانات
        const { data, error: sessionError } = await supabase.auth.refreshSession();
        const session = data?.session; // استخدام Optional Chaining لتجنب أخطاء null

        if (sessionError || !session || !session.access_token) {
            throw new Error('فشلت المصادقة: الجلسة قد انتهت أو لا يمكن تحديثها. حاول تسجيل الدخول مرة أخرى.');
        }
         
        const token = session.access_token;
        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/logout-user`;
         
        // 2. استدعاء Edge Function مع تمرير إشارة الإلغاء (signal)
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId }),
            signal: controller.signal // ربط الطلب بالمهلة الزمنية
        });

        clearTimeout(timeoutId); // إلغاء المهلة فور نجاح الطلب

        // 3. معالجة الرد
        if (!response.ok) {
            const responseBodyText = await response.text();
            let errorMsg;
            try {
                const errorData = JSON.parse(responseBodyText);
                errorMsg = errorData.error || responseBodyText;
            } catch (e) {
                errorMsg = responseBodyText || `Edge Function returned status ${response.status}.`;
            }
            throw new Error(errorMsg);
        }

        closeLoading();
        await showSuccess(`تم إبطال جلسة المستخدم ${userName} بنجاح.`);

    } catch (err) {
        clearTimeout(timeoutId); // تنظيف المؤقت في حال الفشل أيضاً
        closeLoading(); // إغلاق نافذة التحميل فوراً
         
        // التعامل مع خطأ انتهاء الوقت بشكل خاص
        if (err.name === 'AbortError') {
            logger.warn('SignOut request timed out');
            showError('انتهت مهلة الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.');
        } else {
            logger.error('Error signing out user:', err);
            showError(err.message || 'حدث خطأ غير متوقع أثناء إبطال الجلسة.');
        }
    }
  }

  async function toggleSubscriptionEnforcement(status) {
    showLoading('جاري تحديث إعدادات النظام...');
    try {
      const { error } = await supabase
        .from('system_config')
        .update({ 
            value: status, 
            updated_at: new Date().toISOString() 
        })
        .eq('key', 'enforce_subscription');
      
      if (error) throw error;
      
      isSubscriptionEnforced.value = status;
      localStorage.setItem('sys_config_enforce', String(status));
      
      closeLoading();
      addNotification(`تم ${status ? 'تفعيل' : 'إيقاف'} وضع الاشتراك الإجباري بنجاح`, 'success');
    } catch (e) {
      closeLoading();
      logger.error('Error toggling enforcement:', e);
      addNotification('فشل تحديث الإعدادات: ' + (e.message || 'خطأ غير معروف'), 'error');
      await fetchSystemConfig();
    }
  }

  async function fetchStats(updateCharts = false) {
    try {
      stats.value = await api.admin.getStats(filters.value.activeUsersPeriod);
      
      const totalSubs = (stats.value.activeSubscriptions || 0) + (stats.value.pendingRequests || 0) + (stats.value.cancelled || 0) + (stats.value.expired || 0);
      if (totalSubs > 0) {
        chartsData.value.piePercentages = [
          Math.round((stats.value.activeSubscriptions / totalSubs) * 100),
          Math.round((stats.value.pendingRequests / totalSubs) * 100),
          Math.round((stats.value.cancelled / totalSubs) * 100),
          Math.round((stats.value.expired / totalSubs) * 100)
        ];
      }
      
      if (updateCharts) {
        await fetchChartsData();
      }
    } catch (e) { 
      logger.warn('Error fetching stats:', e); 
    }
  }

  async function fetchChartsData() {
    try {
      const { labels, values } = await api.admin.getMonthlyChartData();
      chartsData.value.monthlyLabels = labels;
      chartsData.value.monthlyValues = values;
    } catch (e) {
      logger.error('Error fetching charts data:', e);
    }
  }

  async function fetchPendingSubscriptions() {
    pendingSubscriptions.value = await api.admin.getPendingSubscriptions();
  }

  async function fetchAllSubscriptions(showFeedback = false) {
    try {
      allSubscriptions.value = await api.admin.getAllSubscriptions(filters.value);
      if (showFeedback) addNotification('تم تحديث قائمة الاشتراكات', 'success');
    } catch (err) {
      logger.error('Error fetching all subscriptions:', err);
      if (showFeedback) addNotification('فشل تحديث الاشتراكات', 'error');
    }
  }

  async function fetchUsers(showFeedback = false) {
    try {
      usersList.value = await api.admin.getUsers();
      if (showFeedback) addNotification('تم تحديث قائمة المستخدمين', 'success');
    } catch (err) {
      logger.error('Error fetching users:', err);
      if (showFeedback) addNotification('فشل تحديث المستخدمين', 'error');
    }
  }

  async function handleSubscriptionAction(id, action) {
    const confirmMessages = {
      approve: 'هل أنت متأكد من تفعيل هذا الاشتراك؟ سيتم إلغاء أي اشتراك فعال آخر لنفس المستخدم.',
      reject: 'هل أنت متأكد من رفض وحذف هذا الطلب؟',
      cancel: 'هل أنت متأكد من تعليق (إيقاف مؤقت) لهذا الاشتراك؟',
      reactivate: 'هل أنت متأكد من استئناف (إعادة تفعيل) هذا الاشتراك؟',
      delete: 'هل أنت متأكد من الحذف النهائي لهذا الاشتراك من النظام؟'
    };

    const result = await confirm({
      title: 'تأكيد الإجراء',
      text: confirmMessages[action],
      icon: action === 'delete' ? 'error' : 'warning'
    });

    if (!result.isConfirmed) return;

    showLoading('جاري معالجة الطلب...');
    try {
      const { error } = await api.admin.handleSubscriptionAction(id, action);
      closeLoading();
      if (error) throw error;

      await showSuccess('تم تنفيذ العملية بنجاح');
      await loadDashboardData();

      const sub = allSubscriptions.value.find(s => s.id === id);
      if (sub?.user_id) {
        eventBus.emit('subscription-updated', { userId: sub.user_id });
      }

    } catch (err) {
      closeLoading();
      logger.error(`Error with action ${action}:`, err);
      showError(err.message || 'حدث خطأ أثناء تنفيذ العملية');
    }
  }

  async function activateManualSubscription(userId, days, hasActiveSub, shouldRefresh = true, skipConfirm = false) {
    const numDays = Number(days);
    if (!numDays || isNaN(numDays) || numDays === 0) {
        if (!skipConfirm) addNotification('يرجى إدخال عدد أيام صحيح', 'warning');
        return;
    }

    if (!skipConfirm) {
      let actionText = hasActiveSub 
        ? (numDays > 0 ? `إضافة ${numDays} يوم` : `خصم ${Math.abs(numDays)} يوم`)
        : `تفعيل اشتراك جديد لمدة ${numDays} يوم`;
      
      const result = await confirm({
          title: 'تأكيد التعديل اليدوي',
          text: `هل تريد بالفعل ${actionText} لهذا المستخدم؟`,
          icon: 'question'
      });

      if (!result.isConfirmed) return;
    }

    if (shouldRefresh) showLoading('جاري تحديث الاشتراك...');
    
    try {
      const { error } = await api.admin.activateManualSubscription(userId, numDays);
      
      if (error) throw error;

      if (shouldRefresh) {
        closeLoading();
        await showSuccess('تم تحديث الاشتراك بنجاح');
        await loadDashboardData();
      }
      
      eventBus.emit('subscription-updated', { userId });

    } catch (err) {
      if (shouldRefresh) closeLoading();
      logger.error('Error activating manual subscription:', err);
      if (shouldRefresh) showError(err.message || 'حدث خطأ أثناء تحديث الاشتراك');
      throw err;
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  return {
    stats, chartsData, usersList, pendingSubscriptions, allSubscriptions, filters, isLoading, isSubscriptionEnforced,
    loadDashboardData, fetchStats, fetchAllSubscriptions, fetchUsers,
    handleSubscriptionAction, activateManualSubscription, formatDate, toggleSubscriptionEnforcement
  };
});
