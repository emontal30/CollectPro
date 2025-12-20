import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/services/api';
import { useNotifications } from '@/composables/useNotifications';
import eventBus from '@/utils/eventBus';
import logger from '@/utils/logger.js'

export const useAdminStore = defineStore('admin', () => {
  // --- State ---
  const stats = ref({});
  const chartsData = ref({ piePercentages: [0, 0, 0, 0], monthlyLabels: [], monthlyValues: [] });
  const usersList = ref([]);
  const pendingSubscriptions = ref([]);
  const allSubscriptions = ref([]);
  const filters = ref({ status: 'all', expiry: 'all', usersSearch: '' });
  const isLoading = ref(false);

  // استدعاء الإشعارات
  const { addNotification, confirm, success: showSuccess, error: showError, loading: showLoading, closeLoading } = useNotifications();

  // --- Actions ---

  async function loadDashboardData() {
    isLoading.value = true;
    try {
      // تنفيذ جميع الاستدعاءات بالتوازي لضمان تحديث كل الجداول
      await Promise.all([
        fetchStats(),
        fetchPendingSubscriptions(),
        fetchAllSubscriptions(),
        fetchUsers()
      ]);
    } catch (err) {
      logger.error('Error loading admin data:', err);
      addNotification('فشل تحميل البيانات', 'error');
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchStats() {
    try {
      stats.value = await api.admin.getStats();
      const totalSubs = (stats.value.activeSubscriptions || 0) + (stats.value.pendingRequests || 0) + (stats.value.cancelled || 0) + (stats.value.expired || 0);
      if (totalSubs > 0) {
        chartsData.value.piePercentages = [
          Math.round((stats.value.activeSubscriptions / totalSubs) * 100),
          Math.round((stats.value.pendingRequests / totalSubs) * 100),
          Math.round((stats.value.cancelled / totalSubs) * 100),
          Math.round((stats.value.expired / totalSubs) * 100)
        ];
      }
      await fetchChartsData();
    } catch (e) { logger.warn('Error fetching stats:', e); }
  }

  async function fetchChartsData() {
    const { labels, values } = await api.admin.getMonthlyChartData();
    chartsData.value.monthlyLabels = labels;
    chartsData.value.monthlyValues = values;
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
      const allSubs = await api.admin.getAllSubscriptions();
      const targetSub = allSubs.find(s => s.id === id);
      const userId = targetSub?.user_id;

      const { error } = await api.admin.handleSubscriptionAction(id, action);
      
      closeLoading();

      if (error) throw error;

      await showSuccess('تم تنفيذ العملية بنجاح');
      // تحديث شامل وفوري لكل البيانات في لوحة المسؤول
      await loadDashboardData();

      if (userId) {
        eventBus.emit('subscription-updated', { userId });
      }

    } catch (err) {
      closeLoading();
      logger.error(`Error with action ${action}:`, err);
      showError(err.message || 'حدث خطأ أثناء تنفيذ العملية');
    }
  }

  async function activateManualSubscription(userId, days, hasActiveSub) {
    const numDays = Number(days);
    if (!numDays || isNaN(numDays) || numDays === 0) {
        addNotification('يرجى إدخال عدد أيام صحيح', 'warning');
        return;
    }

    if (!hasActiveSub && numDays < 0) {
        addNotification('لا يمكن تفعيل اشتراك جديد بقيمة سالبة', 'warning');
        return;
    }
    
    // تخصيص نص الإجراء بناءً على ما إذا كانت القيمة موجبة أم سالبة
    let actionText = '';
    if (hasActiveSub) {
      actionText = numDays > 0 ? `إضافة ${numDays} يوم` : `خصم ${Math.abs(numDays)} يوم`;
    } else {
      actionText = `تفعيل اشتراك جديد لمدة ${numDays} يوم`;
    }
    
    const result = await confirm({
        title: 'تأكيد التعديل اليدوي',
        text: `هل تريد بالفعل ${actionText} لهذا المستخدم؟`,
        icon: 'question'
    });

    if (!result.isConfirmed) return;

    showLoading('جاري تحديث الاشتراك...');
    try {
      const { error } = await api.admin.activateManualSubscription(userId, numDays);
      
      closeLoading();

      if (error) throw error;

      await showSuccess('تم تحديث الاشتراك بنجاح');
      
      // تحديث شامل لكل البيانات
      await loadDashboardData();
      
      eventBus.emit('subscription-updated', { userId });

    } catch (err) {
      closeLoading();
      logger.error('Error activating manual subscription:', err);
      showError(err.message || 'حدث خطأ أثناء تحديث الاشتراك');
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  return {
    stats, chartsData, usersList, pendingSubscriptions, allSubscriptions, filters, isLoading,
    loadDashboardData, fetchStats, fetchAllSubscriptions, fetchUsers,
    handleSubscriptionAction, activateManualSubscription, formatDate
  };
});
