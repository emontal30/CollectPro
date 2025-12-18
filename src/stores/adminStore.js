import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/services/api';
import { useNotifications } from '@/composables/useNotifications';
import eventBus from '@/utils/eventBus';
import logger from '@/utils/logger.js'
import { supabase } from '@/supabase'

export const useAdminStore = defineStore('admin', () => {
  // --- الحالة (State) ---
  const stats = ref({
    totalUsers: 0,
    activeUsers: 0,
    pendingRequests: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    cancelled: 0,
    expired: 0,
    completionRate: 0,
    pendingRate: 0
  });

  // إصلاح: استدعاء الإشعارات بشكل صحيح
  const { addNotification, confirm } = useNotifications();

  const chartsData = ref({
    activeUsersPercent: 0,
    inactiveUsersPercent: 0,
    expiringSoonPercent: 0,
    avgDurationPercent: 0,
    piePercentages: [0, 0, 0, 0], 
    monthlyLabels: [],
    monthlyValues: []
  });

  const usersList = ref([]);
  const pendingSubscriptions = ref([]);
  const allSubscriptions = ref([]);
  
  const filters = ref({
    status: 'all',
    planType: 'all',
    expiry: 'all',
    activeUsersPeriod: 30,
    usersSearch: ''
  });

  const isLoading = ref(false);

  // --- الإجراءات (Actions) ---

  async function loadDashboardData() {
    isLoading.value = true;
    try {
      await Promise.all([
        fetchStats(),
        fetchPendingSubscriptions(),
        fetchAllSubscriptions(),
        fetchUsers()
      ]);
    } catch (err) {
      logger.error('Error loading admin data:', err);
      // إصلاح: استخدام addNotification بدلاً من error()
      addNotification('فشل تحميل البيانات', 'error');
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchStats() {
    try {
      const statsData = await api.admin.getStats();

      stats.value.totalUsers = statsData.totalUsers;
      stats.value.pendingRequests = statsData.pendingRequests;
      stats.value.activeSubscriptions = statsData.activeSubscriptions;
      stats.value.cancelled = statsData.cancelled;
      stats.value.expired = statsData.expired;
      stats.value.totalRevenue = statsData.totalRevenue;

      const totalSubs = stats.value.pendingRequests + stats.value.activeSubscriptions + stats.value.cancelled + stats.value.expired;
      if (totalSubs > 0) {
        stats.value.completionRate = Math.round((stats.value.activeSubscriptions / totalSubs) * 100);
        stats.value.pendingRate = Math.round((stats.value.pendingRequests / totalSubs) * 100);

        chartsData.value.piePercentages = [
          Math.round((stats.value.activeSubscriptions / totalSubs) * 100),
          Math.round((stats.value.pendingRequests / totalSubs) * 100),
          Math.round((stats.value.cancelled / totalSubs) * 100),
          Math.round((stats.value.expired / totalSubs) * 100)
        ];
      }

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - filters.value.activeUsersPeriod);

      const { data, error: dbError } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('status', 'active')
        .gte('updated_at', daysAgo.toISOString());

      if (dbError) {
        logger.warn('Failed to fetch active users:', dbError);
        stats.value.activeUsers = 0;
      } else {
        const uniqueUsers = new Set(data?.map(sub => sub.user_id) || []);
        stats.value.activeUsers = uniqueUsers.size;
      }

      prepareLineChartData();
    } catch (e) {
      logger.warn('Error fetching stats:', e);
    }
  }

  async function prepareLineChartData() {
    const { labels, values } = await api.admin.getMonthlyChartData();
    chartsData.value.monthlyLabels = labels;
    chartsData.value.monthlyValues = values;
  }

  async function fetchPendingSubscriptions() {
    pendingSubscriptions.value = await api.admin.getPendingSubscriptions();
  }

  async function fetchAllSubscriptions(showFeedback = false) {
    try {
      const data = await api.admin.getAllSubscriptions(filters.value);
      allSubscriptions.value = data || [];

      if (showFeedback) {
        // إصلاح: استخدام addNotification بدلاً من success()
        addNotification('تم تحديث قائمة الاشتراكات', 'success');
      }
    } catch (err) {
      logger.error('Error fetching all subscriptions:', err);
      if (showFeedback) {
        addNotification('فشل في تحديث قائمة الاشتراكات', 'error');
      }
    }
  }

  async function fetchUsers(showFeedback = false) {
    try {
      usersList.value = await api.admin.getUsers();
      if (showFeedback) {
        addNotification('تم تحديث قائمة المستخدمين', 'success');
      }
    } catch (err) {
      logger.error('Error fetching users:', err);
      if (showFeedback) {
        addNotification('فشل في تحديث قائمة المستخدمين', 'error');
      }
    }
  }

  async function handleSubscriptionAction(id, action) {
    let confirmMsg = '';

    switch(action) {
      case 'approve':
        confirmMsg = 'هل أنت متأكد من تفعيل هذا الاشتراك؟';
        break;
      case 'reject':
        confirmMsg = 'هل أنت متأكد من رفض هذا الاشتراك؟ سيتم حذفه.';
        break;
      case 'cancel':
        confirmMsg = 'هل أنت متأكد من إلغاء تفعيل هذا الاشتراك؟';
        break;
      case 'reactivate':
        confirmMsg = 'هل أنت متأكد من إعادة تفعيل هذا الاشتراك؟';
        break;
      case 'delete':
        confirmMsg = 'هل أنت متأكد من الحذف نهائياً؟';
        break;
    }

    const result = await confirm({
      title: 'تأكيد',
      text: confirmMsg,
      icon: 'warning',
      confirmButtonText: 'نعم',
      cancelButtonText: 'لا'
    });

    if (!result.isConfirmed) return;

    try {
      const { data: subBefore } = await api.subscriptions.getSubscriptionById(id);

      await api.admin.handleSubscriptionAction(id, action);
      await loadDashboardData();

      if (subBefore?.user_id) {
        const { subscription } = await api.subscriptions.getSubscription(subBefore.user_id);
        eventBus.emit('subscription-updated', subscription);
      }

      addNotification('تم تنفيذ الإجراء بنجاح', 'success');
    } catch (err) {
      logger.error('Error handling subscription action:', err);
      addNotification('حدث خطأ أثناء تنفيذ الإجراء', 'error');
    }
  }

  async function activateManualSubscription(userId, days) {
    try {
      const { error: err } = await api.admin.activateManualSubscription(userId, days);
      if (err) throw err;
      
      await loadDashboardData();

      // تحديث الحالة للمستخدم المعني
      const { subscription } = await api.subscriptions.getSubscription(userId);
      eventBus.emit('subscription-updated', subscription);

      addNotification('تم تفعيل الاشتراك بنجاح', 'success');
    } catch (err) {
      logger.error('Error activating manual subscription:', err);
      // إصلاح: استخدام addNotification بدلاً من error()
      addNotification(err.message || 'حدث خطأ أثناء تفعيل الاشتراك', 'error');
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB');
  }

  return {
    stats,
    chartsData,
    usersList,
    pendingSubscriptions,
    allSubscriptions,
    filters,
    isLoading,
    loadDashboardData,
    fetchStats,
    fetchAllSubscriptions,
    fetchUsers,
    handleSubscriptionAction,
    activateManualSubscription,
    formatDate
  };
});