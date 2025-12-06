import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';
import { supabase } from '@/services/api';
import Swal from 'sweetalert2';

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
      console.error('Error loading admin data:', error);
      Swal.fire('خطأ', 'فشل تحميل البيانات', 'error');
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

    // جلب بيانات المستخدمين النشطين (RPC call)
    try {
      const { data } = await supabase.rpc('get_active_users_last_n_days', { days: filters.value.activeUsersPeriod });
      stats.value.activeUsers = data || 0;
    } catch (e) {
      console.warn('Failed to fetch active users', e);
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
      allSubscriptions.value = data || [];
      
      // فلترة "قرب الانتهاء" في الذاكرة إذا لزم الأمر
      if (filters.value.expiry === 'expiring_soon' && data) {
        const now = new Date();
        const dayMs = 86400000;
        allSubscriptions.value = data.filter(sub => {
          if (!sub.end_date) return false;
          const end = new Date(sub.end_date);
          const diff = Math.ceil((end - now) / dayMs);
          return diff > 0 && diff <= 7;
        });
      }

      if (showFeedback) {
        Swal.fire('نجاح', 'تم تحديث قائمة الاشتراكات', 'success');
      }
    } catch (error) {
      console.error('Error fetching all subscriptions:', error);
      if (showFeedback) {
        Swal.fire('خطأ', 'فشل في تحديث قائمة الاشتراكات', 'error');
      }
    }
  }

  // 5. جلب المستخدمين المسجلين
  async function fetchUsers(showFeedback = false) {
    try {
      usersList.value = await api.admin.getUsers();
      if (showFeedback) {
        Swal.fire('نجاح', 'تم تحديث قائمة المستخدمين', 'success');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      if (showFeedback) {
        Swal.fire('خطأ', 'فشل في تحديث قائمة المستخدمين', 'error');
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

    const result = await Swal.fire({
      title: 'تأكيد',
      text: confirmMsg,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم',
      cancelButtonText: 'لا',
      confirmButtonColor: '#007965'
    });

    if (!result.isConfirmed) return;

    try {
      await api.admin.handleSubscriptionAction(id, action);
      await loadDashboardData(); // تحديث البيانات
      Swal.fire('نجاح', 'تم تنفيذ الإجراء بنجاح', 'success');
    } catch (error) {
      console.error('Error handling subscription action:', error);
      Swal.fire('خطأ', 'حدث خطأ أثناء تنفيذ الإجراء', 'error');
    }
  }

  // 7. تفعيل اشتراك يدوي لمستخدم
  async function activateManualSubscription(userId, days) {
    try {
      const { error } = await api.admin.activateManualSubscription(userId, days);
      if (error) throw error;
      await loadDashboardData();
      Swal.fire('نجاح', 'تم تفعيل الاشتراك بنجاح', 'success');
    } catch (error) {
      console.error('Error activating manual subscription:', error);
      Swal.fire('خطأ', 'حدث خطأ أثناء تفعيل الاشتراك', 'error');
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