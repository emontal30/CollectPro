import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/services/api';
import { apiInterceptor } from '@/services/apiInterceptor';
import { supabase } from '@/supabase';
import { useRouter } from 'vue-router';
import { useNotifications } from '@/composables/useNotifications';
import logger from '@/utils/logger.js'

export const usePaymentStore = defineStore('payment', () => {
  // --- State ---
  const selectedPlan = ref(null);
  const userData = ref({ name: '', email: '', id: '' });
  const transactionId = ref('');
  const paymentMethod = ref('vodafone-cash');
  const isLoading = ref(false);
  const router = useRouter();

  const { error, success, confirm } = useNotifications();

  // --- Actions ---

  async function init() {
    const planId = localStorage.getItem('selectedPlanId');
    if (!planId) {
      router.push('/app/subscriptions');
      return;
    }

    isLoading.value = true;
    try {
      selectedPlan.value = await api.payment.getPlanDetails(planId);
      const { user } = await api.auth.getUser();
      if (user) {
        userData.value = {
          name: user.user_metadata?.full_name || user.email || 'مستخدم',
          email: user.email || 'user@example.com',
          id: user.id || 'guest'
        };
      }
    } catch (err) {
      logger.error('Payment init error:', err);
    } finally {
      isLoading.value = false;
    }
  }

  async function submitPayment() {
    if (!transactionId.value.trim()) {
      error('رقم عملية التحويل مطلوب');
      return;
    }

    isLoading.value = true;
    try {
      const { user } = await api.auth.getUser();
      if (!user) throw new Error("المستخدم غير مسجل دخوله.");

      // التحقق من الاشتراكات النشطة (تم التحويل لـ apiInterceptor)
      const { data: activeSubs, error: fetchError } = await apiInterceptor(
        supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
      );

      if (fetchError) throw fetchError;

      if (activeSubs && activeSubs.length > 0) {
        const confirmResult = await confirm({
          title: 'تحذير!',
          text: 'لديك اشتراك نشط بالفعل. هل أنت متأكد من رغبتك في المتابعة وإلغاء الاشتراك الحالي؟',
          icon: 'warning',
          confirmButtonText: 'نعم، متابعة'
        });

        if (!confirmResult.isConfirmed) return;
      }

      const { error: paymentError } = await api.payment.submitPayment(
        user.id,
        selectedPlan.value.id,
        transactionId.value,
        userData.value,
        selectedPlan.value
      );

      if (paymentError) throw paymentError;

      await success('تم إرسال طلب اشتراكك بنجاح. سيتم مراجعته وتفعيله خلال 24 ساعة.', 'تم بنجاح');
      localStorage.removeItem('selectedPlanId');
      router.push('/app/my-subscription');

    } catch (err) {
      logger.error(err);
      error(`حدث خطأ: ${err.message || 'فشل الاتصال بالخادم'}`);
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
    submitPayment
  };
});
