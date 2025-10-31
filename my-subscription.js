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

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.supabase) {
    console.error('Supabase client is not initialized.');
    showAlert('حدث خطأ فادح في تهيئة التطبيق.', 'danger');
    return;
  }

  const user = await loadUserDataAndSubscription();
  if (user) {
    await loadSubscriptionHistory(user.id);
  }

  // تحديث بيانات المستخدم في الشريط الجانبي
  if (window.populateUserData) {
    await window.populateUserData();
  }

  setupEventListeners();
});

async function loadUserDataAndSubscription() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = 'index.html';
      return null;
    }

    document.getElementById('user-name').textContent = user.user_metadata?.full_name || user.email;
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('user-id').textContent = `ID: ${user.id.slice(-7)}`;

    // Fetch the user's most recent subscription from the database
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_plans:plan_id (
          name,
          name_ar
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Handle case where user has no subscription, which is not an actual error
    if (error && error.code !== 'PGRST116') {
        throw error;
    }

    updateSubscriptionDisplay(subscription);
    return user;

  } catch (error) {
    console.error('Error loading subscription data:', error);
    showAlert('حدث خطأ أثناء تحميل بيانات اشتراكك.', 'danger');
    const loadingContainer = document.getElementById('loading-container');
    const detailsContainer = document.getElementById('subscription-details');
    if(loadingContainer) loadingContainer.style.display = 'none';
    if(detailsContainer) detailsContainer.innerHTML = '<p>لا يمكن عرض تفاصيل الاشتراك حاليًا.</p>';
    return null;
  }
}

function updateSubscriptionDisplay(subscription) {
   const statusContainer = document.getElementById('subscription-status');
   const detailsContainer = document.getElementById('subscription-details');
   const actionsContainer = document.getElementById('subscription-actions');
   const loadingContainer = document.getElementById('loading-container');

   if(loadingContainer) loadingContainer.style.display = 'none';
   if(detailsContainer) detailsContainer.style.display = 'block';

   const statusClasses = { pending: 'status-pending', active: 'status-active', cancelled: 'status-cancelled', expired: 'status-expired' };
   const statusNames = { pending: 'قيد المراجعة', active: 'نشط', cancelled: 'ملغي', expired: 'منتهي الصلاحية' };

   if (subscription) {
     const status = subscription.status;
     statusContainer.innerHTML = `<span class="status-badge ${statusClasses[status] || ''}">${statusNames[status] || status}</span>`;

     const planName = subscription.subscription_plans?.name_ar || subscription.subscription_plans?.name || 'خطة غير معروفة';
     document.getElementById('plan-type').textContent = planName;
    document.getElementById('start-date').textContent = subscription.start_date ? formatDate(subscription.start_date) : '-';
    document.getElementById('end-date').textContent = subscription.end_date ? formatDate(subscription.end_date) : '-';
    document.getElementById('subscription-state').textContent = statusNames[status] || status;

    // حساب الأيام المتبقية
    const daysRemaining = subscription.end_date ? Math.ceil((new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
    console.log('My-Subscription - End date:', subscription.end_date, 'Today:', new Date().toISOString(), 'Days remaining:', daysRemaining);
    const daysRemainingEl = document.getElementById('days-remaining');
    daysRemainingEl.textContent = daysRemaining > 0 ? `${daysRemaining} يوم` : 'انتهى';

    // إضافة فئة حسب عدد الأيام المتبقية
    daysRemainingEl.classList.remove('low-days', 'medium-days', 'high-days');
    if (daysRemaining > 0) {
      if (daysRemaining <= 7) {
        daysRemainingEl.classList.add('low-days');
      } else if (daysRemaining <= 30) {
        daysRemainingEl.classList.add('medium-days');
      } else {
        daysRemainingEl.classList.add('high-days');
      }
    }

    // تحديث الشريط الجانبي بالقيمة نفسها
    const sidebarDaysLeftEl = document.getElementById('days-left');
    if (sidebarDaysLeftEl) {
        if (daysRemaining > 0) {
            sidebarDaysLeftEl.textContent = daysRemaining.toString();
        } else {
            sidebarDaysLeftEl.textContent = 'انتهى';
        }
    }

    if (status === 'pending') {
      actionsContainer.innerHTML = `<div class="action-info"><i class="fas fa-clock"></i><p>طلبك قيد المراجعة. سيتم تفعيل اشتراكك خلال 24 ساعة.</p></div>`;
    } else if (status === 'active') {
      const daysLeft = subscription.end_date ? Math.ceil((new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
      console.log('My-Subscription Actions - End date:', subscription.end_date, 'Today:', new Date().toISOString(), 'Days left:', daysLeft);
      if (daysLeft <= 7 && daysLeft > 0) {
        actionsContainer.innerHTML = `
          <div class="action-warning"><i class="fas fa-exclamation-triangle"></i><p>تنبيه: اشتراكك ينتهي خلال ${daysLeft} أيام. يرجى تجديد الاشتراك لتجنب انقطاع الخدمة.</p></div>
          <button id="renew-btn" class="btn-primary"><i class="fas fa-sync-alt"></i> تجديد الاشتراك</button>`;
        document.getElementById('renew-btn').addEventListener('click', showRenewModal);
      } else if (daysLeft <= 0) {
        actionsContainer.innerHTML = `<div class="action-info"><i class="fas fa-info-circle"></i><p>انتهى اشتراكك. جدد الآن للاستمرار.</p></div><button id="subscribe-now-btn" class="btn-primary"><i class="fas fa-rocket"></i> اشترك الآن</button>`;
        document.getElementById('subscribe-now-btn').addEventListener('click', () => { window.location.href = 'subscriptions.html'; });
      } else {
        actionsContainer.innerHTML = `<div class="action-info"><i class="fas fa-check-circle"></i><p>اشتراكك نشط ومستمر.</p></div>`;
      }
    } else { // Expired, cancelled, or other statuses
      actionsContainer.innerHTML = `<button id="subscribe-now-btn" class="btn-primary"><i class="fas fa-rocket"></i> اشترك الآن</button>`;
      document.getElementById('subscribe-now-btn').addEventListener('click', () => { window.location.href = 'subscriptions.html'; });
    }
  } else {
    statusContainer.innerHTML = `<span class="status-badge status-expired">لا يوجد اشتراك</span>`;
    detailsContainer.innerHTML = `<div class="no-subscription"><i class="fas fa-info-circle"></i><p>أنت غير مشترك حاليًا في أي باقة.</p></div>`;
    actionsContainer.innerHTML = `<button id="subscribe-now-btn" class="btn-primary"><i class="fas fa-rocket"></i> اشترك الآن</button>`;
    document.getElementById('subscribe-now-btn').addEventListener('click', () => { window.location.href = 'subscriptions.html'; });
  }
}

async function loadSubscriptionHistory(userId) {
   try {
     const { data: history, error } = await supabase
        .from('subscriptions')
        .select(`
            *,
            subscription_plans:plan_id (
                name,
                name_ar
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;

     const tbody = document.querySelector('#history-table tbody');
     const noHistory = document.getElementById('no-history');
     tbody.innerHTML = '';

     if (history && history.length > 0) {
       const statusNames = { pending: 'قيد المراجعة', active: 'نشط', cancelled: 'ملغي', expired: 'منتهي الصلاحية' };
       history.forEach(sub => {
         const planName = sub.subscription_plans?.name_ar || sub.subscription_plans?.name || 'خطة غير معروفة';
         const statusText = statusNames[sub.status] || sub.status;
         const row = tbody.insertRow();
         row.innerHTML = `<td>${planName}</td><td>${sub.start_date ? formatDate(sub.start_date) : '-'}</td><td>${sub.end_date ? formatDate(sub.end_date) : '-'}</td><td><span class="status-badge status-${sub.status}"></span></td>`;
       });
       noHistory.style.display = 'none';
       tbody.parentElement.style.display = 'table';
     } else {
       noHistory.style.display = 'block';
       tbody.parentElement.style.display = 'none';
     }
   } catch (error) {
     console.error('Error loading subscription history:', error);
     showAlert('حدث خطأ في تحميل سجل الاشتراكات.', 'danger');
   }
}

function setupEventListeners() {
  const modal = document.getElementById('renew-modal');
  if (modal) {
    modal.querySelector('.close-modal').addEventListener('click', () => modal.style.display = 'none');
    document.getElementById('cancel-renew-btn').addEventListener('click', () => modal.style.display = 'none');
  }
}

async function showRenewModal() {
   const modal = document.getElementById('renew-modal');
   const plansContainer = document.getElementById('renew-plans-container');
   plansContainer.innerHTML = '<div class="loading-container"><p>جاري تحميل الخطط...</p></div>';
   modal.style.display = 'flex';

   try {
     const { data: plans, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

    if (error) throw error;

     const durationMap = {
        1: 'monthly',
        3: 'quarterly',
        12: 'yearly'
     };

     plansContainer.innerHTML = ''; 
     plans.forEach(plan => {
       const planIdentifier = durationMap[plan.duration_months];
       if (!planIdentifier) return; 

       const planElement = document.createElement('div');
       planElement.className = 'renew-plan';
       const features = plan.description || 'وصول كامل للمنصة.';
       planElement.innerHTML = `<h3>${plan.name_ar || plan.name}</h3><div class="plan-price">${plan.price} ج.م</div><div class="plan-offer">${features}</div>`;
       planElement.addEventListener('click', () => {
         localStorage.setItem('selectedPlanId', planIdentifier);
         window.location.href = 'payment.html';
       });
       plansContainer.appendChild(planElement);
     });
   } catch (error) {
     console.error('Error loading renewal plans:', error);
     plansContainer.innerHTML = '<p>حدث خطأ أثناء تحميل الخطط. يرجى المحاولة مرة أخرى.</p>';
   }
}

function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
}

function showAlert(message, type = 'info') {
  const container = document.getElementById('alert-container');
  if (!container) return;
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} show`;
  alert.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
  container.appendChild(alert);
  setTimeout(() => {
    alert.classList.remove('show');
    setTimeout(() => alert.remove(), 500);
  }, 5000);
}
