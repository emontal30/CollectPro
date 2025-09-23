// إعداد Supabase
const supabaseUrl = 'https://altnvsolaqphpndyztup.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdG52c29sYXFwaHBuZHl6dHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjI2ODUsImV4cCI6MjA3MzYzODY4NX0.LOvdanWvNL1DaScTDTyXSAbi_4KX_jnJFB1WEdtb-GI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', async () => {
  // تطبيق الوضع الليلي
  applyDarkModeFromStorage();
  
  // إعداد مستمعي الأحداث
  setupEventListeners();
  
  // تحميل بيانات الاشتراك
  await loadSubscriptionData();
  await loadSubscriptionHistory();
});

function setupEventListeners() {
  // زر تجديد الاشتراك
  const renewBtn = document.getElementById('renew-btn');
  if (renewBtn) {
    renewBtn.addEventListener('click', () => {
      document.getElementById('renew-modal').style.display = 'flex';
    });
  }
  
  // أزرار اختيار خطة التجديد
  document.querySelectorAll('.renew-plan').forEach(plan => {
    plan.addEventListener('click', () => {
      const planType = plan.getAttribute('data-plan');
      const price = plan.getAttribute('data-price');
      
      // حفظ الخطة المختارة في التخزين المحلي
      localStorage.setItem('selectedPlan', planType);
      localStorage.setItem('selectedPrice', price);
      
      // التوجه لصفحة الدفع
      window.location.href = 'payment.html';
    });
  });
  
  // زر إلغاء التجديد
  const cancelRenewBtn = document.getElementById('cancel-renew-btn');
  if (cancelRenewBtn) {
    cancelRenewBtn.addEventListener('click', () => {
      document.getElementById('renew-modal').style.display = 'none';
    });
  }
  
  // أزرار الإغلاق للنوافذ المنبثقة
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) {
        modal.style.display = 'none';
      }
    });
  });
  
  // زر الوضع الليلي
  const toggleDarkBtn = document.getElementById('toggleDark');
  if (toggleDarkBtn) {
    toggleDarkBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      localStorage.setItem('darkMode', document.body.classList.contains('dark') ? 'on' : 'off');
    });
  }
}

async function loadSubscriptionData() {
  try {
    // الحصول على بيانات المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // إذا لم يكن المستخدم مسجلاً، السماح بالوصول وإظهار رسالة
      showNotLoggedInMessage();
      return;
    }
    
    // الحصول على بيانات الاشتراك النشط للمستخدم
    const { data: subscription, error } = await supabase
      .from('Subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
      throw error;
    }
    
    const subscriptionDetails = document.getElementById('subscription-details');
    const subscriptionActions = document.getElementById('subscription-actions');
    const subscriptionStatus = document.getElementById('subscription-status');
    
    if (subscription) {
      // تحويل نوع الخطة إلى الاسم المعروض
      const planNames = {
        'monthly': 'شهري',
        '3-months': '3 شهور',
        'yearly': 'سنوي'
      };
      
      // تحويل الحالة إلى الاسم المعروض
      const statusClasses = {
        'pending': 'status-pending',
        'active': 'status-active',
        'cancelled': 'status-cancelled',
        'expired': 'status-expired'
      };
      
      const statusNames = {
        'pending': 'قيد المراجعة',
        'active': 'نشط',
        'cancelled': 'ملغي',
        'expired': 'منتهي'
      };
      
      // تعبئة بيانات الاشتراك
      document.getElementById('plan-type').textContent = planNames[subscription.plan] || subscription.plan;
      document.getElementById('start-date').textContent = subscription.start_date ? formatDate(subscription.start_date) : '-';
      document.getElementById('end-date').textContent = subscription.end_date ? formatDate(subscription.end_date) : '-';
      document.getElementById('subscription-state').textContent = statusNames[subscription.status] || subscription.status;
      
      // تعبئة حالة الاشتراك
      subscriptionStatus.innerHTML = `<span class="status-badge ${statusClasses[subscription.status] || ''}">${statusNames[subscription.status] || subscription.status}</span>`;
      
      // تحديث بيانات الاشتراك في السايدبار
      if (window.Sidebar && typeof window.Sidebar.setSubscription === 'function') {
        window.Sidebar.setSubscription(subscription.plan, subscription.end_date ? formatDate(subscription.end_date) : '-');
      }
      
      // تعبئة أزرار الإجراءات بناءً على حالة الاشتراك
      subscriptionActions.innerHTML = '';
      
      if (subscription.status === 'pending') {
        subscriptionActions.innerHTML = `
          <div class="action-info">
            <i class="fas fa-clock"></i>
            <p>طلبك قيد المراجعة، سيتم تفعيل اشتراكك قريبًا</p>
          </div>
        `;
      } else if (subscription.status === 'active') {
        // التحقق من قرب انتهاء الاشتراك
        const endDate = new Date(subscription.end_date);
        const today = new Date();
        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysLeft <= 7) {
          subscriptionActions.innerHTML = `
            <div class="action-warning">
              <i class="fas fa-exclamation-triangle"></i>
              <p>سيتم انتهاء اشتراكك خلال ${daysLeft} يوم</p>
            </div>
            <button id="renew-btn" class="btn-primary">
              <i class="fas fa-sync-alt"></i>
              تجديد الاشتراك
            </button>
          `;
          
          // إضافة مستمع حدث لزر التجديد
          document.getElementById('renew-btn').addEventListener('click', () => {
            document.getElementById('renew-modal').style.display = 'flex';
          });
        } else {
          subscriptionActions.innerHTML = `
            <div class="action-info">
              <i class="fas fa-check-circle"></i>
              <p>اشتراكك نشط حتى ${formatDate(subscription.end_date)}</p>
            </div>
          `;
        }
      }
    } else {
      // لا يوجد اشتراك نشط
      subscriptionDetails.innerHTML = `
        <div class="no-subscription">
          <i class="fas fa-times-circle"></i>
          <p>لا يوجد اشتراك نشط</p>
        </div>
      `;
      
      subscriptionStatus.innerHTML = `<span class="status-badge status-expired">منتهي</span>`;
      
      subscriptionActions.innerHTML = `
        <button id="subscribe-btn" class="btn-primary">
          <i class="fas fa-plus"></i>
          اشترك الآن
        </button>
      `;
      
      // إضافة مستمع حدث لزر الاشتراك
      document.getElementById('subscribe-btn').addEventListener('click', () => {
        window.location.href = 'subscriptions.html';
      });
    }
  } catch (error) {
    console.error('Error loading subscription data:', error);
    showAlert('حدث خطأ أثناء تحميل بيانات الاشتراك', 'danger');
  }
}

async function loadSubscriptionHistory() {
  try {
    // الحصول على بيانات المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // إذا لم يكن مسجلاً، إخفاء الجدول وإظهار رسالة
      document.getElementById('history-table').style.display = 'none';
      document.getElementById('no-history').innerHTML = `
        <i class="fas fa-user-lock"></i>
        <p>يرجى تسجيل الدخول لرؤية سجل اشتراكاتك</p>
      `;
      document.getElementById('no-history').style.display = 'block';
      return;
    }
    
    // الحصول على سجل اشتراكات المستخدم
    const { data: subscriptions, error } = await supabase
      .from('Subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    const tbody = document.querySelector('#history-table tbody');
    tbody.innerHTML = '';
    
    if (subscriptions && subscriptions.length > 0) {
      subscriptions.forEach(subscription => {
        const row = document.createElement('tr');
        
        // تحويل نوع الخطة إلى الاسم المعروض
        const planNames = {
          'monthly': 'شهري',
          '3-months': '3 شهور',
          'yearly': 'سنوي'
        };
        
        // تحويل الحالة إلى الاسم المعروض
        const statusClasses = {
          'pending': 'status-pending',
          'active': 'status-active',
          'cancelled': 'status-cancelled',
          'expired': 'status-expired'
        };
        
        const statusNames = {
          'pending': 'قيد المراجعة',
          'active': 'نشط',
          'cancelled': 'ملغي',
          'expired': 'منتهي'
        };
        
        row.innerHTML = `
          <td>${planNames[subscription.plan] || subscription.plan}</td>
          <td>${subscription.start_date ? formatDate(subscription.start_date) : '-'}</td>
          <td>${subscription.end_date ? formatDate(subscription.end_date) : '-'}</td>
          <td><span class="status-badge ${statusClasses[subscription.status] || ''}">${statusNames[subscription.status] || subscription.status}</span></td>
        `;
        
        tbody.appendChild(row);
      });
      
      // إظهار الجدول وإخفاء رسالة عدم وجود بيانات
      document.getElementById('history-table').style.display = 'table';
      document.getElementById('no-history').style.display = 'none';
    } else {
      // إخفاء الجدول وإظهار رسالة عدم وجود بيانات
      document.getElementById('history-table').style.display = 'none';
      document.getElementById('no-history').style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading subscription history:', error);
    showAlert('حدث خطأ أثناء تحميل سجل الاشتراكات', 'danger');
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function showNotLoggedInMessage() {
  const subscriptionDetails = document.getElementById('subscription-details');
  const subscriptionActions = document.getElementById('subscription-actions');
  const subscriptionStatus = document.getElementById('subscription-status');

  // إظهار رسالة لتسجيل الدخول
  subscriptionDetails.innerHTML = `
    <div class="no-subscription">
      <i class="fas fa-user-lock"></i>
      <p>يرجى تسجيل الدخول لرؤية بيانات اشتراكك</p>
    </div>
  `;

  subscriptionStatus.innerHTML = `<span class="status-badge status-expired">غير مسجل</span>`;

  subscriptionActions.innerHTML = `
    <button onclick="window.location.href='login.html'" class="btn-primary">
      <i class="fas fa-sign-in-alt"></i>
      تسجيل الدخول
    </button>
  `;
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