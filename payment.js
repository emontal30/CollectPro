// إعداد Supabase
const supabaseUrl = 'https://altnvsolaqphpndyztup.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdG52c29sYXFwaHBuZHl6dHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjI2ODUsImV4cCI6MjA3MzYzODY4NX0.LOvdanWvNL1DaScTDTyXSAbi_4KX_jnJFB1WEdtb-GI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', async () => {
  // تطبيق الوضع الليلي
  applyDarkModeFromStorage();
  
  // إعداد مستمعي الأحداث
  setupEventListeners();
  
  // تحميل بيانات المستخدم والخطة المختارة
  await loadUserData();
  await loadSelectedPlan();
});

function setupEventListeners() {
  // نموذج الدفع
  const paymentForm = document.getElementById('payment-form');
  if (paymentForm) {
    paymentForm.addEventListener('submit', handlePaymentSubmit);
  }
  
  // زر الوضع الليلي
  const toggleDarkBtn = document.getElementById('toggleDark');
  if (toggleDarkBtn) {
    toggleDarkBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      localStorage.setItem('darkMode', document.body.classList.contains('dark') ? 'on' : 'off');
    });
  }
}

async function loadUserData() {
  try {
    // الحصول على بيانات المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // تعبئة حقول البريد الإلكتروني ومعرف المستخدم
      document.getElementById('email').value = user.email || '';
      document.getElementById('user-id').value = user.id || '';
    } else {
      // إذا لم يكن المستخدم مسجلاً، توجيهه لصفحة تسجيل الدخول
      window.location.href = 'login.html';
    }
  } catch (error) {
    console.error('Error loading user data:', error);
    showAlert('حدث خطأ أثناء تحميل بيانات المستخدم', 'danger');
  }
}

async function loadSelectedPlan() {
  try {
    // الحصول على الخطة المختارة من التخزين المحلي
    const selectedPlan = localStorage.getItem('selectedPlan');
    const selectedPrice = localStorage.getItem('selectedPrice');
    
    if (selectedPlan && selectedPrice) {
      // تعبئة حقل نوع الاشتراك
      const planNames = {
        'monthly': 'شهري',
        '3-months': '3 شهور',
        'yearly': 'سنوي'
      };
      
      document.getElementById('subscription-type').value = planNames[selectedPlan] || '';
      document.getElementById('selected-plan').textContent = planNames[selectedPlan] || '';
      document.getElementById('plan-price').textContent = `${selectedPrice} ج.م`;
      
      // تحديث ملخص الاشتراك في السايدبار (مبدئيًا بدون تاريخ انتهاء)
      if (window.Sidebar && typeof window.Sidebar.setSubscription === 'function') {
        window.Sidebar.setSubscription(selectedPlan, '-');
      }
    } else {
      // إذا لم تكن هناك خطة مختارة، توجيه المستخدم لصفحة الاشتراكات
      showAlert('لم يتم اختيار خطة اشتراك', 'danger');
      setTimeout(() => {
        window.location.href = 'subscriptions.html';
      }, 2000);
    }
  } catch (error) {
    console.error('Error loading selected plan:', error);
    showAlert('حدث خطأ أثناء تحميل بيانات الخطة', 'danger');
  }
}

async function handlePaymentSubmit(e) {
  e.preventDefault();
  
  // إعادة تعيين رسائل الخطأ
  document.getElementById('transaction-id').classList.remove('error');

  // الحصول على قيم النموذج
  const email = document.getElementById('email').value;
  const userId = document.getElementById('user-id').value;
  const subscriptionType = document.getElementById('subscription-type').value;
  const transactionId = document.getElementById('transaction-id').value.trim();

  // التحقق من صحة البيانات
  if (!transactionId) {
    document.getElementById('transaction-id').classList.add('error');
    showAlert('رقم عملية التحويل مطلوب', 'danger');
    return;
  }
  
  // التحقق من عدم تكرار رقم العملية
  const { data: existingSubscriptions, error: checkError } = await supabase
    .from('Subscriptions')
    .select('*')
    .eq('transaction_id', transactionId);
    
  if (checkError) {
    console.error('Error checking existing subscriptions:', checkError);
    showAlert('حدث خطأ أثناء التحقق من البيانات', 'danger');
    return;
  }
  
  if (existingSubscriptions && existingSubscriptions.length > 0) {
    showAlert('رقم عملية التحويل مسجل بالفعل', 'danger');
    return;
  }
  
  // إظهار حالة التحميل
  const submitBtn = document.querySelector('.submit-btn');
  submitBtn.classList.add('loading');
  
  try {
    // تحويل نوع الاشتراك إلى القيمة المناسبة للقاعدة
    const planMap = {
      'شهري': 'monthly',
      '3 شهور': '3-months',
      'سنوي': 'yearly'
    };
    
    const plan = planMap[subscriptionType] || subscriptionType;
    
    // إدخال بيانات الاشتراك في قاعدة البيانات
    const { data, error } = await supabase
      .from('Subscriptions')
      .insert([
        {
          user_id: userId,
          email: email,
          plan: plan,
          transaction_id: transactionId,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ]);
      
    if (error) {
      throw error;
    }
    
    // إرسال بريد إلكتروني للإدارة
    await sendAdminEmail(email, userId, transactionId, subscriptionType);
    
    // إظهار رسالة نجاح
    showAlert('تم استلام طلبك وسيتم مراجعته قريبًا', 'success');
    
    // مسح البيانات المؤقتة
    localStorage.removeItem('selectedPlan');
    localStorage.removeItem('selectedPrice');
    
    // التوجيه لصفحة اشتراك المستخدم بعد ثانيتين
    setTimeout(() => {
      window.location.href = 'my-subscription.html';
    }, 2000);
    
  } catch (error) {
    console.error('Error submitting payment:', error);
    showAlert('حدث خطأ أثناء إرسال طلب الدفع', 'danger');
  } finally {
    // إخفاء حالة التحميل
    submitBtn.classList.remove('loading');
  }
}

async function sendAdminEmail(email, userId, transactionId, subscriptionType) {
  // في تطبيق حقيقي، سيتم استخدام خدمة إرسال بريد إلكتروني مثل SendGrid أو AWS SES
  // هنا نقوم بمحاكاة إرسال البريد الإلكتروني
  
  console.log('Sending email to admin:');
  console.log('To: emontal.33@gmail.com');
  console.log('Subject: طلب اشتراك جديد');
  console.log('Body:');
  console.log(`User ID: ${userId}`);
  console.log(`Email: ${email}`);
  console.log(`Transaction ID: ${transactionId}`);
  console.log(`Subscription Type: ${subscriptionType}`);
  
  // محاكاة تأخير إرسال البريد الإلكتروني
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // في تطبيق حقيقي، سيتم استخدام الكود التالي:
  /*
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      service_id: 'your_service_id',
      template_id: 'your_template_id',
      user_id: 'your_user_id',
      template_params: {
        to_email: 'emontal.33@gmail.com',
        from_name: 'CollectPro System',
        user_id: userId,
        email: email,
        transaction_id: transactionId,
        subscription_type: subscriptionType
      }
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to send email');
  }
  */
}

function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('alert-container');
  if (!alertContainer) return;
  
  // إزالة التنبيهات الحالية
  alertContainer.innerHTML = '';
  
  // إنشاء تنبيه جديد
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  
  // إضافة الأيقونة المناسبة
  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-check-circle';
  if (type === 'danger') icon = 'fa-exclamation-circle';
  
  alert.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
  
  alertContainer.appendChild(alert);
  
  // إزالة التنبيه تلقائيًا بعد 5 ثوانٍ
  setTimeout(() => {
    alert.style.opacity = '0';
    setTimeout(() => alert.remove(), 300);
  }, 5000);
}