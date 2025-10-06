
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.supabase) {
    console.error('Supabase client is not initialized.');
    showAlert('خطأ فادح: لم يتم تهيئة Supabase!', 'danger');
    return;
  }

  // Step 1: Check for admin access before doing anything else.
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    showAlert('وصول مرفوض. هذه الصفحة مخصصة للمسؤولين فقط.', 'danger');
    // Redirect to a non-admin page after a short delay.
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 3000);
    return; 
  }

  // Step 2: Load essential data (plan details) dynamically.
  const planDetails = await loadPlanDetails();
  if (!planDetails) {
    showAlert('فشل تحميل بيانات الخطط الأساسية. لا يمكن متابعة.', 'danger');
    return;
  }

  // Step 3: Load all dashboard components in parallel for speed.
  await Promise.all([
    loadDashboardStats(planDetails),
    loadPendingSubscriptions(planDetails),
    loadAllSubscriptions(planDetails)
  ]);

  // Step 4: Attach all event listeners.
  setupEventListeners(planDetails);
});

// --- CORE FUNCTIONS ---

async function checkAdminAccess() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = 'index.html';
      return false;
    }

    // Check for admin role in the 'profiles' table.
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || !data || data.role !== 'admin') {
      console.warn('Access Denied: User is not an admin.');
      return false;
    }
    
    console.log('Access Granted: User is an admin.');
    return true;

  } catch (error) {
    console.error('Error during admin access check:', error);
    return false;
  }
}

async function loadPlanDetails() {
  try {
    const { data: plans, error } = await supabase.from('payments').select('plan_id, name, price, metadata');
    if (error) throw error;

    // Create a lookup map for easy access.
    const planMap = plans.reduce((acc, plan) => {
      acc[plan.plan_id] = {
        name: plan.name,
        price: plan.price,
        durationMonths: plan.metadata?.durationMonths || 1 // Default to 1 month
      };
      return acc;
    }, {});

    return planMap;
  } catch (error) {
    console.error('Error loading plan details:', error);
    return null;
  }
}

// --- DATA LOADING AND RENDERING ---

async function loadDashboardStats(planDetails) {
  try {
    const { count: totalUsers } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
    const { count: pendingRequests } = await supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    const { data: activeSubs, count: activeCount } = await supabase.from('subscriptions').select('plan_id', { count: 'exact' }).eq('status', 'active');

    let totalRevenue = 0;
    if (activeSubs) {
      totalRevenue = activeSubs.reduce((sum, sub) => {
        const plan = planDetails[sub.plan_id];
        return sum + (plan ? plan.price : 0);
      }, 0);
    }

    document.getElementById('total-users').textContent = totalUsers || 0;
    document.getElementById('pending-requests').textContent = pendingRequests || 0;
    document.getElementById('active-subscriptions').textContent = activeCount || 0;
    document.getElementById('total-revenue').textContent = `${totalRevenue} ج.م`;
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    showAlert('فشل تحميل إحصائيات لوحة التحكم.', 'danger');
  }
}

async function loadPendingSubscriptions(planDetails) {
  // Similar logic, but for pending subscriptions
  const { data, error } = await supabase
      .from('subscriptions')
      .select('id, user_id, email, transaction_id, created_at, plan_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
  renderTable('pending-subscriptions-table', data, error, 'لا توجد طلبات قيد المراجعة حاليًا.', true, planDetails);
}

async function loadAllSubscriptions(planDetails) {
    // Similar logic, for all subscriptions with filtering
    const statusFilter = document.getElementById('status-filter').value;
    let query = supabase.from('subscriptions').select('id, user_id, email, transaction_id, start_date, end_date, status, plan_id').order('created_at', { ascending: false });
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    const { data, error } = await query;
    renderTable('all-subscriptions-table', data, error, 'لا توجد اشتراكات لعرضها حسب الفلتر المختار.', false, planDetails);

}

function renderTable(tableId, data, error, noDataMessage, isPendingTable, planDetails) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  const table = tbody.parentElement;
  const noDataEl = document.getElementById(tableId === 'pending-subscriptions-table' ? 'no-pending-requests' : 'no-subscriptions');
  tbody.innerHTML = '';

  if (error) {
    console.error(`Error loading data for ${tableId}:`, error);
    showAlert(`فشل تحميل البيانات للجدول: ${tableId}`, 'danger');
    noDataEl.style.display = 'block';
    table.style.display = 'none';
    return;
  }

  if (data && data.length > 0) {
    data.forEach(sub => {
      const row = tbody.insertRow();
      row.dataset.id = sub.id;
      row.innerHTML = createRowHtml(sub, isPendingTable, planDetails);
    });
    noDataEl.style.display = 'none';
    table.style.display = 'table';
  } else {
    noDataEl.querySelector('p').textContent = noDataMessage;
    noDataEl.style.display = 'block';
    table.style.display = 'none';
  }
}

function createRowHtml(sub, isPending, planDetails) {
    const planName = planDetails[sub.plan_id]?.name || 'غير محدد';
    const statusBadge = `<span class="status-badge status-${sub.status || 'default'}">${sub.status || 'غير معروف'}</span>`;
    const actions = isPending ?
        `<button class="action-btn approve" title="تفعيل"><i class="fas fa-check"></i></button>
         <button class="action-btn reject" title="رفض"><i class="fas fa-times"></i></button>` :
        '';

    let rowContent = `
        <td>${sub.user_id.substring(0, 12)}...</td>
        <td>${sub.email}</td>
        <td>${planName}</td>
        <td>${sub.transaction_id || '-'}</td>
        ${isPending ? `<td>${formatDate(sub.created_at)}</td>` : `<td>${formatDate(sub.start_date)}</td><td>${formatDate(sub.end_date)}</td><td>${statusBadge}</td>`}
        <td class="actions-cell">
            ${actions}
            <button class="action-btn details" title="تفاصيل"><i class="fas fa-info-circle"></i></button>
        </td>
    `;
    if (isPending) {
        rowContent = `<td><input type="checkbox" class="subscription-checkbox" data-id="${sub.id}" /></td>` + rowContent;
    }
    return rowContent;
}

// --- EVENT LISTENERS AND HANDLERS ---

function setupEventListeners(planDetails) {
  // Table-specific clicks
  document.querySelector('#pending-subscriptions-table tbody').addEventListener('click', (e) => handleTableClick(e, planDetails));
  document.querySelector('#all-subscriptions-table tbody').addEventListener('click', (e) => handleTableClick(e, planDetails));

  // Header/Filter buttons
  document.getElementById('refresh-btn').addEventListener('click', () => refreshAllData(planDetails));
  document.getElementById('status-filter').addEventListener('change', () => loadAllSubscriptions(planDetails));
  
  // Bulk actions
  document.getElementById('select-all').addEventListener('change', (e) => {
    document.querySelectorAll('#pending-subscriptions-table .subscription-checkbox').forEach(cb => cb.checked = e.target.checked);
  });
  document.getElementById('activate-all-btn').addEventListener('click', () => handleBulkAction('activate', planDetails));
  document.getElementById('cancel-all-btn').addEventListener('click', () => handleBulkAction('cancel', planDetails));
}

async function handleTableClick(event, planDetails) {
    const target = event.target.closest('.action-btn');
    if (!target) return;

    const subscriptionId = target.closest('tr').dataset.id;

    if (target.classList.contains('approve')) {
        if (confirm('هل أنت متأكد من تفعيل هذا الاشتراك؟')) {
            await activateSubscription(subscriptionId, planDetails);
        }
    } else if (target.classList.contains('reject')) {
        if (confirm('هل أنت متأكد من رفض هذا الاشتراك؟ سيتم حذفه.')) {
            await cancelSubscription(subscriptionId);
        }
    } else if (target.classList.contains('details')) {
        await showSubscriptionDetails(subscriptionId, planDetails);
    }
}

async function handleBulkAction(actionType, planDetails) {
    const selectedCheckboxes = document.querySelectorAll('#pending-subscriptions-table .subscription-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        showAlert('الرجاء تحديد طلب واحد على الأقل.', 'info');
        return;
    }

    const confirmMessage = actionType === 'activate'
        ? `هل أنت متأكد من تفعيل ${selectedCheckboxes.length} اشتراكًا محددًا؟`
        : `هل أنت متأكد من رفض ${selectedCheckboxes.length} اشتراكًا محددًا؟`;

    if (!confirm(confirmMessage)) return;

    const ids = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);
    const actionPromise = actionType === 'activate'
        ? ids.map(id => activateSubscription(id, planDetails))
        : ids.map(id => cancelSubscription(id));

    showAlert(`جاري ${actionType === 'activate' ? 'تفعيل' : 'رفض'} ${ids.length} طلبات...`, 'info');
    
    await Promise.all(actionPromise);
    
    await refreshAllData(planDetails);
    showAlert(`تمت معالجة الطلبات المحددة بنجاح!`, 'success');
}

// --- ACTION FUNCTIONS (Single & Bulk) ---

async function activateSubscription(subscriptionId, planDetails) {
  try {
    const { data: sub, error: fetchError } = await supabase
      .from('subscriptions').select('plan_id').eq('id', subscriptionId).single();
    if (fetchError) throw fetchError;

    const plan = planDetails[sub.plan_id];
    if (!plan) throw new Error(`تفاصيل الخطة غير موجودة لـ plan_id: ${sub.plan_id}`);

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + plan.durationMonths);

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ status: 'active', start_date: startDate.toISOString(), end_date: endDate.toISOString() })
      .eq('id', subscriptionId);

    if (updateError) throw updateError;
    console.log(`Subscription ${subscriptionId} activated.`);
  } catch (error) {
    console.error(`Error activating subscription ${subscriptionId}:`, error);
    showAlert(`فشل تفعيل الاشتراك ${subscriptionId}: ${error.message}`, 'danger');
  }
}

async function cancelSubscription(subscriptionId) {
    try {
        const { error } = await supabase.from('subscriptions').delete().eq('id', subscriptionId);
        if (error) throw error;
        console.log(`Subscription ${subscriptionId} cancelled/deleted.`);
    } catch (error) {
        console.error(`Error rejecting subscription ${subscriptionId}:`, error);
        showAlert(`فشل رفض الاشتراك ${subscriptionId}.`, 'danger');
    }
}

async function refreshAllData(planDetails) {
    showAlert('جاري تحديث البيانات...', 'info');
    await Promise.all([
        loadDashboardStats(planDetails),
        loadPendingSubscriptions(planDetails),
        loadAllSubscriptions(planDetails)
    ]);
    showAlert('تم تحديث البيانات بنجاح!', 'success');
}

// --- UTILITY FUNCTIONS ---

async function showSubscriptionDetails(subscriptionId, planDetails) {
    // Logic to show modal remains largely the same
     try {
        const { data: sub, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('id', subscriptionId)
            .single();

        if (error) throw error;

        const modal = document.getElementById('subscription-details-modal');
        const planName = planDetails[sub.plan_id]?.name || 'غير محدد';

        document.getElementById('detail-user-id').textContent = sub.user_id;
        document.getElementById('detail-email').textContent = sub.email;
        document.getElementById('detail-plan').textContent = planName;
        document.getElementById('detail-transaction-id').textContent = sub.transaction_id || '-';
        document.getElementById('detail-created-at').textContent = formatDate(sub.created_at);
        document.getElementById('detail-start-date').textContent = formatDate(sub.start_date);
        document.getElementById('detail-end-date').textContent = formatDate(sub.end_date);
        document.getElementById('detail-status').textContent = sub.status;
        
        modal.style.display = 'flex';

        modal.querySelector('.close-modal').onclick = () => modal.style.display = 'none';
        document.getElementById('close-details-btn').onclick = () => modal.style.display = 'none';
        window.onclick = (event) => {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        };

    } catch (error) {
        console.error('Error showing subscription details:', error);
        showAlert('فشل عرض تفاصيل الاشتراك.', 'danger');
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return 'تاريخ غير صالح';
    }
}

function showAlert(message, type = 'info', duration = 4000) {
    const container = document.getElementById('alert-container');
    if (!container) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} show`;
    alert.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    
    container.prepend(alert);

    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 500);
    }, duration);
}
