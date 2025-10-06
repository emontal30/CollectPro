document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Supabase Client Check
  if (!window.supabase) {
    console.error('Supabase client is not initialized.');
    showAlert('حدث خطأ فادح في تهيئة التطبيق.', 'danger');
    return;
  }

  // 2. Load User and Subscription Data
  const user = await loadUserDataAndSubscription();
  if (user) {
    await loadSubscriptionHistory(user.id);
  }

  // 3. Setup Event Listeners
  setupEventListeners();
});

// Fetches user data and their latest subscription status
async function loadUserDataAndSubscription() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = 'index.html';
      return null;
    }

    // Populate user-specific elements in the UI
    document.getElementById('user-name').textContent = user.user_metadata?.full_name || user.email;
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('user-id').textContent = `ID: ${user.id.substring(0, 8)}...`;
    if (user.user_metadata?.full_name) {
        document.getElementById('user-initial').textContent = user.user_metadata.full_name.charAt(0).toUpperCase();
    }

    // Fetch the most recent subscription for the user
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('start_date, end_date, status, plan_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'pending', 'expired']) // Relevant statuses
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Handle potential error where no subscription is found (which is not a critical error)
    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    updateSubscriptionDisplay(subscription);
    return user;

  } catch (error) {
    console.error('Error loading subscription data:', error);
    showAlert('حدث خطأ أثناء تحميل بيانات اشتراكك.', 'danger');
    hideLoading();
    return null;
  }
}

// Updates the UI based on the user's subscription status
function updateSubscriptionDisplay(subscription) {
  const statusContainer = document.getElementById('subscription-status');
  const detailsContainer = document.getElementById('subscription-details');
  const actionsContainer = document.getElementById('subscription-actions');
  
  hideLoading();

  const statusClasses = { pending: 'status-pending', active: 'status-active', expired: 'status-expired' };
  const statusNames = { pending: 'قيد المراجعة', active: 'نشط', expired: 'منتهي الصلاحية' };

  if (subscription) {
    const status = subscription.status;
    statusContainer.innerHTML = `<span class="status-badge ${statusClasses[status] || ''}">${statusNames[status] || status}</span>`;
    document.getElementById('start-date').textContent = subscription.start_date ? formatDate(subscription.start_date) : '-';
    document.getElementById('end-date').textContent = subscription.end_date ? formatDate(subscription.end_date) : '-';
    document.getElementById('subscription-state').textContent = statusNames[status] || status;

    if (status === 'pending') {
      actionsContainer.innerHTML = `<div class="action-info"><i class="fas fa-clock"></i><p>طلبك قيد المراجعة. سيتم تفعيل اشتراكك قريبًا.</p></div>`;
    } else if (status === 'active') {
      const daysLeft = subscription.end_date ? Math.ceil((new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0;
      if (daysLeft <= 7) {
        // Offer renewal if nearing expiry
        actionsContainer.innerHTML = `
          <div class="action-warning"><i class="fas fa-exclamation-triangle"></i><p>اشتراكك ينتهي خلال ${daysLeft} أيام.</p></div>
          <button id="renew-btn" class="btn-primary"><i class="fas fa-sync-alt"></i> تجديد الاشتراك</button>`;
        document.getElementById('renew-btn').addEventListener('click', showRenewModal);
      } else {
        actionsContainer.innerHTML = `<div class="action-info"><i class="fas fa-check-circle"></i><p>اشتراكك نشط ومستمر.</p></div>`;
      }
    } else { // Expired or other statuses
      actionsContainer.innerHTML = `<button id="subscribe-now-btn" class="btn-primary"><i class="fas fa-rocket"></i> اشترك الآن</button>`;
      document.getElementById('subscribe-now-btn').addEventListener('click', () => { window.location.href = 'subscriptions.html'; });
    }
  } else {
    // UI for users with no subscription history
    statusContainer.innerHTML = `<span class="status-badge status-expired">لا يوجد اشتراك</span>`;
    detailsContainer.innerHTML = `<div class="no-subscription"><i class="fas fa-info-circle"></i><p>أنت غير مشترك حاليًا في أي باقة.</p></div>`;
    actionsContainer.innerHTML = `<button id="subscribe-now-btn" class="btn-primary"><i class="fas fa-rocket"></i> اشترك الآن</button>`;
    document.getElementById('subscribe-now-btn').addEventListener('click', () => { window.location.href = 'subscriptions.html'; });
  }
}

// Fetches and displays the user's subscription history
async function loadSubscriptionHistory(userId) {
  try {
    const { data: history, error } = await supabase.from('subscriptions').select('start_date, end_date, status').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;

    const tbody = document.querySelector('#history-table tbody');
    const noHistory = document.getElementById('no-history');
    tbody.innerHTML = ''; // Clear previous entries

    if (history.length > 0) {
      history.forEach(sub => {
        const row = tbody.insertRow();
        row.innerHTML = `<td>${sub.start_date ? formatDate(sub.start_date) : '-'}</td><td>${sub.end_date ? formatDate(sub.end_date) : '-'}</td><td><span class="status-badge status-${sub.status}">${sub.status}</span></td>`;
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

// Sets up event listeners for modal windows
function setupEventListeners() {
  const modal = document.getElementById('renew-modal');
  modal.querySelector('.close-modal').addEventListener('click', () => modal.style.display = 'none');
  document.getElementById('cancel-renew-btn').addEventListener('click', () => modal.style.display = 'none');
}

// Displays the renewal modal with available plans
async function showRenewModal() {
  const modal = document.getElementById('renew-modal');
  const plansContainer = document.getElementById('renew-plans-container');
  plansContainer.innerHTML = '<div class="loading-container"><p>جاري تحميل الخطط...</p></div>';
  modal.style.display = 'flex';

  try {
    const { data: plans, error } = await supabase.from('payments').select('*').eq('active', true);
    if (error) throw error;

    plansContainer.innerHTML = ''; // Clear loading indicator
    plans.forEach(plan => {
      const planElement = document.createElement('div');
      planElement.className = 'renew-plan';
      planElement.innerHTML = `<h3>${plan.name}</h3><div class="plan-price">${plan.price} ج.م</div>${plan.features ? `<div class="plan-offer">${plan.features}</div>` : ''}`;
      planElement.addEventListener('click', () => {
        localStorage.setItem('selectedPlanId', plan.plan_id);
        window.location.href = 'payment.html';
      });
      plansContainer.appendChild(planElement);
    });
  } catch (error) {
    console.error('Error loading renewal plans:', error);
    plansContainer.innerHTML = '<p>حدث خطأ أثناء تحميل الخطط. يرجى المحاولة مرة أخرى.</p>';
  }
}

// Utility function to hide the main loading indicator
function hideLoading() {
  const loadingContainer = document.getElementById('loading-container');
  if (loadingContainer) loadingContainer.style.display = 'none';
  const detailsContainer = document.getElementById('subscription-details');
  if (detailsContainer) detailsContainer.style.display = 'block';
}

// Formats a date string into a more readable format
function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Shows a temporary alert message to the user
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
