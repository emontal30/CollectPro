import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import api from '@/services/api';
import { useNotifications } from '@/composables/useNotifications';
import eventBus from '@/utils/eventBus';
import logger from '@/utils/logger.js'
import { supabase } from '@/supabase';
import { useAuthStore } from './auth';
import { TimeService } from '@/utils/time';
import { setLocalStorageCache, getLocalStorageCache } from '@/services/cacheManager';

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

  const savedPeriod = 30; // Default, loaded async later
  const filters = ref({
    status: 'all',
    expiry: 'all',
    usersSearch: '',
    activeUsersPeriod: savedPeriod
  });

  // Async load for saved period
  getLocalStorageCache('admin_active_users_period').then(val => {
    if (val) filters.value.activeUsersPeriod = parseInt(val);
  });

  const isLoading = ref(false);
  const isSubscriptionEnforced = ref(false);
  const lastFetchTime = ref(0);
  const fetchError = ref(null);
  const serverTimeOffset = ref(0); // فارق التوقيت بين السيرفر والعميل

  const { addNotification, confirm, success: showSuccess, error: showError, loading: showLoading, closeLoading } = useNotifications();
  const authStore = useAuthStore();

  // --- Watchers ---
  watch(() => filters.value.activeUsersPeriod, async (newVal) => {
    await setLocalStorageCache('admin_active_users_period', newVal);
    // اقتراح: إعادة جلب الإحصائيات تلقائياً عند تغيير الفترة الزمنية
    fetchStats(true);
  });

  /**
   * تحميل بيانات لوحة التحكم
   * @param {boolean} force - إجبار التحديث وتجاهل الكاش (يجب إرسال true عند فتح الصفحة mounted)
   */
  async function loadDashboardData(force = false, retryCount = 0) {
    // 1. إدارة الكاش
    const CACHE_DURATION = 30 * 1000;
    const now = Date.now();

    if (!force && lastFetchTime.value && (now - lastFetchTime.value < CACHE_DURATION)) {
      logger.info('🕒 Admin data is fresh (within 30s), skipping fetch.');
      return;
    }

    // السماح بإعادة المحاولة أو إذا كان force=true حتى لو كان هناك تحميل جاري
    if (isLoading.value && !force && retryCount === 0) return;

    isLoading.value = true;
    fetchError.value = null;

    try {
      // 2. Fetch Time Offset separately (Low priority)
      TimeService.getServerTimeOffset().then(offset => {
        serverTimeOffset.value = offset;
        logger.info('✅ Time offset fetched:', offset);
      }).catch(e => logger.warn('⚠️ Time offset fetch failed:', e));

      // 3. Parallel Data Fetch مع مهلة زمنية محسّنة
      logger.info('🔄 Starting parallel data fetch...');
      const results = await Promise.allSettled([
        fetchStats(false),
        fetchChartsData(),
        fetchPendingSubscriptions(),
        fetchAllSubscriptions(),
        fetchUsers(),
        fetchSystemConfig(),
        fetchAppErrors()
      ]);

      const failedCount = results.filter(r => r.status === 'rejected').length;
      if (failedCount > 0) {
        logger.warn(`⚠️ ${failedCount} admin requests failed, but continuing with available data.`);
      } else {
        logger.info('✅ All admin data loaded successfully');
      }

      lastFetchTime.value = Date.now();

    } catch (err) {
      logger.error(`❌ Error loading admin data (Attempt ${retryCount + 1}):`, err);

      // إعادة المحاولة مرتين فقط
      if (retryCount < 2) {
        logger.info(`🔄 Retrying admin data load (Attempt ${retryCount + 2}/3)...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return loadDashboardData(force, retryCount + 1);
      }

      fetchError.value = 'فشل تحميل البيانات، يرجى التحقق من الاتصال.';
      // لا نرمي الخطأ، نترك البيانات الحالية كما هي
    } finally {
      // التأكد من إيقاف التحميل دائماً
      isLoading.value = false;
    }
  }

  async function fetchSystemConfig() {
    try {
      const { data } = await supabase.from('system_config').select('value').eq('key', 'enforce_subscription').maybeSingle();
      if (data) {
        // تحسين قراءة القيمة سواء كانت string أو boolean
        isSubscriptionEnforced.value = String(data.value) === 'true';
        await setLocalStorageCache('sys_config_enforce', String(isSubscriptionEnforced.value));
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
      await setLocalStorageCache('sys_config_enforce', String(status));

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
      if (data) {
        pendingSubscriptions.value = data;
        logger.info('✅ Pending subscriptions loaded:', data.length);
      } else {
        pendingSubscriptions.value = [];
        logger.warn('⚠️ No pending subscriptions data');
      }
    } catch (e) {
      logger.error('❌ Error fetching pending subs', e);
      pendingSubscriptions.value = [];
    }
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

  async function syncUsers() {
    showLoading('جاري مزامنة بيانات المستخدمين...');
    try {
      const { error } = await supabase.rpc('fix_missing_profiles');
      if (error) throw error;

      await fetchUsers(false);
      await loadDashboardData(true); // تحديث شامل

      closeLoading();
      addNotification('تمت مزامنة المستخدمين بنجاح', 'success');
    } catch (err) {
      closeLoading();
      logger.error('Error syncing users:', err);
      addNotification('فشل مزامنة المستخدمين: ' + err.message, 'error');
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

      const { data: responseData, error } = await api.admin.handleSubscriptionAction(id, action);
      if (error) throw error;

      // Handle response which might be an array (for delete) or object
      const updatedSub = Array.isArray(responseData) ? responseData[0] : responseData;

      // === تحديث البيانات محلياً لتجنب إعادة التحميل ===

      // 1. حذف من المعلقة إذا كانت موجودة
      pendingSubscriptions.value = pendingSubscriptions.value.filter(s => s.id !== id);

      // 2. تحديث القائمة العامة
      if (action === 'delete') {
        allSubscriptions.value = allSubscriptions.value.filter(s => s.id !== id);
      } else if (updatedSub) {
        // إذا عادت البيانات الجديدة، نحدثها في القائمة
        const index = allSubscriptions.value.findIndex(s => s.id === id);
        if (index !== -1) {
          // دمج الخصائص الجديدة مع الموجودة
          allSubscriptions.value[index] = { ...allSubscriptions.value[index], ...updatedSub };
        } else {
          // حالة نادرة: غير موجودة في القائمة، نضيفها
          allSubscriptions.value.unshift(updatedSub);
        }
      }

      // 3. تحديث حالة المستخدم في قائمة المستخدمين
      if (targetUserId) {
        const userIndex = usersList.value.findIndex(u => u.id === targetUserId);
        if (userIndex !== -1) {
          const isActive = action === 'approve' || action === 'reactivate';
          usersList.value[userIndex].hasActiveSub = isActive;

          if (updatedSub?.data?.end_date) {
            usersList.value[userIndex].expiryDate = updatedSub.data.end_date;
          }
        }
        eventBus.emit('subscription-updated', { userId: targetUserId });
      }

      // تحديث أرقام الإحصائيات سريعاً في الخلفية
      fetchStats(true).catch(e => logger.warn('Background stats refresh failed', e));

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
        // تحديث محلي: نفترض أن التفعيل اليدوي يعني أن المستخدم أصبح نشطاً
        const userIndex = usersList.value.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          if (Number(days) > 0) usersList.value[userIndex].hasActiveSub = true;
          usersList.value[userIndex].manualDays = null; // إعادة تصفير الحقل بعد النجاح
        }

        // تحديث الخلفية
        fetchAllSubscriptions().catch(() => { });
        fetchStats().catch(() => { });
      }

      logger.info(`Emitting subscription-updated for user: ${userId}`);
      eventBus.emit('subscription-updated', { userId });

      if (shouldRefresh) {
        closeLoading();
        await showSuccess('تم تحديث الاشتراك بنجاح');
      }

    } catch (err) {
      if (shouldRefresh) {
        closeLoading();
        // في حالة الفشل، نترك القيمة كما هي ليتمكن من المحاولة مرة أخرى
      }
      logger.error('Error activating manual subscription:', err);
      if (shouldRefresh) showError(err.message || 'حدث خطأ أثناء تحديث الاشتراك');
      throw err;
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // Error Logging State
  const appErrors = ref([]);

  // ... (previous code)

  async function fetchAppErrors(showFeedback = false) {
    if (showFeedback) showLoading('جاري تحديث سجل الأخطاء...');
    try {
      const { data, error } = await supabase.rpc('get_app_errors_admin');

      if (error) throw error;
      appErrors.value = data || [];

      if (showFeedback) {
        closeLoading();
        addNotification('تم تحديث سجل الأخطاء بنجاح', 'success');
      }
    } catch (e) {
      if (showFeedback) closeLoading();
      logger.error('Error fetching app errors:', e);
      if (showFeedback) addNotification('فشل تحديث سجل الأخطاء', 'error');
    }
  }

  async function resolveError(id) {
    try {
      const { error } = await supabase
        .from('app_errors')
        .update({ is_resolved: true })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      const idx = appErrors.value.findIndex(e => e.id === id);
      if (idx !== -1) appErrors.value[idx].is_resolved = true;

      addNotification('تم تحديد الخطأ كمعالج', 'success');
    } catch (e) {
      logger.error('Error resolving error:', e);
      addNotification('فشل تحديث الحالة', 'error');
    }
  }

  async function bulkResolveErrors() {
    const unresolvedCount = appErrors.value.filter(e => !e.is_resolved).length;
    if (unresolvedCount === 0) {
      addNotification('لا توجد أخطاء غير معالجة', 'info');
      return;
    }

    const result = await confirm({
      title: 'معالجة الكل',
      text: `هل أنت متأكد من تحديد جميع الأخطاء (${unresolvedCount}) كمعالجة؟`,
      icon: 'question'
    });
    if (!result.isConfirmed) return;

    showLoading('جاري معالجة الكل...');
    try {
      const { error } = await supabase
        .from('app_errors')
        .update({ is_resolved: true })
        .eq('is_resolved', false);

      if (error) throw error;

      // Update local state
      appErrors.value.forEach(err => {
        err.is_resolved = true;
      });

      closeLoading();
      addNotification(`تم معالجة ${unresolvedCount} خطأ بنجاح`, 'success');
    } catch (e) {
      closeLoading();
      logger.error('Error bulk resolving:', e);
      addNotification('فشل معالجة الكل', 'error');
    }
  }

  async function deleteError(id) {
    const result = await confirm({
      title: 'حذف السجل',
      text: 'هل أنت متأكد من حذف هذا الخطأ؟',
      icon: 'warning'
    });
    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase.from('app_errors').delete().eq('id', id);
      if (error) throw error;
      appErrors.value = appErrors.value.filter(e => e.id !== id);
      addNotification('تم الحذف بنجاح', 'success');
    } catch (e) {
      logger.error('Failed to delete error:', e);
      addNotification('فشل الحذف', 'error');
    }
  }

  async function copyUniqueErrors() {
    if (appErrors.value.length === 0) {
      addNotification('لا توجد أخطاء للنسخ', 'info');
      return;
    }

    try {
      // Extract unique error messages
      // Extract unique error messages with whitespace trimming
      const uniqueMessages = [...new Set(appErrors.value.map(e => (e.error_message || '').trim()))].filter(Boolean);
      const textToCopy = uniqueMessages.join('\n\n');

      if (!navigator.clipboard) {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          const successful = document.execCommand('copy');
          if (!successful) throw new Error('Fallback copy failed');
          addNotification(`تم نسخ قائمة الأخطاء بنجاح ✅ (${uniqueMessages.length} خطأ)`, 'success');
        } catch (err) {
          throw err;
        } finally {
          document.body.removeChild(textArea);
        }
        return;
      }

      await navigator.clipboard.writeText(textToCopy);
      addNotification(`تم نسخ قائمة الأخطاء بنجاح ✅ (${uniqueMessages.length} خطأ)`, 'success');
    } catch (e) {
      logger.error('Failed to copy to clipboard:', e);
      addNotification('فشل النسخ للحافظة', 'error');
    }
  }

  async function runRepairTool(userId) {
    if (!userId) return;
    const result = await confirm({
      title: 'إصلاح حساب المستخدم',
      text: 'هل تريد إجراء فحص وإصلاح شامل لبيانات هذا المستخدم؟',
      icon: 'info',
      confirmButtonText: 'إبدأ الإصلاح'
    });
    if (!result.isConfirmed) return;

    showLoading('جاري إصلاح البيانات...');
    try {
      const { data, error } = await supabase.rpc('repair_user_account', { target_user_id: userId });
      if (error) throw error;

      closeLoading();
      if (data.success) {
        showSuccess(data.message);

        // Auto-resolve errors for this user
        await supabase.from('app_errors').update({ is_resolved: true }).eq('user_id', userId);

        // Refresh Lists
        fetchUsers(false);
        fetchAppErrors(false);
      } else {
        showError(data.message);
      }
    } catch (e) {
      closeLoading();
      logger.error('Repair failed:', e);
      showError('فشل إصلاح الحساب');
    }
  }

  async function sendRemoteCommand(userId, commandType) {
    const cmdMap = {
      'clear_cache': 'مسح الكاش وإعادة التحميل',
      'force_logout': 'تسجيل خروج إجباري'
    };

    const result = await confirm({
      title: 'أمر تحكم عن بعد',
      text: `هل تريد إرسال أمر "${cmdMap[commandType]}" لهذا المستخدم؟ سيتم تنفيذه عند فتح التطبيق.`,
      icon: 'warning'
    });
    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase.from('admin_user_commands').insert({
        user_id: userId,
        command_type: commandType
      });
      if (error) throw error;
      showSuccess(`تم إرسال الأمر (${cmdMap[commandType]}) بنجاح`);
    } catch (e) {
      logger.error('Command failed:', e);
      showError('فشل إرسال الأمر');
    }
  }

  async function manageAdminRole(email, action) {
    if (!email) {
      addNotification('يرجى إدخال البريد الإلكتروني', 'warning');
      return;
    }

    const actionText = action === 'promote' ? 'ترقية لمشرف' : 'إزالة الصلاحية';
    const result = await confirm({
      title: 'تأكيد الإجراء الحساس',
      text: `هل أنت متأكد من ${actionText} للمستخدم ${email}؟`,
      icon: 'warning'
    });

    if (!result.isConfirmed) return;

    showLoading('جاري تحديث الصلاحيات...');
    try {
      const response = await api.admin.manageAdminRole(email, action);

      closeLoading();

      if (response && response.success) {
        showSuccess(response.message);
        // تحديث القائمة إذا كان المستخدم موجوداً فيها
        const userIdx = usersList.value.findIndex(u => u.email === email);
        if (userIdx !== -1) {
          usersList.value[userIdx].role = response.new_role;
        }
      } else {
        showError(response?.message || 'فشلت العملية');
      }
    } catch (e) {
      closeLoading();
      logger.error('Manage admin role failed:', e);
      showError('حدث خطأ غير متوقع');
    }
  }

  return {
    stats, chartsData, usersList, pendingSubscriptions, allSubscriptions, filters, isLoading, isSubscriptionEnforced, fetchError,
    serverTimeOffset, appErrors,
    loadDashboardData, fetchStats, fetchAllSubscriptions, fetchUsers, syncUsers, fetchAppErrors, resolveError, bulkResolveErrors, deleteError,
    handleSubscriptionAction, activateManualSubscription, formatDate, toggleSubscriptionEnforcement, fetchSystemConfig,
    runRepairTool, sendRemoteCommand, copyUniqueErrors, manageAdminRole
  };
});