// إعداد Supabase
console.log('بدء تحميل admin.js');

const supabaseUrl = 'https://altnvsolaqphpndyztup.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdG52c29sYXFwaHBuZHl6dHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjI2ODUsImV4cCI6MjA3MzYzODY4NX0.LOvdanWvNL1DaScTDTyXSAbi_4KX_jnJFB1WEdtb-GI';

if (!supabaseUrl || !supabaseKey) {
  console.error('خطأ: متغيرات البيئة مفقودة في admin.js');
}

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
console.log('تم إنشاء Supabase client في admin.js');

document.addEventListener('DOMContentLoaded', async () => {
  // إعداد مستمعي الأحداث
  setupEventListeners();
  
  // التحقق من صلاحيات الإدارة
  await checkAdminAccess();
  
  // تحميل البيانات
  await loadDashboardStats();
  await loadPendingSubscriptions();
  await loadAllSubscriptions();
});

function setupEventListeners() {
  // زر تسجيل الخروج
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  // زر تحديث البيانات
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await loadDashboardStats();
      await loadPendingSubscriptions();
      await loadAllSubscriptions();
      showAlert('تم تحديث البيانات', 'success');
    });
  }
  
  // فلتر الحالة
  const statusFilter = document.getElementById('status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      loadAllSubscriptions();
    });
  }
  
  // زر تفعيل الكل
  const activateAllBtn = document.getElementById('activate-all-btn');
  if (activateAllBtn) {
    activateAllBtn.addEventListener('click', () => {
      if (confirm('هل أنت متأكد من تفعيل جميع الاشتراكات المحددة؟')) {
        activateAllSelectedSubscriptions();
      }
    });
  }
  
  // زر إلغاء الكل
  const cancelAllBtn = document.getElementById('cancel-all-btn');
  if (cancelAllBtn) {
    cancelAllBtn.addEventListener('click', () => {
      if (confirm('هل أنت متأكد من إلغاء جميع الاشتراكات المحددة؟')) {
        cancelAllSelectedSubscriptions();
      }
    });
  }
  
  // زر اختيار الكل
  const selectAllCheckbox = document.getElementById('select-all');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', () => {
      const checkboxes = document.querySelectorAll('.subscription-checkbox');
      checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
      });
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
  
  // زر إغلاق تفاصيل الاشتراك
  const closeDetailsBtn = document.getElementById('close-details-btn');
  if (closeDetailsBtn) {
    closeDetailsBtn.addEventListener('click', () => {
      document.getElementById('subscription-details-modal').style.display = 'none';
    });
  }
}

async function checkAdminAccess() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (error || !data || data.role !== 'admin') {
      window.location.href = 'index.html';
    }
  } catch (error) {
    console.error('Error checking admin access:', error);
    window.location.href = 'index.html';
  }
}

async function loadDashboardStats() {
  try {
    const { count: totalUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
      
    if (usersError) throw usersError;
    
    const { count: pendingRequests, error: pendingError } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
      
    if (pendingError) throw pendingError;
    
    const { count: activeSubscriptions, error: activeError } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
      
    if (activeError) throw activeError;
    
    const { data: subscriptionsData, error: revenueError } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('status', 'active');
      
    if (revenueError) throw revenueError;
    
    let totalRevenue = 0;
    if (subscriptionsData) {
      subscriptionsData.forEach(sub => {
        if (sub.plan === 'monthly') totalRevenue += 30;
        else if (sub.plan === '3-months') totalRevenue += 50;
        else if (sub.plan === 'yearly') totalRevenue += 360;
      });
    }
    
    document.getElementById('total-users').textContent = totalUsers || 0;
    document.getElementById('pending-requests').textContent = pendingRequests || 0;
    document.getElementById('active-subscriptions').textContent = activeSubscriptions || 0;
    document.getElementById('total-revenue').textContent = `${totalRevenue} ج.م`;
    
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    showAlert('حدث خطأ أثناء تحميل إحصائيات لوحة التحكم', 'danger');
  }
}

async function loadPendingSubscriptions() {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    const tbody = document.querySelector('#pending-subscriptions-table tbody');
    tbody.innerHTML = '';
    
    if (data && data.length > 0) {
      data.forEach(subscription => {
        const row = document.createElement('tr');
        
        const planNames = {
          'monthly': 'شهري',
          '3-months': '3 شهور',
          'yearly': 'سنوي'
        };
        
        row.innerHTML = `
          <td>
            <input type="checkbox" class="subscription-checkbox" data-id="${subscription.id}" />
          </td>
          <td>${subscription.user_id}</td>
          <td>${subscription.email}</td>
          <td>${planNames[subscription.plan] || subscription.plan}</td>
          <td>${subscription.transaction_id}</td>
          <td>${formatDate(subscription.created_at)}</td>
          <td>
            <button class="action-btn approve" data-id="${subscription.id}" title="تفعيل">
              <i class="fas fa-check"></i>
            </button>
            <button class="action-btn reject" data-id="${subscription.id}" title="رفض">
              <i class="fas fa-times"></i>
            </button>
            <button class="action-btn details" data-id="${subscription.id}" title="تفاصيل">
              <i class="fas fa-info-circle"></i>
            </button>
          </td>
        `;
        
        tbody.appendChild(row);
      });
      
      document.querySelectorAll('.action-btn.approve').forEach(btn => {
        btn.addEventListener('click', () => {
          if (confirm('هل أنت متأكد من تفعيل هذا الاشتراك؟')) {
            activateSubscription(btn.getAttribute('data-id'));
          }
        });
      });
      
      document.querySelectorAll('.action-btn.reject').forEach(btn => {
        btn.addEventListener('click', () => {
          if (confirm('هل أنت متأكد من رفض هذا الاشتراك؟')) {
            cancelSubscription(btn.getAttribute('data-id'));
          }
        });
      });
      
      document.querySelectorAll('.action-btn.details').forEach(btn => {
        btn.addEventListener('click', () => {
          showSubscriptionDetails(btn.getAttribute('data-id'));
        });
      });
      
      document.getElementById('pending-subscriptions-table').style.display = 'table';
      document.getElementById('no-pending-requests').style.display = 'none';
    } else {
      document.getElementById('pending-subscriptions-table').style.display = 'none';
      document.getElementById('no-pending-requests').style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading pending subscriptions:', error);
    showAlert('حدث خطأ أثناء تحميل طلبات الاشتراك', 'danger');
  }
}

async function loadAllSubscriptions() {
  try {
    const statusFilter = document.getElementById('status-filter').value;
    
    let query = supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const tbody = document.querySelector('#all-subscriptions-table tbody');
    tbody.innerHTML = '';
    
    if (data && data.length > 0) {
      data.forEach(subscription => {
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
          <td>${subscription.user_id}</td>
          <td>${subscription.email}</td>
          <td>${planNames[subscription.plan] || subscription.plan}</td>
          <td>${subscription.transaction_id}</td>
          <td>${subscription.start_date ? formatDate(subscription.start_date) : '-'}</td>
          <td>${subscription.end_date ? formatDate(subscription.end_date) : '-'}</td>
          <td><span class="status-badge ${statusClasses[subscription.status] || ''}">${statusNames[subscription.status] || subscription.status}</span></td>
          <td>
            <button class="action-btn details" data-id="${subscription.id}" title="تفاصيل">
              <i class="fas fa-info-circle"></i>
            </button>
            ${subscription.status === 'pending' ? `
              <button class="action-btn approve" data-id="${subscription.id}" title="تفعيل">
                <i class="fas fa-check"></i>
              </button>
              <button class="action-btn reject" data-id="${subscription.id}" title="رفض">
                <i class="fas fa-times"></i>
              </button>
            ` : ''}
          </td>
        `;
        
        tbody.appendChild(row);
      });
      
      document.querySelectorAll('.action-btn.approve').forEach(btn => {
        btn.addEventListener('click', () => {
          if (confirm('هل أنت متأكد من تفعيل هذا الاشتراك؟')) {
            activateSubscription(btn.getAttribute('data-id'));
          }
        });
      });
      
      document.querySelectorAll('.action-btn.reject').forEach(btn => {
        btn.addEventListener('click', () => {
          if (confirm('هل أنت متأكد من رفض هذا الاشتراك؟')) {
            cancelSubscription(btn.getAttribute('data-id'));
          }
        });
      });
      
      document.querySelectorAll('.action-btn.details').forEach(btn => {
        btn.addEventListener('click', () => {
          showSubscriptionDetails(btn.getAttribute('data-id'));
        });
      });
      
      document.getElementById('all-subscriptions-table').style.display = 'table';
      document.getElementById('no-subscriptions').style.display = 'none';
    } else {
      document.getElementById('all-subscriptions-table').style.display = 'none';
      document.getElementById('no-subscriptions').style.display = 'block';
    }
  } catch (error) {
    console.error('Error loading all subscriptions:', error);
    showAlert('حدث خطأ أثناء تحميل الاشتراكات', 'danger');
  }
}

async function activateSubscription(subscriptionId) {
  try {
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();
      
    if (fetchError) throw fetchError;
    
    const startDate = new Date().toISOString().split('T')[0];
    let endDate = new Date();
    
    if (subscription.plan === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (subscription.plan === '3-months') {
      endDate.setMonth(endDate.getMonth() + 3);
    } else if (subscription.plan === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
      endDate.setMonth(endDate.getMonth() + 1);
    }
    
    const endDateString = endDate.toISOString().split('T')[0];
    
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        start_date: startDate,
        end_date: endDateString
      })
      .eq('id', subscriptionId);
      
    if (updateError) throw updateError;
    
    showAlert('تم تفعيل الاشتراك بنجاح', 'success');
    
    await loadDashboardStats();
    await loadPendingSubscriptions();
    await loadAllSubscriptions();
    
  } catch (error) {
    console.error('Error activating subscription:', error);
    showAlert('حدث خطأ أثناء تفعيل الاشتراك', 'danger');
  }
}

async function cancelSubscription(subscriptionId) {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', subscriptionId);
      
    if (error) throw error;
    
    showAlert('تم إلغاء الاشتراك بنجاح', 'success');
    
    await loadDashboardStats();
    await loadPendingSubscriptions();
    await loadAllSubscriptions();
    
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    showAlert('حدث خطأ أثناء إلغاء الاشتراك', 'danger');
  }
}

async function activateAllSelectedSubscriptions() {
  try {
    const checkboxes = document.querySelectorAll('.subscription-checkbox:checked');
    const subscriptionIds = Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
    
    if (subscriptionIds.length === 0) {
      showAlert('يرجى اختيار اشتراك واحد على الأقل', 'danger');
      return;
    }
    
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'active' })
      .in('id', subscriptionIds);
      
    if (error) throw error;
    
    showAlert(`تم تفعيل ${subscriptionIds.length} اشتراك بنجاح`, 'success');
    
    await loadDashboardStats();
    await loadPendingSubscriptions();
    await loadAllSubscriptions();
    
  } catch (error) {
    console.error('Error activating all selected subscriptions:', error);
    showAlert('حدث خطأ أثناء تفعيل الاشتراكات', 'danger');
  }
}

async function cancelAllSelectedSubscriptions() {
  try {
    const checkboxes = document.querySelectorAll('.subscription-checkbox:checked');
    const subscriptionIds = Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
    
    if (subscriptionIds.length === 0) {
      showAlert('يرجى اختيار اشتراك واحد على الأقل', 'danger');
      return;
    }
    
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .in('id', subscriptionIds);
      
    if (error) throw error;
    
    showAlert(`تم إلغاء ${subscriptionIds.length} اشتراك بنجاح`, 'success');
    
    await loadDashboardStats();
    await loadPendingSubscriptions();
    await loadAllSubscriptions();
    
  } catch (error) {
    console.error('Error cancelling all selected subscriptions:', error);
    showAlert('حدث خطأ أثناء إلغاء الاشتراكات', 'danger');
  }
}

async function showSubscriptionDetails(subscriptionId) {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();
      
    if (error) throw error;
    
    const planNames = {
      'monthly': 'شهري',
      '3-months': '3 شهور',
      'yearly': 'سنوي'
    };
    
    const statusNames = {
      'pending': 'قيد المراجعة',
      'active': 'نشط',
      'cancelled': 'ملغي',
      'expired': 'منتهي'
    };
    
    document.getElementById('detail-user-id').textContent = subscription.user_id;
    document.getElementById('detail-email').textContent = subscription.email;
    document.getElementById('detail-plan').textContent = planNames[subscription.plan] || subscription.plan;
    document.getElementById('detail-transaction-id').textContent = subscription.transaction_id;
    document.getElementById('detail-created-at').textContent = formatDate(subscription.created_at);
    document.getElementById('detail-start-date').textContent = subscription.start_date ? formatDate(subscription.start_date) : '-';
    document.getElementById('detail-end-date').textContent = subscription.end_date ? formatDate(subscription.end_date) : '-';
    document.getElementById('detail-status').textContent = statusNames[subscription.status] || subscription.status;
    
    document.getElementById('subscription-details-modal').style.display = 'flex';
    
  } catch (error) {
    console.error('Error showing subscription details:', error);
    showAlert('حدث خطأ أثناء عرض تفاصيل الاشتراك', 'danger');
  }
}

async function handleLogout() {
  try {
    await supabase.auth.signOut();
    
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Error logging out:', error);
    showAlert('حدث خطأ أثناء تسجيل الخروج', 'danger');
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