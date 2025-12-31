import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import api from '@/services/api';
import { useNotifications } from '@/composables/useNotifications';
import eventBus from '@/utils/eventBus';
import logger from '@/utils/logger.js'
import { supabase } from '@/supabase';
import { useAuthStore } from './auth';

export const useAdminStore = defineStore('admin', () => {
  // --- State ---
  const stats = ref({
    totalUsers: 0,
    activeUsers: 0,
    pendingRequests: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    cancelled: 0,
    expired: 0
  });
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
  const lastFetchTime = ref(0);
  const fetchError = ref(null);

  const { addNotification, confirm, success: showSuccess, error: showError, loading: showLoading, closeLoading } = useNotifications();
  const authStore = useAuthStore();

  // --- Watchers ---
  watch(() => filters.value.activeUsersPeriod, (newVal) => {
    localStorage.setItem('admin_active_users_period', newVal);
    // اقتراح: إعادة جلب الإحصائيات تلقائياً عند تغيير الفترة الزمنية
    fetchStats(true); 
  });

  /**
   * تحميل بيانات لوحة التحكم
   * @param {boolean} force - إجبار التحديث وتجاهل الكاش (يجب إرسال true عند فتح الصفحة mounted)
   */
  async function loadDashboardData(force = false, retryCount = 0) {
    // 1. إصلاح الكاش: تقليل المدة أو الاعتماد على force
    // تم تقليل مدة الكاش الافتراضية إلى 30 ثانية فقط بدلاً من 3 دقائق
    const CACHE_DURATION = 30 * 1000; 
    const now = Date.now();

    if (!force && lastFetchTime.value && (now - lastFetchTime.value < CACHE_DURATION)) {
      logger.info('🕒 Admin data is fresh (within 30s), skipping fetch.');
      return;
    }

    // السماح بإعادة المحاولة حتى لو كان isLoading true في حالة Retry
    if (isLoading.value && retryCount === 0) return;

    isLoading.value = true;
    fetchError.value = null;

    try {
      // فصل استدعاء الـ Charts عن الـ Stats لتسريع الـ Promise.all
      // واستخدام allSettled لضمان عرض ما تم جلبه حتى لو فشل جزء بسيط
      const results = await Promise.allSettled([
        fetchStats(false), // لا نحدث الشارت هنا، سنحدثه بالأسفل بشكل منفصل
        fetchChartsData(), // نحدث الشارت بشكل متوازي
        fetchPendingSubscriptions(),
        fetchAllSubscriptions(),
        fetchUsers(),
        fetchSystemConfig()
      ]);

      // التحقق مما إذا كان هناك أخطاء حرجة (مثلاً الـ Stats فشلت)
      const statsRejected = results[0].status === 'rejected';
      if (statsRejected) throw new Error('Failed to load critical stats');

      lastFetchTime.value = Date.now();
      logger.info('✅ Admin dashboard data loaded successfully.');

    } catch (err) {
      logger.error(`❌ Error loading admin data (Attempt ${retryCount + 1}):`, err);

      // إعادة المحاولة مرتين فقط
      if (retryCount < 2) {
        // لا نقوم بإيقاف الـ loading هنا، بل ننتظر ونحاول مجدداً
        await new Promise(resolve => setTimeout(resolve, 1500));
        return loadDashboardData(true, retryCount + 1);
      }

      fetchError.value = 'فشل تحميل البيانات، يرجى التحقق من الاتصال.';
      addNotification('حدث خطأ أثناء جلب البيانات', 'error');
    } finally {
      // التأكد من إيقاف التحميل فقط عند انتهاء آخر محاولة
      if (retryCount >= 2 || !fetchError.value) {
        isLoading.value = false;
      }
    }
  }

  async function fetchSystemConfig() {
    try {
      const { data } = await supabase.from('system_config').select('value').eq('key', 'enforce_subscription').maybeSingle();
      if (data) {
        // تحسين قراءة القيمة سواء كانت string أو boolean
        isSubscriptionEnforced.value = String(data.value) === 'true';
        localStorage.setItem('sys_config_enforce', String(isSubscriptionEnforced.value));
      }
    } catch (e) {
      logger.error('Error fetching system config:', e);
    }
  }

  async function toggleSubscriptionEnforcement(status) {
    showLoading('جاري تحديث إعدادات النظام...');
    try {
      // تحويل القيمة إلى نص للتخزين إذا كان الحقل في قاعدة البيانات text، أو boolean إذا كان bool
      // سأفترض هنا أنه يقبل القيمة كما هي
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
      addNotification('فشل تحديث الإعدادات', 'error');
      // إعادة جلب القيمة الحقيقية في حالة الفشل
      await fetchSystemConfig();
    }
  }

  async function fetchStats(updateCharts = false) {
    try {
      const result = await api.admin.getStats(filters.value.activeUsersPeriod);
      if (result) {
        stats.value = result;
        
        const totalSubs = (stats.value.activeSubscriptions || 0) + (stats.value.pendingRequests || 0) + (stats.value.cancelled || 0) + (stats.value.expired || 0);
        
        // حساب النسب المئوية مع حماية من القسمة على صفر
        if (totalSubs > 0) {
          chartsData.value.piePercentages = [
            Math.round((stats.value.activeSubscriptions / totalSubs) * 100),
            Math.round((stats.value.pendingRequests / totalSubs) * 100),
            Math.round((stats.value.cancelled / totalSubs) * 100),
            Math.round((stats.value.expired / totalSubs) * 100)
          ];
        } else {
            chartsData.value.piePercentages = [0, 0, 0, 0];
        }
      }
      
      if (updateCharts) {
        await fetchChartsData();
      }
    } catch (e) { 
      logger.warn('Error fetching stats:', e); 
      throw e; // إعادة رمي الخطأ ليعالجه loadDashboardData
    }
  }

  async function fetchChartsData() {
    try {
      const { labels, values } = await api.admin.getMonthlyChartData();
      chartsData.value.monthlyLabels = labels || [];
      chartsData.value.monthlyValues = values || [];
    } catch (e) {
      logger.error('Error fetching charts data:', e);
      // لا نرمي خطأ هنا حتى لا نوقف باقي التحميل
    }
  }

  async function fetchPendingSubscriptions() {
    try {
        const data = await api.admin.getPendingSubscriptions();
        if (data) pendingSubscriptions.value = data;
    } catch (e) { logger.error('Error pending subs', e); }
  }

  async function fetchAllSubscriptions(showFeedback = false) {
    try {
      const data = await api.admin.getAllSubscriptions(filters.value);
      if (data) allSubscriptions.value = data;
      if (showFeedback) addNotification('تم تحديث قائمة الاشتراكات', 'success');
    } catch (err) {
      logger.error('Error fetching all subscriptions:', err);
      if (showFeedback) addNotification('فشل تحديث الاشتراكات', 'error');
    }
  }

  async function fetchUsers(showFeedback = false) {
    try {
      const data = await api.admin.getUsers();
      if (data) usersList.value = data;
      if (showFeedback) addNotification('تم تحديث قائمة المستخدمين', 'success');
    } catch (err) {
      logger.error('Error fetching users:', err);
      if (showFeedback) addNotification('فشل تحديث المستخدمين', 'error');
    }
  }

  async function handleSubscriptionAction(id, action) {
    const confirmMessages = {
      approve: 'هل أنت متأكد من تفعيل هذا الاشتراك؟',
      reject: 'هل أنت متأكد من رفض وحذف هذا الطلب؟',
      cancel: 'هل أنت متأكد من تعليق الاشتراك؟',
      reactivate: 'هل أنت متأكد من إعادة التفعيل؟',
      delete: 'هل أنت متأكد من الحذف النهائي؟'
    };

    const result = await confirm({
      title: 'تأكيد الإجراء',
      text: confirmMessages[action],
      icon: action === 'delete' ? 'error' : 'warning'
    });

    if (!result.isConfirmed) return;

    showLoading('جاري المعالجة...');
    try {
      const subBefore = allSubscriptions.value.find(s => s.id === id);
      const targetUserId = subBefore?.user_id;

      const { error } = await api.admin.handleSubscriptionAction(id, action);
      if (error) throw error;

      // تحديث البيانات فوراً مع إجبار التحديث
      await loadDashboardData(true); 

      if (targetUserId) {
        eventBus.emit('subscription-updated', { userId: targetUserId });
      }
      
      closeLoading();
      await showSuccess('تم بنجاح');

    } catch (err) {
      closeLoading();
      logger.error(`Error action ${action}:`, err);
      showError(err.message || 'حدث خطأ');
    }
  }

  // ... (باقي الدوال كما هي: activateManualSubscription, formatDate) ...

  async function activateManualSubscription(userId, days, hasActiveSub, shouldRefresh = true, skipConfirm = false) {
    // ... نفس الكود الخاص بك ...
    // فقط تأكد عند الاستدعاء داخل الدالة أن تستخدم loadDashboardData(true)
    // ...
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
            // هنا التعديل المهم: force = true
            await loadDashboardData(true);
        }
        
        logger.info(`Emitting subscription-updated for user: ${userId}`);
        eventBus.emit('subscription-updated', { userId });

        if (shouldRefresh) {
            closeLoading();
            await showSuccess('تم تحديث الاشتراك بنجاح');
        }

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
    stats, chartsData, usersList, pendingSubscriptions, allSubscriptions, filters, isLoading, isSubscriptionEnforced, fetchError,
    loadDashboardData, fetchStats, fetchAllSubscriptions, fetchUsers,
    handleSubscriptionAction, activateManualSubscription, formatDate, toggleSubscriptionEnforcement, fetchSystemConfig
  };
});