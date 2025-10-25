
// Global error handlers
window.onerror = function(message, source, lineno, colno, error) {
  console.error("An unhandled error occurred:", {
    message: message,
    source: source,
    lineno: lineno,
    colno: colno,
    error: error
  });
  // Here you could send the error to a logging service
};

window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection:', {
    reason: event.reason
  });
  // Here you could send the error to a logging service
});

// إزالة استيراد خدمة البريد الإلكتروني من الجانب العميل

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
     const user = await loadUserData();
     displayPlanDetails(plan);

     // تحديث بيانات المستخدم في الشريط الجانبي (سيتم داخل loadUserData)
     // إضافة استدعاء إضافي للتأكد من تحديث البيانات في جميع الحالات
     if (window.populateUserData && user) {
       await window.populateUserData();
     }

     // إعداد مستمعي أحداث طرق الدفع
     setupPaymentMethodListeners();

     // ضمان تحديث بيانات المستخدم في الشريط الجانبي
     setTimeout(async () => {
       if (window.populateUserData) {
         await window.populateUserData();
       }
     }, 100);

     // محاولة إضافية لتحديث البيانات بعد تحميل الصفحة بالكامل
     setTimeout(async () => {
       try {
         console.log('🔄 جاري التحقق من تحديث البيانات الإضافية...');
         const { data: { user } } = await supabase.auth.getUser();
         if (user) {
           updateSidebarUserData(user);
           console.log('✅ تم تحديث بيانات المستخدم الإضافية من جلسة تسجيل الدخول');

           // رسالة خفية للتأكيد على نجاح تحديث البيانات
           setTimeout(() => {
             console.log('🎯 البيانات محدثة من تسجيل الدخول النشط');
             console.log('📋 تم تحديث النصوص التوضيحية في صفحة الدفع');
             console.log('🔐 المصدر: جلسة Supabase النشطة');
           }, 1000);
         }
       } catch (error) {
         console.log('⚠️ لا توجد تحديثات إضافية للبيانات من تسجيل الدخول');
       }
     }, 500);

    // إعداد مستمع حدث لإرسال النموذج
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
      paymentForm.addEventListener('submit', (e) => handlePaymentSubmit(e, plan));
    }
  }
});

async function loadPlanDetails(planId) { // planId is 'monthly', 'quarterly', or 'yearly'
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

    // Fetch the plan from Supabase based on duration, taking the first one found.
    const { data: planData, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('duration_months', planInfo.months)
      .limit(1) // Get only one record
      .single(); // Still use single to get an object instead of an array

    if (error) {
      throw error;
    }

    if (!planData) {
      throw new Error(`لم يتم العثور على خطة لمدة ${planInfo.months} شهر.`);
    }

    // Add the 'period' back into the plan object for use in handlePaymentSubmit
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
     console.log('🔄 جاري جلب بيانات المستخدم من تسجيل الدخول...');

     // جلب بيانات المستخدم من Supabase مباشرة من جلسة تسجيل الدخول النشطة
     const { data: { user }, error } = await supabase.auth.getUser();

     if (error) {
       console.error('خطأ في جلب بيانات المستخدم من Supabase:', error);
       throw error;
     }

     if (user) {
       // تحديث حقول النموذج بالبيانات من جلسة تسجيل الدخول النشطة
       const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'مستخدم';
       document.getElementById('user-name-field').value = displayName;
       document.getElementById('email').value = user.email || '';
       document.getElementById('user-id').value = user.id.slice(-7);

       // تحديث بيانات المستخدم في الشريط الجانبي أيضاً
       updateSidebarUserData(user);

       console.log('✅ تم تحميل بيانات المستخدم من جلسة تسجيل الدخول النشطة');
       console.log('📧 البريد الإلكتروني:', user.email);
       console.log('🆔 معرف المستخدم:', user.id);
       console.log('👤 اسم المستخدم:', user.user_metadata?.full_name || user.user_metadata?.name || 'غير محدد');
       console.log('🔑 حالة الجلسة: نشطة وصالحة');
       console.log('🔐 المصدر: جلسة Supabase النشطة (موثوق)');

       return user;
     } else {
       console.log('❌ لم يتم العثور على جلسة مستخدم نشطة');

       // التحقق من وجود جلسة نشطة بطريقة أخرى
       const { data: { session } } = await supabase.auth.getSession();

       if (session?.user) {
         const displayName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email || 'مستخدم';
         document.getElementById('user-name-field').value = displayName;
         document.getElementById('email').value = session.user.email || '';
         document.getElementById('user-id').value = session.user.id.slice(-7);
         updateSidebarUserData(session.user);

         console.log('✅ تم العثور على جلسة نشطة في المحاولة الثانية');
         console.log('📧 البريد الإلكتروني:', session.user.email);
         console.log('🔑 انتهاء صلاحية الجلسة:', new Date(session.expires_at * 1000).toLocaleString());
         return session.user;
       }

       console.log('⚠️ لا توجد جلسة مستخدم نشطة، يجب تسجيل الدخول');
       console.log('🔑 الرجاء تسجيل الدخول للمتابعة');
       showAlert('يجب تسجيل الدخول أولاً للمتابعة', 'danger');
       setTimeout(() => { window.location.href = 'index.html'; }, 2500);
       return null;
     }
   } catch (error) {
     console.error('❌ خطأ في جلب بيانات المستخدم من تسجيل الدخول:', error);

     // في حالة الخطأ الشديد، محاولة الرجوع للبيانات المحفوظة محلياً فقط إذا كانت متوفرة
     try {
       const userString = localStorage.getItem('user') || sessionStorage.getItem('user');
       if (userString) {
         const user = JSON.parse(userString);
         const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'مستخدم';
         document.getElementById('user-name-field').value = displayName;
         document.getElementById('email').value = user.email || '';
         document.getElementById('user-id').value = user.id.slice(-7);
         updateSidebarUserData(user);

         console.log('⚠️ تم استخدام البيانات المحفوظة محلياً كبديل مؤقت');
         console.log('📧 البريد الإلكتروني:', user.email);
         console.log('🆔 معرف المستخدم:', user.id);
         console.log('💾 المصدر: البيانات المحفوظة محلياً (احتياطي)');
         console.log('⚠️ قد تحتاج إلى تحديث البيانات من تسجيل الدخول');

         // تنبيه المستخدم بأن البيانات من المصدر الاحتياطي
         showAlert('تم تحميل البيانات من المصدر الاحتياطي. تأكد من تسجيل الدخول لحصول أحدث البيانات.', 'info');

         console.log('⚠️ تنبيه: البيانات من المصدر الاحتياطي قد لا تكون محدثة');

         return user;
       }
     } catch (fallbackError) {
       console.error('❌ خطأ حتى في البيانات الاحتياطية:', fallbackError);
     }

     showAlert('حدث خطأ أثناء تحميل بيانات المستخدم. يرجى تسجيل الدخول مرة أخرى.', 'danger');
     return null;
   }
}

function updateSidebarUserData(user) {
  // تحديث بيانات المستخدم في الشريط الجانبي
  const userNameEl = document.getElementById('user-name');
  const userInitialEl = document.getElementById('user-initial');
  const userEmailEl = document.getElementById('user-email');
  const userIdEl = document.getElementById('user-id');

  if (userNameEl || userInitialEl || userEmailEl || userIdEl) {
    // جلب اسم المستخدم من user_metadata أو البريد الإلكتروني كبديل
    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'مستخدم';

    if (userNameEl) userNameEl.textContent = displayName;
    if (userInitialEl) userInitialEl.textContent = displayName.charAt(0).toUpperCase();
    if (userEmailEl) userEmailEl.textContent = user.email;
    if (userIdEl) userIdEl.textContent = `ID: ${user.id.slice(-7)}`;

    console.log('تم تحديث بيانات المستخدم في الشريط الجانبي');
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
    const userId = user.id; // Use the full UUID

    const email = document.getElementById('email').value;
    const transactionId = document.getElementById('transaction-id').value.trim();

    if (!transactionId) {
      showAlert('رقم عملية التحويل مطلوب', 'danger');
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      return;
    }
    if (!plan) {
      showAlert('خطة الاشتراك غير معروفة. يرجى الاختيار مرة أخرى.', 'danger');
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      return;
    }

    // تخطي التحقق من تكرار رقم العملية لتجنب مشاكل قاعدة البيانات
    // في بيئة الإنتاج، يجب إنشاء جدول مناسب أو استخدام خدمة خارجية لتتبع المعاملات

    // حفظ الطلب في قاعدة البيانات أولاً (مهم جداً - يجب أن يتم حتى لو فشل الإيميل)
    // أولاً، تحقق من وجود المستخدم في جدول users
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userCheckError && userCheckError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('خطأ في التحقق من المستخدم:', userCheckError);
      throw new Error('فشل في التحقق من بيانات المستخدم');
    }

    // إذا لم يكن المستخدم موجوداً، أضفه إلى جدول users
    if (!existingUser) {
      console.log('إضافة المستخدم إلى جدول users...');
      const { error: insertUserError } = await supabase
        .from('users')
        .insert([{
          id: userId,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'مستخدم',
          email: user.email
        }]);

      if (insertUserError) {
        console.error('خطأ في إضافة المستخدم:', insertUserError);
        throw new Error('فشل في حفظ بيانات المستخدم');
      }
    }

    // الآن أضف الاشتراك
    const { data, error: updateError } = await supabase
      .from('subscriptions')
      .insert([{
        user_id: userId,
        plan_id: plan.id, // معرف الخطة (monthly, quarterly, yearly)
        plan_name: plan.name, // اسم الخطة
        plan_period: plan.period, // فترة الخطة
        price: plan.price, // سعر الخطة
        transaction_id: transactionId,
        status: 'pending'
      }]);

    if (updateError) throw updateError;

    console.log('✅ تم حفظ الطلب في قاعدة البيانات بنجاح');

    // إرسال بريد إلكتروني للإدارة (لا يؤثر على حفظ الطلب)
    const userData = {
        name: document.getElementById('user-name-field').value,
        email: email,
        id: userId
    };

    const planData = {
        name: plan.name,
        price: plan.price,
        period: plan.period || ''
    };

    try {
        const response = await fetch('/api/send-subscription-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userData,
                planData,
                transactionId
            })
        });

        if (response.ok) {
            console.log('تم إرسال البريد الإلكتروني بنجاح');
            showAlert('تم إرسال طلب الاشتراك والبريد الإلكتروني بنجاح. سيتم مراجعته وتفعيل اشتراكك خلال 24 ساعة.', 'success');
        } else {
            console.warn('فشل في إرسال البريد الإلكتروني');
            showAlert('تم حفظ طلبك بنجاح في قاعدة البيانات، لكن حدث خطأ في إرسال البريد الإلكتروني. سيتم مراجعته يدوياً.', 'warning');
        }
    } catch (emailError) {
        console.error('خطأ في إرسال البريد الإلكتروني:', emailError);
        showAlert('تم حفظ طلبك بنجاح في قاعدة البيانات، لكن حدث خطأ في إرسال البريد الإلكتروني. سيتم مراجعته يدوياً.', 'warning');
    }

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

function setupPaymentMethodListeners() {
  const paymentOptions = document.querySelectorAll('.payment-option');

  // عدم تحديد أي خيار افتراضي - ينتظر المستخدم اختيار طريقة الدفع

  paymentOptions.forEach(option => {
    option.addEventListener('click', () => {
      // إزالة التحديد من جميع الخيارات
      paymentOptions.forEach(opt => opt.classList.remove('active'));

      // إضافة التحديد للخيار المختار
      option.classList.add('active');

      // حفظ طريقة الدفع المختارة
      const selectedMethod = option.getAttribute('data-method');
      localStorage.setItem('selectedPaymentMethod', selectedMethod);

      // عرض خطوات طريقة الدفع المختارة
      showPaymentSteps(selectedMethod);

      console.log('تم اختيار طريقة الدفع:', selectedMethod);
    });
  });
}

function showPaymentSteps(method) {
  // إخفاء جميع خطوات الدفع
  document.querySelectorAll('.payment-steps').forEach(steps => {
    steps.style.display = 'none';
  });

  // إظهار خطوات طريقة الدفع المختارة
  const selectedOption = document.querySelector(`.payment-option[data-method="${method}"]`);
  if (selectedOption) {
    const steps = selectedOption.querySelector('.payment-steps');
    if (steps) {
      steps.style.display = 'block';

      // إضافة انيميشن للظهور التدريجي
      steps.style.opacity = '0';
      steps.style.transform = 'translateY(10px)';

      setTimeout(() => {
        steps.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        steps.style.opacity = '1';
        steps.style.transform = 'translateY(0)';
      }, 50);
    }
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
  if (type === 'warning') icon = 'fa-exclamation-triangle';

  alert.innerHTML = `<i class="fas ${icon}"></i> ${message}`;

  alertContainer.appendChild(alert);

  setTimeout(() => {
    alert.classList.remove('show');
    setTimeout(() => alert.remove(), 500);
  }, 5000);
}
