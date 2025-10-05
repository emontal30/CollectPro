
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.supabase) {
    console.error('Supabase client is not initialized.');
    showAlert('خطأ فادح: لم يتم تهيئة Supabase!', 'danger');
    return;
  }

  // المصدر الموحد لمعلومات الخطط
  const PLAN_DETAILS = {
    'price_1PgEU9RpN92qb2qTu219Z9G7': { name: 'خطة شهرية', price: 30, durationMonths: 1 },
    'price_1PgEUzRpN92qb2qT52L0kY5p': { name: 'خطة ربع سنوية', price: 80, durationMonths: 3 },
    'price_1PgEVKRpN92qb2qT7gYIEN1M': { name: 'خطة سنوية', price: 300, durationMonths: 12 }
  };

  await checkAdminAccess();
  
  // تحميل جميع البيانات بالتوازي لتحسين الأداء
  await Promise.all([
    loadDashboardStats(PLAN_DETAILS),
    loadPendingSubscriptions(PLAN_DETAILS),
    loadAllSubscriptions(PLAN_DETAILS)
  ]);

  // إعداد مستمعي الأحداث باستخدام تفويض الأحداث
  setupEventListeners(PLAN_DETAILS);
});

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

    if (error || data.role !== 'admin') {
      document.body.innerHTML = '<h1>غير مصرح لك بالوصول.</h1>';
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 2000);
      throw new Error('User is not an admin.');
    }
    
    // عرض بيانات المدير
    document.getElementById('user-name').textContent = user.user_metadata?.full_name || 'Admin';
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('user-initial').textContent = (user.user_metadata?.full_name || 'A').charAt(0).toUpperCase();

  } catch (error) {
    console.error('Admin access check failed:', error.message);
    // إيقاف تنفيذ أي شيء آخر إذا لم يكن المستخدم مديرًا
    throw error;
  }
}

// --- تحميل البيانات --- //

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
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, user_id, email, subscription_type, transaction_id, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    renderTable('#pending-subscriptions-table', data, error, 'لا توجد طلبات قيد المراجعة حاليًا.', true);
}

async function loadAllSubscriptions(planDetails) {
    const statusFilter = document.getElementById('status-filter').value;
    let query = supabase.from('subscriptions').select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    renderTable('#all-subscriptions-table', data, error, 'لا توجد اشتراكات لعرضها حسب الفلتر المختار.', false);
}

// --- التلاعب بال DOM وعرض البيانات ---

function renderTable(tableSelector, data, error, noDataMessage, isPendingTable) {
    const table = document.querySelector(tableSelector);
    const tbody = table.querySelector('tbody');
    const noDataEl = table.nextElementSibling; // يفترض أن عنصر "لا توجد بيانات" يأتي بعد الجدول مباشرة
    tbody.innerHTML = '';

    if (error) {
        console.error(`Error loading data for ${tableSelector}:`, error);
        showAlert(`فشل تحميل البيانات للجدول: ${tableSelector}`, 'danger');
        noDataEl.style.display = 'block';
        table.style.display = 'none';
        return;
    }

    if (data && data.length > 0) {
        data.forEach(sub => {
            const row = tbody.insertRow();
            row.dataset.id = sub.id;
            row.innerHTML = createRowHtml(sub, isPendingTable);
        });
        noDataEl.style.display = 'none';
        table.style.display = 'table';
    } else {
        noDataEl.querySelector('p').textContent = noDataMessage;
        noDataEl.style.display = 'block';
        table.style.display = 'none';
    }
}

function createRowHtml(sub, isPending) {
    const statusBadge = `<span class="status-badge status-${sub.status || 'default'}">${sub.status || 'غير معروف'}</span>`;
    const actions = isPending
        ? `<button class="action-btn approve" title="تفعيل"><i class="fas fa-check"></i></button>
           <button class="action-btn reject" title="رفض"><i class="fas fa-times"></i></button>`
        : '';

    let rowContent = `
        <td>${sub.user_id.substring(0, 12)}...</td>
        <td>${sub.email}</td>
        <td>${sub.subscription_type || 'غير محدد'}</td>
        <td>${sub.transaction_id || '-'}</td>
        ${isPending ? `<td>${formatDate(sub.created_at)}</td>` : `<td>${formatDate(sub.start_date)}</td><td>${formatDate(sub.end_date)}</td><td>${statusBadge}</td>`}
        <td class="actions-cell">
            ${actions}
            <button class="action-btn details" title="تفاصيل"><i class="fas fa-info-circle"></i></button>
        </td>
    `;
    if (isPending) {
        rowContent = `<td><input type="checkbox" class="subscription-checkbox" /></td>` + rowContent;
    }
    return rowContent;
}

// --- معالجة الأحداث --- //

function setupEventListeners(planDetails) {
    // استخدام تفويض الأحداث لتحسين الأداء
    document.querySelector('#pending-subscriptions-table tbody').addEventListener('click', (e) => handleTableClick(e, planDetails));
    document.querySelector('#all-subscriptions-table tbody').addEventListener('click', (e) => handleTableClick(e, planDetails));

    document.getElementById('refresh-btn').addEventListener('click', async () => {
        showAlert('جاري تحديث البيانات...', 'info');
        await Promise.all([loadDashboardStats(planDetails), loadPendingSubscriptions(planDetails), loadAllSubscriptions(planDetails)]);
        showAlert('تم تحديث البيانات بنجاح!', 'success');
    });
    
    document.getElementById('status-filter').addEventListener('change', () => loadAllSubscriptions(planDetails));
    
    document.getElementById('select-all').addEventListener('change', (e) => {
        document.querySelectorAll('#pending-subscriptions-table .subscription-checkbox').forEach(cb => cb.checked = e.target.checked);
    });
}

function handleTableClick(event, planDetails) {
    const target = event.target.closest('.action-btn');
    if (!target) return;

    const subscriptionId = target.closest('tr').dataset.id;

    if (target.classList.contains('approve')) {
        if (confirm('هل أنت متأكد من تفعيل هذا الاشتراك؟')) {
            activateSubscription(subscriptionId, planDetails);
        }
    } else if (target.classList.contains('reject')) {
        if (confirm('هل أنت متأكد من رفض هذا الاشتراك؟ سيتم حذفه.')) {
            cancelSubscription(subscriptionId);
        }
    } else if (target.classList.contains('details')) {
        showSubscriptionDetails(subscriptionId, planDetails);
    }
}


// --- إجراءات الاشتراك (تفعيل، إلغاء) --- //

async function activateSubscription(subscriptionId, planDetails) {
  try {
    const { data: sub, error: fetchError } = await supabase
      .from('subscriptions')
      .select('plan_id')
      .eq('id', subscriptionId)
      .single();

    if (fetchError) throw fetchError;

    const plan = planDetails[sub.plan_id];
    if (!plan) {
      throw new Error(`لا يمكن العثور على تفاصيل الخطة لـ plan_id: ${sub.plan_id}`);
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + plan.durationMonths);

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      })
      .eq('id', subscriptionId);

    if (updateError) throw updateError;

    showAlert('تم تفعيل الاشتراك بنجاح!', 'success');
    // إعادة تحميل البيانات ذات الصلة
    Promise.all([loadDashboardStats(planDetails), loadPendingSubscriptions(planDetails), loadAllSubscriptions(planDetails)]);

  } catch (error) {
    console.error('Error activating subscription:', error);
    showAlert(`فشل تفعيل الاشتراك: ${error.message}`, 'danger');
  }
}

async function cancelSubscription(subscriptionId) {
    try {
        // بدلاً من التحديث، سنقوم بالحذف لأن الطلب تم رفضه
        const { error } = await supabase.from('subscriptions').delete().eq('id', subscriptionId);
        if (error) throw error;

        showAlert('تم رفض وحذف طلب الاشتراك بنجاح.', 'success');
        // إعادة تحميل البيانات
        const planDetails = {}; /* يمكنك تمريرها فارغة أو إعادة بنائها إذا لزم الأمر */
        Promise.all([loadDashboardStats(planDetails), loadPendingSubscriptions(planDetails), loadAllSubscriptions(planDetails)]);

    } catch (error) {
        console.error('Error rejecting subscription:', error);
        showAlert('فشل رفض طلب الاشتراك.', 'danger');
    }
}

// --- دوال مساعدة --- //

async function showSubscriptionDetails(subscriptionId, planDetails) {
  // ... (يمكن إضافة منطق عرض التفاصيل هنا إذا لزم الأمر) ...
  showAlert('ميزة عرض التفاصيل لم تنفذ بعد.', 'info');
}

function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
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
