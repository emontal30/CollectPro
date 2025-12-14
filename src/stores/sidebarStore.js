import { defineStore } from 'pinia';
import { ref, computed, onUnmounted } from 'vue';
import api from '@/services/api';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import eventBus from '@/utils/eventBus';
import { calculateDaysRemaining } from '@/utils/formatters';
import logger from '@/utils/logger.js'

export const useSidebarStore = defineStore('sidebar', () => {
  // --- الحالة (State) ---
  const isOpen = ref(false); // للتحكم في الفتح/الإغلاق في الموبايل
  const user = ref(null);
  const subscription = ref(null);
  const isAdmin = ref(false);
  const router = useRouter();

  // --- الحسابات (Getters/Computed) ---

  // 1. حساب الأيام المتبقية باستخدام الدالة المشتركة
  const daysLeft = computed(() => {
    if (!subscription.value?.end_date) return 0;
    return calculateDaysRemaining(subscription.value.end_date);
  });

  // 2. تحديد حالة ولون نص الأيام
  const subscriptionStatusClass = computed(() => {
    if (!subscription.value) return 'expired';
    if (subscription.value.status === 'pending') return 'pending';
    if (subscription.value.status === 'cancelled') return 'expired';
    if (subscription.value.status === 'expired') return 'expired';
    
    const days = daysLeft.value;
    if (days <= 0) return 'expired';
    if (days <= 7) return 'warning';
    return '';
  });

  // 3. نص العرض للأيام
  const daysDisplay = computed(() => {
    if (!subscription.value) return 'لا يوجد اشتراك';
    if (subscription.value.status === 'pending') return 'قيد المراجعة';
    if (subscription.value.status === 'cancelled') return 'ملغي';
    if (subscription.value.status === 'expired') return 'منتهي';
    
    const days = daysLeft.value;
    if (days <= 0) return 'اشتراك منتهي';
    return days.toString();
  });

  // 4. تحديد ما إذا كان يظهر نص "يوم متبقي"
  const showDaysText = computed(() => {
    if (!subscription.value) return false;
    if (subscription.value.status === 'pending') return false;
    if (subscription.value.status === 'cancelled') return false;
    if (subscription.value.status === 'expired') return false;
    
    const days = daysLeft.value;
    return days > 0;
  });

  // --- الإجراءات (Actions) ---

  // 1. تبديل القائمة (للموبايل)
  function toggleSidebar() {
    isOpen.value = !isOpen.value;
  }

  function closeSidebar() {
    isOpen.value = false;
  }

  // 2. جلب بيانات المستخدم والاشتراك (قاعدة البيانات)
  async function fetchSidebarData() {
    // Always fetch fresh data to ensure consistency
    if (!navigator.onLine) return;

    try {
      const { user: currentUser } = await api.auth.getUser();
      if (!currentUser) return;

      user.value = currentUser;
      isAdmin.value = ['emontal.33@gmail.com'].includes(currentUser.email); // Check logic
      const { subscription: subData } = await api.subscriptions.getSubscription(currentUser.id);
      subscription.value = subData;
    } catch (err) { logger.error('Error fetching sidebar data:', err); }
  }

  // 4. تحديث بيانات الاشتراك من event bus
  function updateSubscriptionFromEvent(subscriptionData) {
    subscription.value = subscriptionData;
    logger.info('Sidebar subscription updated from event:', subscriptionData);
  }

  // الاستماع لأحداث تحديث الاشتراك
  eventBus.on('subscription-updated', updateSubscriptionFromEvent);

  // تنظيف المستمع عند تدمير المكون
  onUnmounted(() => {
    eventBus.off('subscription-updated', updateSubscriptionFromEvent);
  });

  // 3. تسجيل الخروج
  async function logout() {
    try {
      const authStore = useAuthStore();
      isOpen.value = false; // إغلاق الشريط الجانبي قبل الخروج
      await authStore.logout();
    } catch (error) {
      logger.error('Logout error:', error);
      // في حالة الخطأ، وجه لصفحة الدخول مباشرة
      try {
        await router.replace('/');
      } catch (routeError) {
        window.location.href = '/';
      }
    }
  }

  return {
    isOpen,
    user,
    isAdmin,
    daysLeft,
    daysDisplay,
    subscriptionStatusClass,
    showDaysText,
    toggleSidebar,
    closeSidebar,
    fetchSidebarData,
    logout
  };
});