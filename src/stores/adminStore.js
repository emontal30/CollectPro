import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import api from '@/services/api';
import { useNotifications } from '@/composables/useNotifications';
import eventBus from '@/utils/eventBus';
import logger from '@/utils/logger.js'
import { supabase } from '@/supabase';
import { useAuthStore } from './auth';

export const useAdminStore = defineStore('admin', () => {
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

  watch(() => filters.value.activeUsersPeriod, (newVal) => {
    localStorage.setItem('admin_active_users_period', newVal);
  });

  /**
   * تحميل بيانات لوحة التحكم مع نظام حماية من التعليق وتوفير في الاستدعاءات
   */
  async function loadDashboardData(force = false) {
    // 1. توفير الاستدعاءات: لا تقم بالتحميل إذا كانت البيانات حديثة (أقل من 3 دقائق) إلا لو طُلب ذلك
    const now = Date.now();
    if (!force && lastFetchTime.value && (now - lastFetchTime.value < 3 * 60 * 1000)) {
      logger.info('🕒 Admin data is fresh, skipping fetch.');
      return;
    }

    if (isLoading.value) return;

    isLoading.value = true;
    fetchError.value = null;

    // ضبط "تايم آوت" أمان لضمان عدم تعليق الواجهة
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), 15000)
    );

    try {
      // تنفيذ الطلبات مع حماية التايم آوت
      await Promise.race([
        Promise.all([
          fetchStats(true),
          fetchPendingSubscriptions(),
          fetchAllSubscriptions(),
          fetchUsers(),
          fetchSystemConfig()
        ]),
        timeoutPromise
      ]);

      lastFetchTime.value = Date.now();
      logger.info('✅ Admin dashboard data loaded successfully.');
    } catch (err) {
      fetchError.value = err.message === 'TIMEOUT' ? 'استغرق التحميل وقتاً طويلاً، يرجى المحاولة مرة أخرى.' : 'فشل تحميل بعض البيانات من السيرفر.';
      logger.error('❌ Error loading admin data:', err);
      
      if (err.message !== 'TIMEOUT') {
        addNotification('حدث خطأ أثناء جلب البيانات من السحاب', 'error');
      }
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
      const result = await api.admin.getStats(filters.value.activeUsersPeriod);
      if (result) {
        stats.value = result;
        
        const totalSubs = (stats.value.activeSubscriptions || 0) + (stats.value.pendingRequests || 0) + (stats.value.cancelled || 0) + (stats.value.expired || 0);
        if (totalSubs > 0) {
          chartsData.value.piePercentages = [
            Math.round((stats.value.activeSubscriptions / totalSubs) * 100),
            Math.round((stats.value.pendingRequests / totalSubs) * 100),
            Math.round((stats.value.cancelled / totalSubs) * 100),
            Math.round((stats.value.expired / totalSubs) * 100)
          ];
        }
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
    const data = await api.admin.getPendingSubscriptions();
    if (data) pendingSubscriptions.value = data;
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
      const subBefore = allSubscriptions.value.find(s => s.id === id);
      const targetUserId = subBefore?.user_id;

      const { error } = await api.admin.handleSubscriptionAction(id, action);
      
      if (error) throw error;

      await loadDashboardData(true); // فرض تحديث بعد أي إجراء

      if (targetUserId) {
        logger.info(`Emitting subscription-updated for user: ${targetUserId}`);
        eventBus.emit('subscription-updated', { userId: targetUserId });
      }
      
      closeLoading();
      await showSuccess('تم تنفيذ العملية بنجاح');

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
    handleSubscriptionAction, activateManualSubscription, formatDate, toggleSubscriptionEnforcement
  };
});
