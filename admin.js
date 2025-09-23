// إعداد Supabase
const supabaseUrl = getConfig('supabase.url');
const supabaseKey = getConfig('supabase.anonKey');

if (!supabaseUrl || !supabaseKey) {
  console.error('إعدادات Supabase غير متوفرة في ملف config.js');
} else {
  const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', async () => {
  // تطبيق الوضع الليلي
  applyDarkModeFromStorage();
  
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
  
  // زر الوضع الليلي
  const toggleDarkBtn = document.getElementById('toggleDark');
  if (toggleDarkBtn) {
    toggleDarkBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      localStorage.setItem('darkMode', document.body.classList.contains('dark') ? 'on' : 'off');
    });
  }
}

async function checkAdminAccess() {
  try {
    // التحقق من وجود جلسة مستخدم
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // إذا لم يكن المستخدم مسجلاً، توجيهه لصفحة تسجيل الدخول
      window.location.href = 'login.html';
      return;
    }
    
    // التحقق من صلاحيات الإدارة (في تطبيق حقيقي، سيتم التحقق من دور المستخدم)
    // هنا نقوم بمحاكاة التحقق من صلاحيات الإدارة
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (error || !data || data.role !== 'admin') {
      // إذا لم يكن المستخدم مسؤولاً، توجيهه للصفحة الرئيسية
      window.location.href = 'index.html';
    }
  } catch (error) {
    console.error('Error checking admin access:', error);
    window.location.href = 'login.html';
  }
}

async function loadDashboardStats() {
  try {
    // الحصول على إجمالي المستخدمين
    const { count: totalUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
      
    if (usersError) throw usersError;
    
    // الحصول على عدد الطلبات قيد المراجعة
    const { count: pendingRequests, error: pendingError } = await supabase
      .from('Subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
      
    if (pendingError) throw pendingError;
    
    // الحصول على عدد الاشتراكات النشطة
    const { count: activeSubscriptions, error: activeError } = await supabase
      .from('Subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
      
    if (activeError) throw activeError;
    
    // الحصول على إجمالي الإيرادات
    const { data: subscriptions, error: revenueError } = await supabase
      .from('Subscriptions')
      .select('plan')
      .eq('status', 'active');
      
    if (revenueError) throw revenueError;
    
    // حساب الإيرادات بناءً على الخطط
    let totalRevenue = 0;
    if (subscriptions) {
      subscriptions.forEach(sub => {
        if (sub.plan === 'monthly') totalRevenue += 30;
        else if (sub.plan === '3-months') totalRevenue += 50;
        else if (sub.plan === 'yearly') totalRevenue += 360;
      });
    }
    
    // تحديث واجهة المستخدم
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
      .from('Subscriptions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    const tbody = document.querySelector('#pending-subscriptions-table tbody');
    tbody.innerHTML = '';
    
    if (data && data.length > 0) {
      data.forEach(subscription => {
        const row = document.createElement('tr');
        
        // تحويل نوع الخطة إلى الاسم المعروض
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
      
      // إضافة مستمعي الأحداث للأزرار
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
      
      // إظهار الجدول وإخفاء رسالة عدم وجود بيانات
      document.getElementById('pending-subscriptions-table').style.display = 'table';
      document.getElementById('no-pending-requests').style.display = 'none';
    } else {
      // إخفاء الجدول وإظهار رسالة عدم وجود بيانات
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
      .from('Subscriptions')
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
      
      // إضافة مستمعي الأحداث للأزرار
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
      
      // إظهار الجدول وإخفاء رسالة عدم وجود بيانات
      document.getElementById('all-subscriptions-table').style.display = 'table';
      document.getElementById('no-subscriptions').style.display = 'none';
    } else {
      // إخفاء الجدول وإظهار رسالة عدم وجود بيانات
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
    // الحصول على بيانات الاشتراك
    const { data: subscription, error: fetchError } = await supabase
      .from('Subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();
      
    if (fetchError) throw fetchError;
    
    // حساب تاريخ البدء والانتهاء بناءً على الخطة
    const startDate = new Date().toISOString().split('T')[0];
    let endDate = new Date();
    
    if (subscription.plan === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (subscription.plan === '3-months') {
      endDate.setMonth(endDate.getMonth() + 3);
    } else if (subscription.plan === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
      // إضافة شهر مجاني للخطة السنوية
      endDate.setMonth(endDate.getMonth() + 1);
    }
    
    const endDateString = endDate.toISOString().split('T')[0];
    
    // تحديث حالة الاشتراك
    const { error: updateError } = await supabase
      .from('Subscriptions')
      .update({
        status: 'active',
        start_date: startDate,
        end_date: endDateString
      })
      .eq('id', subscriptionId);
      
    if (updateError) throw updateError;
    
    // إظهار رسالة نجاح
    showAlert('تم تفعيل الاشتراك بنجاح', 'success');
    
    // تحديث البيانات
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
    // تحديث حالة الاشتراك
    const { error } = await supabase
      .from('Subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', subscriptionId);
      
    if (error) throw error;
    
    // إظهار رسالة نجاح
    showAlert('تم إلغاء الاشتراك بنجاح', 'success');
    
    // تحديث البيانات
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
    // الحصول على معرفات الاشتراكات المحددة
    const checkboxes = document.querySelectorAll('.subscription-checkbox:checked');
    const subscriptionIds = Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
    
    if (subscriptionIds.length === 0) {
      showAlert('يرجى اختيار اشتراك واحد على الأقل', 'danger');
      return;
    }
    
    // تحديث حالة الاشتراكات
    const { error } = await supabase
      .from('Subscriptions')
      .update({ status: 'active' })
      .in('id', subscriptionIds);
      
    if (error) throw error;
    
    // إظهار رسالة نجاح
    showAlert(`تم تفعيل ${subscriptionIds.length} اشتراك بنجاح`, 'success');
    
    // تحديث البيانات
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
    // الحصول على معرفات الاشتراكات المحددة
    const checkboxes = document.querySelectorAll('.subscription-checkbox:checked');
    const subscriptionIds = Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
    
    if (subscriptionIds.length === 0) {
      showAlert('يرجى اختيار اشتراك واحد على الأقل', 'danger');
      return;
    }
    
    // تحديث حالة الاشتراكات
    const { error } = await supabase
      .from('Subscriptions')
      .update({ status: 'cancelled' })
      .in('id', subscriptionIds);
      
    if (error) throw error;
    
    // إظهار رسالة نجاح
    showAlert(`تم إلغاء ${subscriptionIds.length} اشتراك بنجاح`, 'success');
    
    // تحديث البيانات
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
    // الحصول على بيانات الاشتراك
    const { data: subscription, error } = await supabase
      .from('Subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();
      
    if (error) throw error;
    
    // تحويل نوع الخطة إلى الاسم المعروض
    const planNames = {
      'monthly': 'شهري',
      '3-months': '3 شهور',
      'yearly': 'سنوي'
    };
    
    // تحويل الحالة إلى الاسم المعروض
    const statusNames = {
      'pending': 'قيد المراجعة',
      'active': 'نشط',
      'cancelled': 'ملغي',
      'expired': 'منتهي'
    };
    
    // تعبئة بيانات النافذة المنبثقة
    document.getElementById('detail-user-id').textContent = subscription.user_id;
    document.getElementById('detail-email').textContent = subscription.email;
    document.getElementById('detail-plan').textContent = planNames[subscription.plan] || subscription.plan;
    document.getElementById('detail-transaction-id').textContent = subscription.transaction_id;
    document.getElementById('detail-created-at').textContent = formatDate(subscription.created_at);
    document.getElementById('detail-start-date').textContent = subscription.start_date ? formatDate(subscription.start_date) : '-';
    document.getElementById('detail-end-date').textContent = subscription.end_date ? formatDate(subscription.end_date) : '-';
    document.getElementById('detail-status').textContent = statusNames[subscription.status] || subscription.status;
    
    // إظهار النافذة المنبثقة
    document.getElementById('subscription-details-modal').style.display = 'flex';
    
  } catch (error) {
    console.error('Error showing subscription details:', error);
    showAlert('حدث خطأ أثناء عرض تفاصيل الاشتراك', 'danger');
  }
}

async function handleLogout() {
  try {
    // تسجيل الخروج من Supabase
    await supabase.auth.signOut();
    
    // توجيه المستخدم لصفحة تسجيل الدخول
    window.location.href = 'login.html';
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
}
