
document.addEventListener('DOMContentLoaded', async () => {
  const selectedPlanId = localStorage.getItem('selectedPlanId');

  if (!selectedPlanId) {
    showAlert('لم يتم اختيار خطة اشتراك. سيتم توجيهك لاختيار خطة.', 'danger');
    setTimeout(() => { window.location.href = 'subscriptions.html'; }, 2500);
    return;
  }

  // تحميل بيانات المستخدم والخطة المختارة
  const plan = await loadPlanDetails(selectedPlanId);
  if (plan) {
    await loadUserData();
    displayPlanDetails(plan);

    // إعداد مستمع حدث لإرسال النموذج
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
      paymentForm.addEventListener('submit', (e) => handlePaymentSubmit(e, plan));
    }
  }
});

async function loadPlanDetails(planId) {
  try {
    const { data: plan, error } = await supabase
      .from('plans')
      .select('*')
      .eq('plan_id', planId)
      .single();

    if (error || !plan) {
      throw new Error('لم يتم العثور على الخطة المختارة.');
    }
    return plan;
  } catch (error) {
    console.error('Error loading plan details:', error);
    showAlert(error.message, 'danger');
    setTimeout(() => { window.location.href = 'subscriptions.html'; }, 2500);
    return null;
  }
}

function displayPlanDetails(plan) {
  document.getElementById('selected-plan').textContent = plan.name || 'خطة مخصصة';
  document.getElementById('plan-price').textContent = `${plan.price || 0} ج.م`;
  document.getElementById('subscription-type').value = plan.name || 'خطة مخصصة';
}

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

async function handlePaymentSubmit(e, plan) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('.submit-btn');
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;

  try {
    const userId = document.getElementById('user-id').value;
    const email = document.getElementById('email').value;
    const transactionId = document.getElementById('transaction-id').value.trim();

    if (!userId) {
        throw new Error("المستخدم غير مسجل دخوله.");
    }
    if (!transactionId) {
      showAlert('رقم عملية التحويل مطلوب', 'danger');
      return;
    }
    if (!plan) {
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
          plan_id: plan.plan_id, 
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
