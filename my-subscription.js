// إعداد Supabase
console.log('بدء تحميل my-subscription.js');

const supabaseUrl = 'https://altnvsolaqphpndyztup.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdG52c29sYXFwaHBuZHl6dHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjI2ODUsImV4cCI6MjA3MzYzODY4NX0.LOvdanWvNL1DaScTDTyXSAbi_4KX_jnJFB1WEdtb-GI';

if (!supabaseUrl || !supabaseKey) {
  console.error('خطأ: متغيرات البيئة مفقودة في my-subscription.js');
}

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
console.log('تم إنشاء Supabase client في my-subscription.js');

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
      
      localStorage.setItem('selectedPlan', planType);
      localStorage.setItem('selectedPrice', price);
      
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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    const subscriptionDetails = document.getElementById('subscription-details');
    const subscriptionActions = document.getElementById('subscription-actions');
    const subscriptionStatus = document.getElementById('subscription-status');
    
    if (subscription) {
      const planNames = {
        'monthly': 'شهري',
        '3-months': '3 شهور',
        'yearly': 'سنوي'
      };
      
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
      
      document.getElementById('plan-type').textContent = planNames[subscription.plan] || subscription.plan;
      document.getElementById('start-date').textContent = subscription.start_date ? formatDate(subscription.start_date) : '-';
      document.getElementById('end-date').textContent = subscription.end_date ? formatDate(subscription.end_date) : '-';
      document.getElementById('subscription-state').textContent = statusNames[subscription.status] || subscription.status;
      
      subscriptionStatus.innerHTML = `<span class="status-badge ${statusClasses[subscription.status] || ''}">${statusNames[subscription.status] || subscription.status}</span>`;
      
      subscriptionActions.innerHTML = '';
      
      if (subscription.status === 'pending') {
        subscriptionActions.innerHTML = `
          <div class="action-info">
            <i class="fas fa-clock"></i>
            <p>طلبك قيد المراجعة، سيتم تفعيل اشتراكك قريبًا</p>
          </div>
        `;
      } else if (subscription.status === 'active') {
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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return;
    }
    
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    const tbody = document.querySelector('#history-table tbody');
    tbody.innerHTML = '';
    
    if (subscriptions && subscriptions.length > 0) {
      subscriptions.forEach(subscription => {
        const row = document.createElement('tr');
        
        const planNames = {
          'monthly': 'شهري',
          '3-months': '3 شهور',
          'yearly': 'سنوي'
        };
        
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
      
      document.getElementById('history-table').style.display = 'table';
      document.getElementById('no-history').style.display = 'none';
    } else {
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

function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('alert-container');
  if (!alertContainer) return;
  
  alertContainer.innerHTML = '';
  
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  
  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-check-circle';
  if (type === 'danger') icon = 'fa-exclamation-circle';
  
  alert.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
  
  alertContainer.appendChild(alert);
  
  setTimeout(() => {
    alert.style.opacity = '0';
    setTimeout(() => alert.remove(), 300);
  }, 5000);
}