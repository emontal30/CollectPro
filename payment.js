
document.addEventListener('DOMContentLoaded', async () => {
  // تعريف تفاصيل الخطط لربط معرف السعر بالاسم والسعر
  const PLAN_DETAILS = {
    'price_1PgEU9RpN92qb2qTu219Z9G7': { name: 'خطة شهرية', price: '30' },
    'price_1PgEUzRpN92qb2qT52L0kY5p': { name: 'خطة ربع سنوية', price: '80' },
    'price_1PgEVKRpN92qb2qT7gYIEN1M': { name: 'خطة سنوية', price: '300' }
  };

  // تحميل بيانات المستخدم والخطة المختارة
  await loadUserData();
  loadSelectedPlan(PLAN_DETAILS);

  // إعداد مستمع حدث لإرسال النموذج
  const paymentForm = document.getElementById('payment-form');
  if (paymentForm) {
    paymentForm.addEventListener('submit', (e) => handlePaymentSubmit(e, PLAN_DETAILS));
  }
});

async function loadUserData() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      document.getElementById('email').value = user.email || '';
      document.getElementById('user-id').value = user.id || '';
    } else {
      showAlert('يجب تسجيل الدخول أولاً للمتابعة', 'danger');
      setTimeout(() => { window.location.href = 'index.html'; }, 2500);
    }
  } catch (error) {
    console.error('Error loading user data:', error);
    showAlert('حدث خطأ أثناء تحميل بيانات المستخدم', 'danger');
  }
}

function loadSelectedPlan(planDetails) {
  try {
    const selectedPlanId = localStorage.getItem('selectedPlanId');
    const plan = planDetails[selectedPlanId];

    if (plan) {
      document.getElementById('selected-plan').textContent = plan.name;
      document.getElementById('plan-price').textContent = `${plan.price} ج.م`;
      document.getElementById('subscription-type').value = plan.name;
    } else {
      showAlert('لم يتم اختيار خطة اشتراك. سيتم توجيهك لاختيار خطة.', 'danger');
      setTimeout(() => { window.location.href = 'subscriptions.html'; }, 2500);
    }
  } catch (error) {
    console.error('Error loading selected plan:', error);
    showAlert('حدث خطأ أثناء تحميل بيانات الخطة', 'danger');
  }
}

async function handlePaymentSubmit(e, planDetails) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('.submit-btn');
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;

  try {
    const userId = document.getElementById('user-id').value;
    const email = document.getElementById('email').value;
    const transactionId = document.getElementById('transaction-id').value.trim();
    const selectedPlanId = localStorage.getItem('selectedPlanId');
    const plan = planDetails[selectedPlanId];

    if (!userId) {
        throw new Error("المستخدم غير مسجل دخوله.");
    }
    if (!transactionId) {
      showAlert('رقم عملية التحويل مطلوب', 'danger');
      return;
    }
    if (!plan || !selectedPlanId) {
      showAlert('خطة الاشتراك غير معروفة. يرجى الاختيار مرة أخرى.', 'danger');
      return;
    }

    // التحقق من عدم تكرار رقم العملية
    const { data: existing, error: checkError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('transaction_id', transactionId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = 'لم يتم العثور على صف واحد بالضبط'
        throw checkError;
    }
    if (existing) {
      showAlert('رقم عملية التحويل هذا مستخدم بالفعل.', 'danger');
      return;
    }

    // إدراج طلب اشتراك جديد
    const { error: insertError } = await supabase
      .from('subscriptions')
      .insert([
        {
          user_id: userId,
          email: email,
          plan_id: selectedPlanId, 
          subscription_type: plan.name, 
          transaction_id: transactionId,
          status: 'pending'
        }
      ]);

    if (insertError) {
      throw insertError;
    }

    showAlert('تم استلام طلبك بنجاح. سيتم مراجعته وتفعيل اشتراكك قريباً.', 'success');
    localStorage.removeItem('selectedPlanId');

    // إعادة التوجيه إلى صفحة "اشتراكي"
    setTimeout(() => {
      window.location.href = 'my-subscription.html';
    }, 3000);

  } catch (error) {
    console.error('Error submitting payment request:', error);
    showAlert(`حدث خطأ أثناء إرسال طلبك: ${error.message}`, 'danger');
  } finally {
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
}

function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('alert-container');
  if (!alertContainer) return;

  const alert = document.createElement('div');
  alert.className = `alert alert-${type} show`;
  
  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-check-circle';
  if (type === 'danger') icon = 'fa-exclamation-circle';
  
  alert.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
  
  alertContainer.appendChild(alert);
  
  setTimeout(() => {
    alert.classList.remove('show');
    setTimeout(() => alert.remove(), 500);
  }, 5000);
}
