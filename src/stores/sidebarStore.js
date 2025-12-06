import { defineStore } from 'pinia';
import { ref, computed, onUnmounted } from 'vue';
import api from '@/services/api';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import eventBus from '@/utils/eventBus';
import { calculateDaysRemaining } from '@/utils/formatters';

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
    try {
      const { user: currentUser } = await api.auth.getUser();

      if (!currentUser) {
        user.value = null;
        return;
      }

      user.value = currentUser;

      // التحقق من صلاحية المدير (نفس المنطق: القائمة الثابتة)
      const adminEmails = ['emontal.33@gmail.com'];
      isAdmin.value = adminEmails.includes(currentUser.email);

      // جلب آخر اشتراك
      const { subscription: subData } = await api.subscriptions.getSubscription(currentUser.id);
      subscription.value = subData;

      // حفظ الأيام المتبقية في LocalStorage (للتوافق مع الكود القديم إذا لزم الأمر)
      if (daysDisplay.value !== 'اشتراك منتهي' && daysDisplay.value !== 'قيد المراجعة' && daysDisplay.value !== 'لا يوجد اشتراك' && daysDisplay.value !== 'ملغي') {
        localStorage.setItem('sidebarDaysLeft', daysDisplay.value);
      }

    } catch (error) {
      console.error('Error fetching sidebar data:', error);
    }
  }

  // 4. تحديث بيانات الاشتراك من event bus
  function updateSubscriptionFromEvent(subscriptionData) {
    subscription.value = subscriptionData;
    console.log('Sidebar subscription updated from event:', subscriptionData);
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
      await authStore.logout();
      isOpen.value = false; // إغلاق الشريط الجانبي بعد الخروج
    } catch (error) {
      console.error('Logout error:', error);
      // في حالة الخطأ، وجه لصفحة الدخول مباشرة
      router.push('/');
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