import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/services/api';
import { supabase } from '@/services/api';
import { useRouter } from 'vue-router';
import { useNotifications } from '@/composables/useNotifications';

export const usePaymentStore = defineStore('payment', () => {
  // --- الحالة (State) ---
  const selectedPlan = ref(null);
  const userData = ref({
    name: '',
    email: '',
    id: ''
  });
  const transactionId = ref('');
  const paymentMethod = ref('vodafone-cash'); // القيمة الافتراضية
  const isLoading = ref(false);
  const router = useRouter();

  // نظام الإشعارات الموحد
  const { error, success, confirm, addNotification } = useNotifications();

  // --- الإجراءات (Actions) ---

  // 1. تهيئة الصفحة وتحميل البيانات (بدون قيود)
  async function init() {
    const planId = localStorage.getItem('selectedPlanId');
    if (!planId) {
      // في حالة عدم وجود خطة، نعود لصفحة الاشتراكات بهدوء
      router.push('/app/subscriptions');
      return;
    }

    isLoading.value = true;
    try {
      await loadPlanDetails(planId);
      // تحميل بيانات المستخدم اختياري
      try {
        await loadUserData();
      } catch (userError) {
        console.warn('Could not load user data, continuing anyway:', userError);
        // نستمر حتى بدون بيانات المستخدم
      }
    } catch (error) {
      console.error(error);
    } finally {
      isLoading.value = false;
    }
  }

  // 2. تحميل تفاصيل الخطة
  async function loadPlanDetails(planId) {
    selectedPlan.value = await api.payment.getPlanDetails(planId);
  }

  // 3. تحميل بيانات المستخدم (اختياري ومرن)
  async function loadUserData() {
    try {
      const { user } = await api.auth.getUser();
      if (user) {
        userData.value = {
          name: user.user_metadata?.full_name || user.email || 'مستخدم',
          email: user.email || 'user@example.com',
          id: user.id || 'guest'
        };
      } else {
        // بيانات افتراضية للمستخدم غير المسجل
        userData.value = {
          name: 'زائر',
          email: 'guest@example.com',
          id: 'guest'
        };
      }
    } catch (error) {
      console.warn('Could not load user data, using defaults:', error);
      userData.value = {
        name: 'زائر',
        email: 'guest@example.com',
        id: 'guest'
      };
    }
  }

  // 4. تغيير طريقة الدفع
  function setPaymentMethod(method) {
    paymentMethod.value = method;
  }

  // 5. إرسال طلب الدفع
  async function submitPayment() {
    if (!transactionId.value.trim()) {
      error('رقم عملية التحويل مطلوب');
      return;
    }

    isLoading.value = true;
    try {
      const { user } = await api.auth.getUser();
      if (!user) throw new Error("المستخدم غير مسجل دخوله.");

      // التحقق من الاشتراكات النشطة
      const { data: activeSubs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (activeSubs && activeSubs.length > 0) {
        const confirmResult = await confirm({
          title: 'تحذير!',
          text: 'لديك اشتراك نشط بالفعل. هل أنت متأكد من رغبتك في المتابعة وإلغاء الاشتراك الحالي؟',
          icon: 'warning',
          confirmButtonText: 'نعم، متابعة',
          cancelButtonText: 'إلغاء'
        });

        if (!confirmResult.isConfirmed) {
          isLoading.value = false;
          return;
        }
      }

      const { error: paymentError } = await api.payment.submitPayment(
        user.id,
        selectedPlan.value.id.length > 10 ? selectedPlan.value.id : null,
        transactionId.value,
        userData.value,
        selectedPlan.value
      );

      if (paymentError) throw paymentError;

      await success('تم إرسال طلب اشتراكك بنجاح. سيتم مراجعته وتفعيله خلال 24 ساعة.', 'تم بنجاح');

      localStorage.removeItem('selectedPlanId');
      router.push('/app/my-subscription');

    } catch (err) {
      console.error(err);
      error(`حدث خطأ أثناء إرسال الطلب: ${err.message}`);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    selectedPlan,
    userData,
    transactionId,
    paymentMethod,
    isLoading,
    init,
    setPaymentMethod,
    submitPayment
  };
});