// Global error handlers
window.onerror = function(message, source, lineno, colno, error) {
  console.error("An unhandled error occurred:", {
    message: message,
    source: source,
    lineno: lineno,
    colno: colno,
    error: error
  });
};

window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection:', {
    reason: event.reason
  });
});

document.addEventListener('DOMContentLoaded', async () => {
   const selectedPlanId = localStorage.getItem('selectedPlanId');

   if (!selectedPlanId) {
     showAlert('لم يتم اختيار خطة اشتراك. سيتم توجيهك لاختيار خطة.', 'danger');
     setTimeout(() => { window.location.href = 'subscriptions.html'; }, 2500);
     return;
   }

   const plan = await loadPlanDetails(selectedPlanId);
   if (plan) {
     const user = await loadUserData();
     displayPlanDetails(plan);

     if (window.populateUserData && user) {
       await window.populateUserData();
     }

     setupPaymentMethodListeners();

     const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
      paymentForm.addEventListener('submit', (e) => handlePaymentSubmit(e, plan));
    }
  }
});

async function loadPlanDetails(planId) {
  try {
    const durationMap = {
      'monthly': { months: 1, period: 'شهريًا' },
      'quarterly': { months: 3, period: '3 شهور' },
      'yearly': { months: 12, period: 'سنويًا' }
    };
    const planInfo = durationMap[planId];

    if (!planInfo) {
      throw new Error('خطة اشتراك غير صالحة.');
    }

    const { data: planData, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('duration_months', planInfo.months)
      .limit(1)
      .single();

    if (error) throw error;

    if (!planData) {
      throw new Error(`لم يتم العثور على خطة لمدة ${planInfo.months} شهر.`);
    }

    planData.period = planInfo.period;
    return planData;

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
     const { data: { user }, error } = await supabase.auth.getUser();

     if (error) throw error;

     if (user) {
       const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'مستخدم';
       document.getElementById('user-name-field').value = displayName;
       document.getElementById('email').value = user.email || '';
       document.getElementById('user-id-field').value = user.id.slice(-7);

       updateSidebarUserData(user);
       return user;
     } else {
       showAlert('يجب تسجيل الدخول أولاً للمتابعة', 'danger');
       setTimeout(() => { window.location.href = 'index.html'; }, 2500);
       return null;
     }
   } catch (error) {
     console.error('Error loading user data:', error);
     showAlert('حدث خطأ أثناء تحميل بيانات المستخدم. يرجى تسجيل الدخول مرة أخرى.', 'danger');
     return null;
   }
}

function updateSidebarUserData(user) {
  const userNameEl = document.getElementById('user-name');
  const userInitialEl = document.getElementById('user-initial');
  const userEmailEl = document.getElementById('user-email');
  const userIdEl = document.getElementById('user-id');

  if (userNameEl) {
    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'مستخدم';
    userNameEl.textContent = displayName;
    if (userInitialEl) userInitialEl.textContent = displayName.charAt(0).toUpperCase();
    if (userEmailEl) userEmailEl.textContent = user.email;
    if (userIdEl) userIdEl.textContent = `ID: ${user.id.slice(-7)}`;
  }
}

async function handlePaymentSubmit(e, plan) {
   e.preventDefault();
   const submitBtn = e.target.querySelector('.submit-btn');
   submitBtn.classList.add('loading');
   submitBtn.disabled = true;

   try {
     const { data: { user } } = await supabase.auth.getUser();

     if (!user) {
         throw new Error("المستخدم غير مسجل دخوله.");
     }
     const userId = user.id;

     // التحقق من وجود اشتراك نشط للمستخدم
     const { data: activeSubscriptions, error: activeCheckError } = await supabase
       .from('subscriptions')
       .select('id, status, plan_name, end_date')
       .eq('user_id', userId)
       .eq('status', 'active')
       .limit(1);

     // الحصول على الاشتراك الأول إذا كان موجوداً
     const activeSubscription = activeSubscriptions && activeSubscriptions.length > 0 ? activeSubscriptions[0] : null;

     if (activeSubscription && !activeCheckError) {
       const planName = activeSubscription.plan_name || 'الخطة الحالية';
       const endDate = activeSubscription.end_date ? new Date(activeSubscription.end_date).toLocaleDateString('ar-EG') : 'غير محدد';

       const message = `لديك اشتراك نشط حالياً (${planName}) حتى تاريخ ${endDate}.\n\n` +
                      `تأكيد المتابعة مع الطلب الجديد يعني:\n` +
                      `• إلغاء الاشتراك الحالي فوراً\n` +
                      `• تفعيل الاشتراك الجديد بدءاً من تاريخ اليوم\n` +
                      `• عدم إمكانية استعادة الاشتراك الحالي\n\n` +
                      `هل أنت متأكد من رغبتك في المتابعة؟`;

       const result = await Swal.fire({
         title: 'تحذير!',
         text: message,
         icon: 'warning',
         showCancelButton: true,
         confirmButtonText: 'نعم، متابعة',
         cancelButtonText: 'إلغاء',
         confirmButtonColor: '#007965',
         cancelButtonColor: '#6c757d',
         customClass: {
           popup: 'swal-rtl'
         }
       });

       if (!result.isConfirmed) {
         submitBtn.classList.remove('loading');
         submitBtn.disabled = false;
         return;
       }
     }

    const transactionId = document.getElementById('transaction-id').value.trim();

    if (!transactionId) {
      showAlert('رقم عملية التحويل مطلوب', 'danger');
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      return;
    }

    // Step 1: Check if user exists in our public.users table
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    // If user does not exist, insert them.
    if (userCheckError && userCheckError.code === 'PGRST116') { // PGRST116 = Not Found
      console.log('إضافة المستخدم إلى جدول users...');
      const { error: insertUserError } = await supabase
        .from('users')
        .insert([
          {
            id: userId,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
            email: user.email,
            password_hash: '' // *** THIS IS THE FIX ***
          }
        ]);

      if (insertUserError) {
        console.error('فشل في إضافة المستخدم:', insertUserError);
        throw new Error(`فشل في حفظ بيانات المستخدم: ${insertUserError.message}`);
      }
    } else if (userCheckError) {
        throw new Error(`فشل في التحقق من المستخدم: ${userCheckError.message}`);
    }

    // Step 2: إلغاء الاشتراك النشط إذا كان موجوداً
    if (activeSubscription) {
      const { error: cancelError } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          end_date: new Date().toISOString()
        })
        .eq('id', activeSubscription.id);

      if (cancelError) {
        console.error('Error cancelling active subscription:', cancelError);
        // لا نتوقف هنا، نستمر في إنشاء الاشتراك الجديد
      }
    }

    // Step 3: Insert the subscription
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert([
        {
          user_id: userId,
          plan_id: plan.id,
          plan_name: plan.name,
          plan_period: plan.period,
          price: plan.price,
          transaction_id: transactionId,
          status: 'pending'
        }
      ]);

    if (subscriptionError) {
      throw new Error(`فشل في حفظ الاشتراك: ${subscriptionError.message}`);
    }

    console.log('✅ تم حفظ الطلب في قاعدة البيانات بنجاح');

    showAlert('تم إرسال طلب اشتراكك بنجاح. سيتم مراجعته وتفعيله خلال 24 ساعة.', 'success');

    localStorage.removeItem('selectedPlanId');
    setTimeout(() => {
      window.location.href = 'my-subscription.html';
    }, 4000); // Increased timeout to allow reading the warning

   } catch (error) { // This catches critical errors like saving the subscription
     console.error('Error submitting payment request:', error);
     showAlert(`حدث خطأ أثناء إرسال طلبك: ${error.message}`, 'danger');
   } finally {
     submitBtn.classList.remove('loading');
     submitBtn.disabled = false;
   }
}


function setupPaymentMethodListeners() {
  const paymentOptions = document.querySelectorAll('.payment-option');

  paymentOptions.forEach(option => {
    option.addEventListener('click', () => {
      paymentOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      const selectedMethod = option.getAttribute('data-method');
      showPaymentSteps(selectedMethod);
    });
  });
}

function showPaymentSteps(method) {
  document.querySelectorAll('.payment-steps').forEach(steps => {
    steps.style.display = 'none';
  });

  const selectedOption = document.querySelector(`.payment-option[data-method="${method}"]`);
  if (selectedOption) {
    const steps = selectedOption.querySelector('.payment-steps');
    if (steps) {
      steps.style.display = 'block';
    }
  }
}

function showAlert(message, type = 'info') {
  let title = 'تنبيه';
  let icon = 'info';

  if (type === 'success') {
    title = 'نجح!';
    icon = 'success';
  } else if (type === 'danger') {
    title = 'خطأ!';
    icon = 'error';
  } else if (type === 'warning') {
    title = 'تحذير!';
    icon = 'warning';
  }

  Swal.fire({
    title: title,
    text: message,
    icon: icon,
    confirmButtonText: 'موافق',
    confirmButtonColor: '#007965',
    customClass: {
      popup: 'swal-rtl'
    }
  });
}