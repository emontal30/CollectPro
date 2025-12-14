import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
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

  // نظام الإشعارات الموحد
  const { error, success, confirm, addNotification } = useNotifications();

  const chartsData = ref({
    activeUsersPercent: 0,
    inactiveUsersPercent: 0,
    expiringSoonPercent: 0,
    avgDurationPercent: 0,
    piePercentages: [0, 0, 0, 0], // active, pending, cancelled, expired
    monthlyLabels: [],
    monthlyValues: []
  });

  const usersList = ref([]);
  const pendingSubscriptions = ref([]);
  const allSubscriptions = ref([]);
  
  // فلاتر
  const filters = ref({
    status: 'all',
    planType: 'all',
    expiry: 'all',
    activeUsersPeriod: 30,
    usersSearch: ''
  });

  const isLoading = ref(false);

  // --- الإجراءات (Actions) ---

  // 1. تحميل جميع بيانات لوحة التحكم
  async function loadDashboardData() {
    isLoading.value = true;
    try {
      await Promise.all([
        fetchStats(),
        fetchPendingSubscriptions(),
        fetchAllSubscriptions(),
        fetchUsers()
      ]);
    } catch (error) {
      logger.error('Error loading admin data:', error);
      error('فشل تحميل البيانات');
    } finally {
      isLoading.value = false;
    }
  }

  // 2. جلب الإحصائيات والمخططات
  async function fetchStats() {
    const statsData = await api.admin.getStats();

    stats.value.totalUsers = statsData.totalUsers;
    stats.value.pendingRequests = statsData.pendingRequests;
    stats.value.activeSubscriptions = statsData.activeSubscriptions;
    stats.value.cancelled = statsData.cancelled;
    stats.value.expired = statsData.expired;
    stats.value.totalRevenue = statsData.totalRevenue;

    // حساب النسب للمخططات
    const totalSubs = stats.value.pendingRequests + stats.value.activeSubscriptions + stats.value.cancelled + stats.value.expired;
    if (totalSubs > 0) {
      stats.value.completionRate = Math.round((stats.value.activeSubscriptions / totalSubs) * 100);
      stats.value.pendingRate = Math.round((stats.value.pendingRequests / totalSubs) * 100);

      // المخطط الدائري
      chartsData.value.piePercentages = [
        Math.round((stats.value.activeSubscriptions / totalSubs) * 100),
        Math.round((stats.value.pendingRequests / totalSubs) * 100),
        Math.round((stats.value.cancelled / totalSubs) * 100),
        Math.round((stats.value.expired / totalSubs) * 100)
      ];
    }

    // جلب بيانات المستخدمين النشطين (حساب يدوي)
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - filters.value.activeUsersPeriod);

      const { data, error } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('status', 'active')
        .gte('updated_at', daysAgo.toISOString());

      if (error) {
        logger.warn('Failed to fetch active users:', error);
        stats.value.activeUsers = 0;
      } else {
        // حساب المستخدمين الفريدين
        const uniqueUsers = new Set(data?.map(sub => sub.user_id) || []);
        stats.value.activeUsers = uniqueUsers.size;
      }
    } catch (e) {
      logger.warn('Failed to fetch active users', e);
      stats.value.activeUsers = 0;
    }

    // تحضير بيانات المخطط الخطي (آخر 5 شهور)
    prepareLineChartData();
  }

  // تحضير بيانات المخطط الخطي
  async function prepareLineChartData() {
    const { labels, values } = await api.admin.getMonthlyChartData();
    chartsData.value.monthlyLabels = labels;
    chartsData.value.monthlyValues = values;
  }

  // 3. جلب الاشتراكات المعلقة
  async function fetchPendingSubscriptions() {
    pendingSubscriptions.value = await api.admin.getPendingSubscriptions();
  }

  // 4. جلب جميع الاشتراكات مع الفلترة
  async function fetchAllSubscriptions(showFeedback = false) {
    try {
      const data = await api.admin.getAllSubscriptions(filters.value);
      
      // تحديث البيانات دائمًا عند التحديث
      allSubscriptions.value = data || []; // يتم الآن الفلترة من جهة الخادم

      if (showFeedback) {
        success('تم تحديث قائمة الاشتراكات');
      }
    } catch (error) {
      logger.error('Error fetching all subscriptions:', error);
      if (showFeedback) {
        error('فشل في تحديث قائمة الاشتراكات');
      }
    }
  }

  // 5. جلب المستخدمين المسجلين
  async function fetchUsers(showFeedback = false) {
    try {
      usersList.value = await api.admin.getUsers();
      if (showFeedback) {
        success('تم تحديث قائمة المستخدمين');
      }
    } catch (error) {
      logger.error('Error fetching users:', error);
      if (showFeedback) {
        error('فشل في تحديث قائمة المستخدمين');
      }
    }
  }

  // 6. إجراءات الاشتراك (تفعيل/رفض/حذف)
  async function handleSubscriptionAction(id, action) {
    let confirmMsg = '';

    switch(action) {
      case 'approve':
        confirmMsg = 'هل أنت متأكد من تفعيل هذا الاشتراك؟';
        break;
      case 'reject':
        confirmMsg = 'هل أنت متأكد من رفض هذا الاشتراك؟ سيتم حذفه.';
        break;
      case 'cancel': // إلغاء تفعيل
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
      // Get the subscription before action to know the user_id
      const { data: subBefore } = await api.subscriptions.getSubscriptionById(id);

      await api.admin.handleSubscriptionAction(id, action);
      await loadDashboardData(); // تحديث البيانات

      // Update sidebar if this affects the current user's subscription
      if (subBefore?.user_id) {
        const { subscription } = await api.subscriptions.getSubscription(subBefore.user_id);
        eventBus.emit('subscription-updated', subscription);
      }

      success('تم تنفيذ الإجراء بنجاح');
    } catch (error) {
      logger.error('Error handling subscription action:', error);
      error('حدث خطأ أثناء تنفيذ الإجراء');
    }
  }

  // 7. تفعيل اشتراك يدوي لمستخدم
  async function activateManualSubscription(userId, days) {
    try {
      const { error } = await api.admin.activateManualSubscription(userId, days);
      if (error) throw error;
      await loadDashboardData();

      // Update sidebar for the affected user
      const { subscription } = await api.subscriptions.getSubscription(userId);
      eventBus.emit('subscription-updated', subscription);

      success('تم تفعيل الاشتراك بنجاح');
    } catch (error) {
      logger.error('Error activating manual subscription:', error);
      error('حدث خطأ أثناء تفعيل الاشتراك');
    }
  }

  // دوال مساعدة للتنسيق
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