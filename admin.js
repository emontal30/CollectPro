// Global error handlers - معزز للكشف عن الأخطاء في لوحة التحكم
window.onerror = function(message, source, lineno, colno, error) {
  console.error("🚨 خطأ غير محتمل في لوحة التحكم:", {
    message: message,
    source: source,
    lineno: lineno,
    colno: colno,
    error: error,
    stack: error?.stack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  });

  showAlert(`حدث خطأ غير متوقع: ${message}`, 'danger');
  return false;
};

window.addEventListener('unhandledrejection', function(event) {
  console.error('🚨 وعد غير محتمل مرفوض في لوحة التحكم:', {
    reason: event.reason,
    promise: event.promise,
    timestamp: new Date().toISOString(),
    stack: event.reason?.stack,
    message: event.reason?.message
  });

  showAlert(`حدث خطأ في النظام: ${event.reason?.message || 'خطأ غير معروف'}`, 'danger');
  event.preventDefault();
});

// مراقبة أخطاء الشبكة
window.addEventListener('error', function(event) {
  if (event.target.tagName === 'IMG' || event.target.tagName === 'SCRIPT' || event.target.tagName === 'LINK') {
    console.warn('⚠️ فشل في تحميل مورد:', {
      type: event.target.tagName,
      src: event.target.src || event.target.href,
      timestamp: new Date().toISOString()
    });
  }
});

// دالة لتسجيل أخطاء قاعدة البيانات
function logDatabaseError(operation, error, context = {}) {
  console.error('🗄️ خطأ قاعدة البيانات في لوحة التحكم:', {
    operation: operation,
    error: error,
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    context: context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  });
}

// دالة للتحقق من صحة البيانات
function validateData(data, operation) {
  if (!data) {
    console.warn('⚠️ بيانات فارغة في لوحة التحكم:', {
      operation: operation,
      data: data,
      timestamp: new Date().toISOString()
    });
    return false;
  }

  if (Array.isArray(data) && data.length === 0) {
    console.info('ℹ️ قائمة فارغة في لوحة التحكم:', {
      operation: operation,
      timestamp: new Date().toISOString()
    });
  }

  return true;
}

// دالة لقياس أداء العمليات
function measurePerformance(operation, startTime) {
  const endTime = performance.now();
  const duration = endTime - startTime;

  console.log('⚡ قياس الأداء في لوحة التحكم:', {
    operation: operation,
    duration: `${duration.toFixed(2)}ms`,
    timestamp: new Date().toISOString()
  });

  if (duration > 5000) {
    console.warn('🐌 عملية بطيئة جداً في لوحة التحكم:', {
      operation: operation,
      duration: `${duration.toFixed(2)}ms`,
      threshold: '5000ms',
      timestamp: new Date().toISOString()
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 بدء تحميل صفحة لوحة التحكم...');

  // Update footer year
  const yearSpanElements = document.querySelectorAll('.footer p span#year');
  const currentYear = new Date().getFullYear();
  yearSpanElements.forEach(span => {
    span.textContent = currentYear;
  });

  // Ensure footer is visible
  const footer = document.getElementById('footer');
  if (footer) {
    footer.style.display = footer.style.display || 'block';
    footer.style.visibility = footer.style.visibility || 'visible';
    footer.style.padding = footer.style.padding || '12px 10px';
    footer.style.backgroundColor = footer.style.backgroundColor || '#007965';
    footer.style.color = footer.style.color || 'white';
    footer.style.textAlign = footer.style.textAlign || 'center';

    const body = document.body;
    if (footer.parentNode !== body) {
      body.appendChild(footer);
    }

    console.log('Footer ensured');
  } else {
    console.warn('Footer element not found in the DOM');
  }

  console.log('🔐 التحقق من صلاحيات المدير...');
  await checkAdminAccess();

  console.log('👤 تحديث بيانات المستخدم في الشريط الجانبي...');
  await populateUserData();

  // تحميل جميع البيانات بالتوازي
  try {
    console.log('📊 تحميل البيانات من قاعدة البيانات...');
    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    await Promise.all([
      loadDashboardStats(),
      loadPendingSubscriptions(),
      loadAllSubscriptions()
    ]);

    console.log('✅ تم تحميل جميع البيانات بنجاح');
  } catch (error) {
    console.error('❌ فشل في تحميل البيانات:', error);
    showAlert('❌ حدث خطأ أثناء تحميل البيانات', 'danger');
  } finally {
    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) loadingIndicator.style.display = 'none';
  }

  // إعداد مستمعي الأحداث
  setupEventListeners();

  console.log('🎯 تم تحميل صفحة لوحة التحكم بالكامل');
});

async function checkAdminAccess() {
   try {
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) {
       window.location.href = 'index.html';
       return;
     }

     const adminEmails = ['emontal.33@gmail.com'];
     const isAdmin = adminEmails.includes(user.email);

     if (!isAdmin) {
       document.body.innerHTML = '<h1>غير مصرح لك بالوصول.</h1>';
       setTimeout(() => { window.location.href = 'dashboard.html'; }, 2000);
       throw new Error('User is not an admin.');
     }

     updateUserDisplay(user);
   } catch (error) {
     console.error('Admin access check failed:', error.message);
     throw error;
   }
}

// --- تحميل البيانات (محسّن) --- //

async function loadDashboardStats() {
      const startTime = performance.now();
      try {
          console.log('🔄 جاري تحميل إحصائيات لوحة التحكم...');

          // التحقق من JWT والدور للمدير
          const { data: { user } } = await supabase.auth.getUser();
          console.log('👤 بيانات المستخدم الحالي:', {
              id: user?.id,
              email: user?.email,
              user_metadata: user?.user_metadata,
              role: user?.user_metadata?.role
          });

          // حساب جميع الإحصائيات في استعلام واحد لتحسين الأداء
          const [
              usersResponse,
              pendingResponse,
              activeResponse,
              cancelledResponse,
              expiredResponse,
              totalRevenueResponse
          ] = await Promise.all([
              supabase.from('users').select('*', { count: 'exact', head: false }),
              supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
              supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
              supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
              supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'expired'),
              supabase.rpc('calculate_total_revenue')
          ]);

          console.log('🔍 استجابات الإحصائيات:', {
              users: usersResponse,
              pending: pendingResponse,
              active: activeResponse,
              cancelled: cancelledResponse,
              expired: expiredResponse,
              revenue: totalRevenueResponse
          });

         const { count: usersCount, error: usersError } = usersResponse;
         const { count: pendingCount, error: pendingError } = pendingResponse;
         const { count: activeCount, error: activeError } = activeResponse;
         const { count: cancelledCount, error: cancelledError } = cancelledResponse;
         const { count: expiredCount, error: expiredError } = expiredResponse;
         const { data: totalRevenue, error: revenueError } = totalRevenueResponse;

         // التحقق من الأخطاء
         if (usersError) throw usersError;
         if (pendingError) throw pendingError;
         if (activeError) throw activeError;
         if (cancelledError) throw cancelledError;
         if (expiredError) throw expiredError;
         if (revenueError) {
             console.warn('⚠️ خطأ في حساب الإيرادات:', revenueError);
         }

         // حساب الإيرادات مع fallback
         let finalRevenue = 0;
         if (totalRevenue !== null && totalRevenue !== undefined) {
             finalRevenue = Number(totalRevenue);
         } else {
             // حساب بديل في حالة فشل الدالة
             console.log('🔄 حساب الإيرادات البديل...');
             const { data: activeSubs, error: subsError } = await supabase
                 .from('subscriptions')
                 .select('subscription_plans!inner(price_egp)')
                 .eq('status', 'active');

             if (!subsError && activeSubs) {
                 finalRevenue = activeSubs.reduce((sum, sub) => {
                     return sum + Number(sub.subscription_plans?.price_egp || 0);
                 }, 0);
             }
         }

         // حساب إحصائيات إضافية
         const totalSubscriptions = (pendingCount || 0) + (activeCount || 0) + (cancelledCount || 0) + (expiredCount || 0);
         const completionRate = totalSubscriptions > 0 ? Math.round(((activeCount || 0) / totalSubscriptions) * 100) : 0;
         const pendingRate = totalSubscriptions > 0 ? Math.round(((pendingCount || 0) / totalSubscriptions) * 100) : 0;

         console.log('📊 إحصائيات محملة:', {
             users: usersCount || 0,
             pending: pendingCount || 0,
             active: activeCount || 0,
             cancelled: cancelledCount || 0,
             expired: expiredCount || 0,
             revenue: finalRevenue,
             totalSubscriptions: totalSubscriptions,
             completionRate: completionRate,
             pendingRate: pendingRate
         });

         // تحديث العناصر في DOM
         const elements = {
             'total-users': usersCount || 0,
             'pending-requests': pendingCount || 0,
             'active-subscriptions': activeCount || 0,
             'total-revenue': `${finalRevenue} ج.م`
         };

         Object.entries(elements).forEach(([id, value]) => {
             const element = document.getElementById(id);
             if (element) {
                 element.textContent = value;
             }
         });

         // تحديث المخططات الديناميكية
         updateCharts({
             users: usersCount || 0,
             pending: pendingCount || 0,
             active: activeCount || 0,
             cancelled: cancelledCount || 0,
             expired: expiredCount || 0,
             revenue: finalRevenue,
             completionRate: completionRate,
             pendingRate: pendingRate
         });

         // إضافة إحصائيات جديدة في HTML
         addNewStatsCards(cancelledCount || 0, expiredCount || 0, completionRate, pendingRate);

         console.log('✅ تم تحديث إحصائيات لوحة التحكم بنجاح');
         measurePerformance('loadDashboardStats', startTime);
     } catch (error) {
         console.error('❌ خطأ في تحميل إحصائيات لوحة التحكم:', error);
         logDatabaseError('loadDashboardStats', error);
         showAlert('❌ فشل تحميل إحصائيات لوحة التحكم', 'danger');
         measurePerformance('loadDashboardStats (failed)', startTime);
     }
}

async function loadPendingSubscriptions() {
    const startTime = performance.now();
    try {
        console.log('🔄 جاري تحميل طلبات الاشتراك المعلقة...');

        const { data: pendingData, error: pendingError } = await supabase
            .from('subscriptions')
            .select(`
                *,
                users:user_id (
                    full_name,
                    email
                ),
                subscription_plans:plan_id (
                    name,
                    name_ar,
                    price_egp
                )
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (pendingError) {
            logDatabaseError('loadPendingSubscriptions', pendingError);
            throw pendingError;
        }

        validateData(pendingData, 'loadPendingSubscriptions');
        console.log('📊 تم العثور على', pendingData?.length || 0, 'طلب معلق');

        const formattedData = pendingData.map(sub => ({
            id: sub.id,
            user_id: sub.user_id,
            user_name: sub.users ? (sub.users.full_name || sub.users.email) : '',
            email: sub.users ? sub.users.email : '',
            plan_id: sub.plan_id,
            plan_name: sub?.subscription_plans?.name || '',
            plan_name_ar: sub?.subscription_plans?.name_ar || '',
            transaction_id: sub.transaction_id,
            status: sub.status,
            created_at: sub.created_at,
            plan_price: sub?.subscription_plans?.price_egp || 0
        }));

        console.log('✅ تم تنسيق البيانات بنجاح');
        renderTable('#pending-subscriptions-table', formattedData, null, 'لا توجد طلبات قيد المراجعة حاليًا.', true);

        // إضافة logs للتحقق من العناصر المعنية بالمشكلة
        const tableHeaderInfo = document.querySelector('.table-header-info');
        const tableInfo = document.querySelector('.table-info');
        const tableStats = document.querySelector('.table-stats');

        console.log('🔍 فحص عناصر معلومات الجدول:', {
            tableHeaderInfo: tableHeaderInfo,
            tableInfo: tableInfo,
            tableStats: tableStats,
            tableHeaderInfoComputedStyle: tableHeaderInfo ? window.getComputedStyle(tableHeaderInfo) : null,
            tableInfoComputedStyle: tableInfo ? window.getComputedStyle(tableInfo) : null,
            tableStatsComputedStyle: tableStats ? window.getComputedStyle(tableStats) : null,
            tableHeaderInfoBoundingRect: tableHeaderInfo ? tableHeaderInfo.getBoundingClientRect() : null,
            tableInfoBoundingRect: tableInfo ? tableInfo.getBoundingClientRect() : null,
            tableStatsBoundingRect: tableStats ? tableStats.getBoundingClientRect() : null,
            timestamp: new Date().toISOString()
        });

        updateSelectedCount();
        updateSelectAllState();
        measurePerformance('loadPendingSubscriptions', startTime);
    } catch (error) {
        console.error('❌ خطأ في تحميل طلبات الاشتراك المعلقة:', error);
        logDatabaseError('loadPendingSubscriptions', error);
        showAlert('❌ فشل تحميل طلبات الاشتراك المعلقة', 'danger');
        renderTable('#pending-subscriptions-table', [], error, 'حدث خطأ أثناء تحميل البيانات.', true);
        measurePerformance('loadPendingSubscriptions (failed)', startTime);
    }
}

async function loadAllSubscriptions() {
    const startTime = performance.now();
    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    try {
        console.log('🔄 جاري تحميل جميع الاشتراكات...');

        const statusFilterElement = document.getElementById('status-filter');
        const statusFilter = statusFilterElement?.value || 'all';

        let query = supabase
            .from('subscriptions')
            .select(`
                *,
                users:user_id (full_name, email),
                subscription_plans:plan_id (name, name_ar, price_egp)
            `);

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
            console.log('🔍 تطبيق فلتر الحالة:', statusFilter);
        }

        let { data: viewData, error: viewError } = await query.order('created_at', { ascending: false });

        if (viewError) {
            logDatabaseError('loadAllSubscriptions', viewError);
            throw new Error(`فشل في الوصول للبيانات: ${viewError.message || 'خطأ غير معروف'}`);
        }

        if (!Array.isArray(viewData)) {
            throw new Error('البيانات المستلمة غير صالحة');
        }

        validateData(viewData, 'loadAllSubscriptions');
        console.log('📊 تم العثور على', viewData.length, 'اشتراك');

        const formattedData = viewData.map(sub => ({
            id: sub.id || '',
            user_id: sub.user_id || '',
            user_name: sub.users ? (sub.users.full_name || sub.users.email || 'مستخدم غير معروف') : 'مستخدم غير معروف',
            email: sub.users ? sub.users.email : 'غير متوفر',
            plan_id: sub.plan_id || '',
            plan_name: sub?.subscription_plans?.name || 'خطة غير معروفة',
            plan_name_ar: sub?.subscription_plans?.name_ar || 'خطة غير معروفة',
            transaction_id: sub.transaction_id || '-',
            status: sub.status || 'غير معروف',
            start_date: sub.start_date,
            end_date: sub.end_date,
            created_at: sub.created_at,
            plan_price: sub?.subscription_plans?.price_egp || 0
        }));

        console.log('✅ تم تنسيق البيانات بنجاح');
        renderTable('#all-subscriptions-table', formattedData, null, 'لا توجد اشتراكات تطابق هذا الفلتر.', false);
        updateTotalSubscriptionsCount();
        measurePerformance('loadAllSubscriptions', startTime);

    } catch (error) {
        console.error('❌ خطأ في تحميل الاشتراكات:', error);
        logDatabaseError('loadAllSubscriptions', error);
        showAlert(`❌ فشل تحميل قائمة الاشتراكات`, 'danger');
        renderTable('#all-subscriptions-table', [], error, 'حدث خطأ أثناء تحميل البيانات.', false);
        measurePerformance('loadAllSubscriptions (failed)', startTime);
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}



// --- باقي الدوال (بدون تغيير) --- //

function renderTable(tableSelector, data, error, noDataMessage, isPendingTable) {
    const table = document.querySelector(tableSelector);
    const tbody = table.querySelector('tbody');
    const noDataEl = table.nextElementSibling;
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

    // استدعاء toggleNoData بعد كل تعبئة للجدول
    toggleNoData(tableSelector);
}

function createRowHtml(sub, isPending) {
    const statusBadge = `<span class="status-badge status-${sub.status || 'default'}">${getStatusText(sub.status)}</span>`;
    let actions = '';

    if (isPending) {
        actions = `<button class="action-btn approve" title="تفعيل الاشتراك"><i class="fas fa-check"></i></button>
                    <button class="action-btn reject" title="رفض الاشتراك"><i class="fas fa-times"></i></button>`;
    } else {
        if (sub.status === 'active') {
            actions = `<button class="action-btn deactivate" title="إلغاء تفعيل الاشتراك"><i class="fas fa-ban"></i></button>`;
        } else if (sub.status === 'cancelled') {
            actions = `<button class="action-btn activate" title="إعادة تفعيل الاشتراك"><i class="fas fa-play"></i></button>`;
        }
        actions += `<button class="action-btn delete" title="حذف الاشتراك نهائياً"><i class="fas fa-trash"></i></button>`;
    }

    const planName = sub.plan_name_ar || sub.plan_name || 'خطة غير معروفة';
    const userIdShort = (sub.user_id || '').substring(0, 8) + '...';
    const transactionId = sub.transaction_id ? sub.transaction_id.substring(0, 10) + '...' : '-';

    let rowContent = `
      <td class="col-id ellipsis" title="${sub.user_id || ''}">${userIdShort}</td>
        <td class="ellipsis" title="${sub.user_name || ''}">${sub.user_name || 'غير محدد'}</td>
        <td class="col-email ellipsis" title="${sub.email || ''}"><a href="mailto:${sub.email || ''}" class="email-link">${sub.email || 'غير متوفر'}</a></td>
        <td class="ellipsis" title="${planName}">${planName}</td>
        <td class="num ltr ellipsis" title="${sub.transaction_id || ''}">${transactionId}</td>
        ${isPending ? `<td class="ellipsis">${formatDate(sub.created_at)}</td>` : `<td class="ellipsis">${formatDate(sub.start_date)}</td><td class="ellipsis">${formatDate(sub.end_date)}</td><td>${statusBadge}</td>`}
        <td class="col-actions actions-cell">
            ${actions}
            <button class="action-btn details" title="عرض التفاصيل"><i class="fas fa-info-circle"></i></button>
        </td>
    `;
    if (isPending) {
        rowContent = `<td><input type="checkbox" class="subscription-checkbox" title="تحديد هذا الطلب" /></td>` + rowContent;
    }
    return rowContent;
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'قيد المراجعة',
        'active': 'نشط',
        'cancelled': 'ملغي',
        'expired': 'منتهي',
        'default': 'غير معروف'
    };
    return statusMap[status] || statusMap['default'];
}

function setupEventListeners() {
    document.querySelector('#pending-subscriptions-table tbody').addEventListener('click', (e) => handleTableClick(e));
    document.querySelector('#all-subscriptions-table tbody').addEventListener('click', (e) => handleTableClick(e));

    document.getElementById('refresh-btn').addEventListener('click', async () => {
        showAlert('🔄 جاري تحديث البيانات...', 'info');
        await Promise.all([loadDashboardStats(), loadPendingSubscriptions(), loadAllSubscriptions()]);
        showAlert('✅ تم تحديث البيانات بنجاح', 'success');
    });
    
    document.getElementById('status-filter').addEventListener('change', () => loadAllSubscriptions());


    // إضافة مستمعي الأحداث للمخططات التفاعلية
    setupChartControls();

    document.getElementById('select-all').addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('#pending-subscriptions-table .subscription-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
        updateSelectedCount();
    });

    // إضافة مستمع للتحقق من تحديد العناصر
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('subscription-checkbox')) {
            updateSelectedCount();
            updateSelectAllState();
        }
    });

    document.getElementById('activate-all-btn').addEventListener('click', () => activateAllPendingSubscriptions());
    document.getElementById('cancel-all-btn').addEventListener('click', () => cancelAllPendingSubscriptions());

}

function handleTableClick(event) {
    const target = event.target.closest('.action-btn');
    if (!target) return;

    const subscriptionId = target.closest('tr').dataset.id;

    if (target.classList.contains('approve')) {
        showCustomConfirm('هل أنت متأكد من تفعيل هذا الاشتراك؟', 'success', () => {
            activateSubscription(subscriptionId);
        });
    } else if (target.classList.contains('reject')) {
        showCustomConfirm('هل أنت متأكد من رفض هذا الاشتراك؟ سيتم حذفه نهائياً.', 'danger', () => {
            cancelSubscription(subscriptionId);
        });
    } else if (target.classList.contains('deactivate')) {
        showCustomConfirm('هل أنت متأكد من إلغاء تفعيل هذا الاشتراك؟', 'warning', () => {
            deactivateSubscription(subscriptionId);
        });
    } else if (target.classList.contains('activate')) {
        showCustomConfirm('هل أنت متأكد من إعادة تفعيل هذا الاشتراك؟', 'success', () => {
            reactivateSubscription(subscriptionId);
        });
    } else if (target.classList.contains('delete')) {
        showCustomConfirm('هل أنت متأكد من حذف هذا الاشتراك نهائياً؟ لا يمكن التراجع عن هذا الإجراء.', 'danger', () => {
            deleteSubscription(subscriptionId);
        });
    } else if (target.classList.contains('details')) {
        showSubscriptionDetails(subscriptionId);
    }
}



async function cleanDuplicateSubscriptions(userId) {
    try {
        console.log('🧹 جاري تنظيف الطلبات المكررة للمستخدم:', userId);

        // الحصول على جميع الطلبات المعلقة لهذا المستخدم
        const { data: allPending, error: fetchError } = await supabase
            .from('subscriptions')
            .select('id, created_at')
            .eq('user_id', userId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        if (!allPending || allPending.length <= 1) {
            showAlert('لا توجد طلبات مكررة لتنظيفها', 'info');
            return;
        }

        // الاحتفاظ بالطلب الأحدث وحذف الباقي
        const latestId = allPending[0].id;
        const idsToDelete = allPending.slice(1).map(sub => sub.id);

        const { error: deleteError } = await supabase
            .from('subscriptions')
            .delete()
            .in('id', idsToDelete);

        if (deleteError) throw deleteError;

        showAlert(`✅ تم تنظيف ${idsToDelete.length} طلب مكرر، تم الاحتفاظ بالطلب الأحدث فقط`, 'success');

        // تحديث البيانات
        await Promise.all([
          loadDashboardStats(),
          loadPendingSubscriptions(),
          loadAllSubscriptions()
        ]);

    } catch (error) {
        console.error('❌ خطأ في تنظيف الطلبات المكررة:', error);
        showAlert(`فشل في تنظيف الطلبات المكررة: ${error.message}`, 'danger');
    }
}

// إجراءات الاشتراك
async function activateSubscription(subscriptionId) {
  try {
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('plan_id')
      .eq('id', subscriptionId)
      .single();

    if (fetchError) throw fetchError;
    if (!subscription) throw new Error('لم يتم العثور على الاشتراك.');

    const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('duration_months')
        .eq('id', subscription.plan_id)
        .single();

    if (planError) throw planError;
    if (!plan) throw new Error('تفاصيل الخطة غير متوفرة.');

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + plan.duration_months);

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      })
      .eq('id', subscriptionId);

    if (updateError) throw updateError;

    showAlert('✅ تم تفعيل الاشتراك بنجاح', 'success');
    
    await Promise.all([
        loadDashboardStats(), 
        loadPendingSubscriptions(), 
        loadAllSubscriptions()
    ]);

  } catch (error) {
    console.error('Error activating subscription:', error);
    showAlert(`❌ فشل تفعيل الاشتراك`, 'danger');
  }
}

async function cancelSubscription(subscriptionId) {
    try {
        const { error } = await supabase
            .from('subscriptions')
            .delete()
            .eq('id', subscriptionId);

        if (error) throw error;

        showAlert('🗑️ تم رفض وحذف طلب الاشتراك', 'success');

        await Promise.all([
            loadDashboardStats(),
            loadPendingSubscriptions(),
            loadAllSubscriptions()
        ]);

    } catch (error) {
        console.error('Error rejecting subscription:', error);
        showAlert(`❌ فشل رفض طلب الاشتراك`, 'danger');
    }
}

async function deleteSubscription(subscriptionId) {
    try {
        console.log('🗑️ محاولة حذف الاشتراك:', subscriptionId);

        if (!subscriptionId) {
            throw new Error('معرف الاشتراك مطلوب');
        }

        const { error } = await supabase
            .from('subscriptions')
            .delete()
            .eq('id', subscriptionId);

        if (error) {
            logDatabaseError('deleteSubscription', error, { subscriptionId });
            throw error;
        }

        showAlert('🗑️ تم حذف الاشتراك نهائياً', 'success');

        await Promise.all([
            loadDashboardStats(),
            loadPendingSubscriptions(),
            loadAllSubscriptions()
        ]);

    } catch (error) {
        console.error('❌ خطأ في حذف الاشتراك:', error);
        showAlert(`❌ فشل حذف الاشتراك`, 'danger');
    }
}

async function deactivateSubscription(subscriptionId) {
    try {
        const { error } = await supabase
            .from('subscriptions')
            .update({
                status: 'cancelled',
                end_date: new Date().toISOString()
            })
            .eq('id', subscriptionId);

        if (error) throw error;

        showAlert('🚫 تم إلغاء تفعيل الاشتراك', 'success');

        await Promise.all([
            loadDashboardStats(),
            loadPendingSubscriptions(),
            loadAllSubscriptions()
        ]);

    } catch (error) {
        console.error('Error deactivating subscription:', error);
        showAlert(`❌ فشل إلغاء تفعيل الاشتراك`, 'danger');
    }
}

async function reactivateSubscription(subscriptionId) {
    try {
        const { data: subscription, error: fetchError } = await supabase
            .from('subscriptions')
            .select('plan_id')
            .eq('id', subscriptionId)
            .single();

        if (fetchError) throw fetchError;
        if (!subscription) throw new Error('لم يتم العثور على الاشتراك.');

        const { data: plan, error: planError } = await supabase
            .from('subscription_plans')
            .select('duration_months')
            .eq('id', subscription.plan_id)
            .single();

        if (planError) throw planError;
        if (!plan) throw new Error('تفاصيل الخطة غير متوفرة.');

        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + plan.duration_months);

        const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
                status: 'active',
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
            })
            .eq('id', subscriptionId);

        if (updateError) throw updateError;

        showAlert('🔄 تم إعادة تفعيل الاشتراك', 'success');

        await Promise.all([
            loadDashboardStats(),
            loadPendingSubscriptions(),
            loadAllSubscriptions()
        ]);

    } catch (error) {
        console.error('Error reactivating subscription:', error);
        showAlert(`❌ فشل إعادة تفعيل الاشتراك`, 'danger');
    }
}

async function activateAllPendingSubscriptions() {
    try {
        console.log('🔄 بدء تفعيل جميع الاشتراكات المعلقة...');

        const selectedCheckboxes = document.querySelectorAll('#pending-subscriptions-table .subscription-checkbox:checked');

        if (selectedCheckboxes.length === 0) {
            showAlert('يرجى تحديد طلبات الاشتراك المراد تفعيلها.', 'warning');
            return;
        }

        const confirmed = await new Promise((resolve) => {
            showCustomConfirm(
                `هل أنت متأكد من تفعيل ${selectedCheckboxes.length} طلب اشتراك؟`,
                'success',
                () => resolve(true),
                () => resolve(false)
            );
        });

        if (!confirmed) return;

        showAlert('جاري تفعيل الاشتراكات...', 'info');

        let successCount = 0;
        let errorCount = 0;

        for (const checkbox of selectedCheckboxes) {
            const subscriptionId = checkbox.closest('tr').dataset.id;

            try {
                const { data: subscription, error: fetchError } = await supabase
                    .from('subscriptions')
                    .select('plan_id')
                    .eq('id', subscriptionId)
                    .single();

                if (fetchError) throw fetchError;
                if (!subscription) throw new Error('لم يتم العثور على الاشتراك.');

                const { data: plan, error: planError } = await supabase
                    .from('subscription_plans')
                    .select('duration_months')
                    .eq('id', subscription.plan_id)
                    .single();

                if (planError) throw planError;
                if (!plan) throw new Error('تفاصيل الخطة غير متوفرة.');

                const startDate = new Date();
                const endDate = new Date(startDate);
                endDate.setMonth(startDate.getMonth() + plan.duration_months);

                const { error: updateError } = await supabase
                    .from('subscriptions')
                    .update({
                        status: 'active',
                        start_date: startDate.toISOString(),
                        end_date: endDate.toISOString(),
                    })
                    .eq('id', subscriptionId);

                if (updateError) throw updateError;

                successCount++;
                console.log(`✅ تم تفعيل الاشتراك: ${subscriptionId}`);

            } catch (error) {
                console.error(`❌ فشل تفعيل الاشتراك ${subscriptionId}:`, error);
                errorCount++;
            }
        }

        if (successCount > 0 && errorCount === 0) {
            showAlert(`✅ تم تفعيل ${successCount} اشتراك بنجاح`, 'success');
        } else if (successCount > 0 && errorCount > 0) {
            showAlert(`⚠️ تم تفعيل ${successCount} اشتراك (${errorCount} فشل)`, 'warning');
        } else {
            showAlert('❌ فشل في تفعيل أي اشتراك', 'danger');
        }

        await Promise.all([
            loadDashboardStats(),
            loadPendingSubscriptions(),
            loadAllSubscriptions()
        ]);

    } catch (error) {
        console.error('❌ خطأ في تفعيل الاشتراكات:', error);
        showAlert(`فشل في تفعيل الاشتراكات: ${error.message}`, 'danger');
    }
}

async function cancelAllPendingSubscriptions() {
    try {
        console.log('🔄 بدء إلغاء جميع الاشتراكات المعلقة المحددة...');

        const selectedCheckboxes = document.querySelectorAll('#pending-subscriptions-table .subscription-checkbox:checked');

        if (selectedCheckboxes.length === 0) {
            showAlert('يرجى تحديد طلبات الاشتراك المراد إلغاؤها.', 'warning');
            return;
        }

        const confirmed = await new Promise((resolve) => {
            showCustomConfirm(
                `هل أنت متأكد من إلغاء وحذف ${selectedCheckboxes.length} طلب اشتراك نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`,
                'danger',
                () => resolve(true),
                () => resolve(false)
            );
        });

        if (!confirmed) return;

        showAlert('جاري إلغاء الاشتراكات...', 'info');

        let successCount = 0;
        let errorCount = 0;

        for (const checkbox of selectedCheckboxes) {
            const subscriptionId = checkbox.closest('tr').dataset.id;

            try {
                const { error: deleteError } = await supabase
                    .from('subscriptions')
                    .delete()
                    .eq('id', subscriptionId);

                if (deleteError) throw deleteError;

                successCount++;
                console.log(`✅ تم حذف الاشتراك: ${subscriptionId}`);

            } catch (error) {
                console.error(`❌ فشل حذف الاشتراك ${subscriptionId}:`, error);
                errorCount++;
            }
        }

        if (successCount > 0 && errorCount === 0) {
            showAlert(`🗑️ تم حذف ${successCount} اشتراك نهائياً`, 'success');
        } else if (successCount > 0 && errorCount > 0) {
            showAlert(`⚠️ تم حذف ${successCount} اشتراك (${errorCount} فشل)`, 'warning');
        } else {
            showAlert('❌ فشل في حذف أي اشتراك', 'danger');
        }

        await Promise.all([
            loadDashboardStats(),
            loadPendingSubscriptions(),
            loadAllSubscriptions()
        ]);

    } catch (error) {
        console.error('❌ خطأ في إلغاء الاشتراكات:', error);
        showAlert(`فشل في إلغاء الاشتراكات: ${error.message}`, 'danger');
    }
}

async function cleanAllDuplicateSubscriptions() {
    try {
        console.log('🧹 بدء تنظيف جميع الطلبات المكررة...');

        // الحصول على جميع المستخدمين الذين لديهم طلبات مكررة
        const { data: duplicateUsers, error: fetchError } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('status', 'pending')
            .group('user_id')
            .having('COUNT(*)', '>', 1);

        if (fetchError) throw fetchError;

        if (!duplicateUsers || duplicateUsers.length === 0) {
            showAlert('لا توجد طلبات مكررة لتنظيفها', 'info');
            return;
        }

        const confirmed = await new Promise((resolve) => {
            showCustomConfirm(
                `هل أنت متأكد من تنظيف جميع الطلبات المكررة لـ ${duplicateUsers.length} مستخدم؟ سيتم الاحتفاظ بالطلب الأحدث فقط لكل مستخدم.`,
                'warning',
                () => resolve(true),
                () => resolve(false)
            );
        });

        if (!confirmed) return;

        showAlert('جاري تنظيف الطلبات المكررة...', 'info');

        let totalCleaned = 0;
        let errorCount = 0;

        for (const user of duplicateUsers) {
            try {
                await cleanDuplicateSubscriptions(user.user_id);
                totalCleaned++;
            } catch (error) {
                console.error(`❌ فشل تنظيف المكررة للمستخدم ${user.user_id}:`, error);
                errorCount++;
            }
        }

        if (totalCleaned > 0 && errorCount === 0) {
            showAlert(`✅ تم تنظيف الطلبات المكررة لـ ${totalCleaned} مستخدم`, 'success');
        } else if (totalCleaned > 0 && errorCount > 0) {
            showAlert(`⚠️ تم تنظيف ${totalCleaned} مستخدم (${errorCount} فشل)`, 'warning');
        } else {
            showAlert('❌ فشل في تنظيف أي طلبات مكررة', 'danger');
        }

        await Promise.all([
            loadDashboardStats(),
            loadPendingSubscriptions(),
            loadAllSubscriptions()
        ]);

    } catch (error) {
        console.error('❌ خطأ في تنظيف جميع الطلبات المكررة:', error);
        showAlert(`فشل في تنظيف الطلبات المكررة: ${error.message}`, 'danger');
    }
}

async function showSubscriptionDetails(subscriptionId) {
  try {
    console.log('🔍 جاري عرض تفاصيل الاشتراك:', subscriptionId);

    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        users:user_id (full_name, email, phone, created_at),
        subscription_plans:plan_id (name, name_ar, price_egp, duration_months, features)
      `)
      .eq('id', subscriptionId)
      .single();

    if (fetchError) {
      console.error('❌ خطأ في جلب تفاصيل الاشتراك:', fetchError);
      throw fetchError;
    }

    if (!subscription) {
      throw new Error('لم يتم العثور على الاشتراك');
    }

    const overlay = document.createElement('div');
    overlay.className = 'details-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      z-index: 3000;
      display: flex;
      justify-content: center;
      align-items: center;
      animation: fadeIn 0.3s ease;
    `;

    const detailsModal = document.createElement('div');
    detailsModal.className = 'details-modal';
    detailsModal.style.cssText = `
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      border-radius: 20px;
      padding: 30px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      position: relative;
      animation: modalScale 0.3s ease forwards;
    `;

    const headerBar = document.createElement('div');
    headerBar.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(90deg, #007965, #00a085);
      border-radius: 20px 20px 0 0;
    `;

    const title = document.createElement('h3');
    title.textContent = 'تفاصيل الاشتراك';
    title.style.cssText = `
      margin: 0 0 25px 0;
      color: #007965;
      font-size: 1.5rem;
      font-weight: 700;
      text-align: center;
      padding-top: 10px;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    `;

    function createDetailItem(label, value, fullWidth = false) {
      const item = document.createElement('div');
      item.className = 'detail-item';
      item.style.cssText = `
        ${fullWidth ? 'grid-column: 1 / -1;' : ''}
        padding: 15px;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 12px;
        border: 1px solid rgba(0, 121, 101, 0.1);
        transition: all 0.3s ease;
      `;

      const labelEl = document.createElement('div');
      labelEl.className = 'detail-label';
      labelEl.textContent = label;
      labelEl.style.cssText = `
        font-weight: 600;
        color: #666;
        margin-bottom: 8px;
        font-size: 0.9rem;
      `;

      const valueEl = document.createElement('div');
      valueEl.className = 'detail-value';
      valueEl.textContent = value || 'غير محدد';
      valueEl.style.cssText = `
        color: #333;
        font-size: 1rem;
        font-weight: 500;
      `;

      item.appendChild(labelEl);
      item.appendChild(valueEl);

      item.onmouseover = () => {
        item.style.transform = 'translateY(-2px)';
        item.style.boxShadow = '0 8px 25px rgba(0, 121, 101, 0.15)';
      };
      item.onmouseout = () => {
        item.style.transform = 'translateY(0)';
        item.style.boxShadow = 'none';
      };

      return item;
    }

    content.appendChild(createDetailItem('معرف الاشتراك', subscription.id.substring(0, 12) + '...'));
    content.appendChild(createDetailItem('اسم المستخدم', subscription.users?.full_name || 'غير محدد'));
    content.appendChild(createDetailItem('البريد الإلكتروني', subscription.users?.email || 'غير محدد'));
    content.appendChild(createDetailItem('رقم الهاتف', subscription.users?.phone || 'غير محدد'));
    content.appendChild(createDetailItem('خطة الاشتراك', subscription.subscription_plans?.name_ar || subscription.subscription_plans?.name || 'غير محدد'));
    content.appendChild(createDetailItem('السعر', subscription.subscription_plans?.price_egp ? `${subscription.subscription_plans.price_egp} ج.م` : 'غير محدد'));
    content.appendChild(createDetailItem('الحالة', subscription.status || 'غير محدد'));
    content.appendChild(createDetailItem('تاريخ الإنشاء', formatDate(subscription.created_at)));
    content.appendChild(createDetailItem('تاريخ البدء', formatDate(subscription.start_date)));
    content.appendChild(createDetailItem('تاريخ الانتهاء', formatDate(subscription.end_date)));
    content.appendChild(createDetailItem('معرف المعاملة', subscription.transaction_id || 'غير محدد'));

    if (subscription.subscription_plans?.features) {
      const features = Array.isArray(subscription.subscription_plans.features)
        ? subscription.subscription_plans.features
        : JSON.parse(subscription.subscription_plans.features || '[]');

      if (features.length > 0) {
        const featuresText = features.join(' • ');
        content.appendChild(createDetailItem('الميزات', featuresText, true));
      }
    }

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.style.cssText = `
      position: absolute;
      top: 15px;
      right: 15px;
      background: rgba(220, 53, 69, 0.1);
      border: 1px solid #dc3545;
      color: #dc3545;
      border-radius: 50%;
      width: 35px;
      height: 35px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.3s ease;
      z-index: 10;
    `;

    closeBtn.onmouseover = () => {
      closeBtn.style.background = 'rgba(220, 53, 69, 0.2)';
      closeBtn.style.transform = 'scale(1.1)';
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.background = 'rgba(220, 53, 69, 0.1)';
      closeBtn.style.transform = 'scale(1)';
    };

    closeBtn.onclick = () => {
      document.body.removeChild(overlay);
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    };

    detailsModal.appendChild(headerBar);
    detailsModal.appendChild(closeBtn);
    detailsModal.appendChild(title);
    detailsModal.appendChild(content);
    overlay.appendChild(detailsModal);
    document.body.appendChild(overlay);

    console.log('✅ تم عرض تفاصيل الاشتراك بنجاح');

  } catch (error) {
    console.error('❌ خطأ في عرض تفاصيل الاشتراك:', error);
    showAlert(`فشل في عرض تفاصيل الاشتراك: ${error.message}`, 'danger');
  }
}

function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return 'تاريخ غير صالح';
  }
}

async function populateUserData() {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            updateUserDisplay(user);
        } else {
            console.log('No user found in admin populateUserData');
        }

    } catch (error) {
        console.error('Failed to get user data in admin:', error);
    }
}

function updateUserDisplay(user) {
    const userNameEl = document.getElementById('user-name');
    const userInitialEl = document.getElementById('user-initial');
    const userEmailEl = document.getElementById('user-email');
    const userIdEl = document.getElementById('user-id');

    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'مستخدم';

    if (userNameEl) userNameEl.textContent = displayName;
    if (userInitialEl) userInitialEl.textContent = displayName.charAt(0).toUpperCase();
    if (userEmailEl) userEmailEl.textContent = user.email;
    if (userIdEl) userIdEl.textContent = `ID: ${user.id.slice(-7)}`;
}

function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('alert-container');
  if (!alertContainer) return;

  const alert = document.createElement('div');
  alert.className = `alert alert-${type} show`;

  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-check-circle';
  if (type === 'danger') icon = 'fa-exclamation-circle';

  alert.innerHTML = `<i class="fas ${icon}"></i><div class="alert-content">${message}</div>`;

  alertContainer.appendChild(alert);

  if (type === 'danger') {
    alert.style.animation = 'shake 0.5s ease-in-out';
  }

  if (type === 'success') {
    alert.style.animation = 'glow 2s ease-in-out infinite alternate';
  }

  setTimeout(() => {
    alert.classList.remove('show');
    setTimeout(() => alert.remove(), 500);
  }, 5000);
}

function updateCharts(stats) {
    console.log('📊 تحديث المخططات بالبيانات الجديدة:', stats);

    // تحديث المخطط الشريطي
    const barsChart = document.getElementById('bars-chart');
    if (barsChart) {
        const bars = barsChart.querySelectorAll('.chart-bar');
        if (bars.length >= 4) {
            // حساب النسب المئوية بناءً على البيانات
            const totalSubs = stats.pending + stats.active + stats.cancelled + stats.expired;
            const satisfactionRate = totalSubs > 0 ? Math.round((stats.active / totalSubs) * 100) : 0;
            const successRate = stats.completionRate;
            const growthRate = stats.users > 0 ? Math.round((stats.active / stats.users) * 100) : 0;
            const performanceRate = Math.min(100, Math.round((stats.revenue / 1000) * 100)); // افتراضي بناءً على الإيرادات

            const rates = [satisfactionRate, successRate, growthRate, performanceRate];
            const labels = ['الرضا العام', 'معدل النجاح', 'النمو الشهري', 'الأداء'];

            bars.forEach((bar, index) => {
                const fill = bar.querySelector('.bar-fill');
                const label = bar.querySelector('.bar-label');
                const rate = rates[index] || 0;

                if (fill) {
                    fill.style.height = `${rate}%`;
                    fill.style.transition = 'height 0.5s ease';
                }
                if (label) {
                    label.textContent = `${rate}%`;
                }
                bar.setAttribute('data-value', rate);
                bar.setAttribute('data-label', labels[index]);
            });
        }
    }

    // تحديث المخطط الدائري
    const pieChart = document.getElementById('pie-chart');
    if (pieChart) {
        const pieSegments = pieChart.querySelectorAll('.pie-segment');
        const pieLegend = pieChart.querySelector('.pie-legend');

        if (pieSegments.length >= 4 && pieLegend) {
            const total = stats.pending + stats.active + stats.cancelled + stats.expired;
            const percentages = total > 0 ? [
                Math.round((stats.active / total) * 100),
                Math.round((stats.pending / total) * 100),
                Math.round((stats.cancelled / total) * 100),
                Math.round((stats.expired / total) * 100)
            ] : [0, 0, 0, 0];

            const colors = ['#007965', '#00a085', '#28a745', '#f39c12'];
            const labels = ['نشط', 'معلق', 'ملغي', 'منتهي'];

            pieSegments.forEach((segment, index) => {
                segment.style.setProperty('--percentage', percentages[index] || 0);
                segment.style.setProperty('--color', colors[index]);
            });

            const legendItems = pieLegend.querySelectorAll('.legend-item');
            legendItems.forEach((item, index) => {
                const colorSpan = item.querySelector('.legend-color');
                const textSpan = item.querySelector('span:last-child');

                if (colorSpan) colorSpan.style.background = colors[index];
                if (textSpan) textSpan.textContent = `${labels[index]} (${percentages[index]}%)`;
            });
        }
    }

    // تحديث المخطط الخطي (بيانات وهمية للأشهر)
    const lineChart = document.getElementById('line-chart');
    if (lineChart) {
        // يمكن تحسين هذا لاحقاً ببيانات حقيقية شهرية
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو'];
        const monthLabels = lineChart.querySelectorAll('.line-labels span');
        monthLabels.forEach((span, index) => {
            if (span && months[index]) {
                span.textContent = months[index];
            }
        });
    }
}

function addNewStatsCards(cancelled, expired, completionRate, pendingRate) {
    const statsContainer = document.querySelector('.stats-container');
    if (!statsContainer) return;

    // إزالة البطاقات الإضافية القديمة إن وجدت
    const existingNewCards = statsContainer.querySelectorAll('.new-stat-card');
    existingNewCards.forEach(card => card.remove());

    // إضافة بطاقات إحصائيات جديدة
    const newCardsHtml = `
        <div class="stat-card new-stat-card">
            <div class="stat-icon"><i class="fas fa-ban"></i></div>
            <div class="stat-content">
                <h3>اشتراكات ملغية</h3>
                <p class="stat-value" id="cancelled-subscriptions">${cancelled}</p>
                <div class="stat-trend neutral">
                    <i class="fas fa-ban"></i>
                    <span>تم الإلغاء</span>
                </div>
            </div>
        </div>
        <div class="stat-card new-stat-card">
            <div class="stat-icon"><i class="fas fa-clock"></i></div>
            <div class="stat-content">
                <h3>اشتراكات منتهية</h3>
                <p class="stat-value" id="expired-subscriptions">${expired}</p>
                <div class="stat-trend warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>انتهت الصلاحية</span>
                </div>
            </div>
        </div>
        <div class="stat-card new-stat-card">
            <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
            <div class="stat-content">
                <h3>معدل الإنجاز</h3>
                <p class="stat-value" id="completion-rate">${completionRate}%</p>
                <div class="stat-trend positive">
                    <i class="fas fa-arrow-up"></i>
                    <span>من إجمالي الطلبات</span>
                </div>
            </div>
        </div>
        <div class="stat-card new-stat-card">
            <div class="stat-icon"><i class="fas fa-hourglass-half"></i></div>
            <div class="stat-content">
                <h3>معدل الانتظار</h3>
                <p class="stat-value" id="pending-rate">${pendingRate}%</p>
                <div class="stat-trend neutral">
                    <i class="fas fa-clock"></i>
                    <span>قيد المراجعة</span>
                </div>
            </div>
        </div>
    `;

    statsContainer.insertAdjacentHTML('beforeend', newCardsHtml);
}

function setupChartControls() {
    const chartToggles = document.querySelectorAll('.chart-toggle');
    const charts = document.querySelectorAll('.simple-chart, .pie-chart, .line-chart');

    chartToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const chartType = toggle.getAttribute('data-chart');

            // إزالة الفئة النشطة من جميع الأزرار
            chartToggles.forEach(btn => btn.classList.remove('active'));

            // إضافة الفئة النشطة للزر المحدد
            toggle.classList.add('active');

            // إخفاء جميع المخططات
            charts.forEach(chart => chart.classList.remove('active'));

            // إظهار المخطط المحدد
            const targetChart = document.getElementById(`${chartType}-chart`);
            if (targetChart) {
                targetChart.classList.add('active');
            }
        });
    });
}

function updateSelectedCount() {
    const selectedCount = document.querySelectorAll('#pending-subscriptions-table .subscription-checkbox:checked').length;
    const selectedCountEl = document.getElementById('selected-count');
    const tableStatsEl = document.querySelector('.table-stats');

    console.log('🔍 تحديث عدد المحدد:', {
        selectedCount: selectedCount,
        selectedCountEl: selectedCountEl,
        tableStatsEl: tableStatsEl,
        tableStatsComputedStyle: tableStatsEl ? window.getComputedStyle(tableStatsEl) : null,
        selectedCountComputedStyle: selectedCountEl ? window.getComputedStyle(selectedCountEl) : null,
        timestamp: new Date().toISOString()
    });

    if (selectedCountEl) {
        selectedCountEl.textContent = selectedCount;
        selectedCountEl.style.fontWeight = selectedCount > 0 ? '800' : '600';
        selectedCountEl.style.color = selectedCount > 0 ? '#007965' : '#666';

        console.log('✅ تم تحديث النص:', {
            newText: selectedCountEl.textContent,
            fontWeight: selectedCountEl.style.fontWeight,
            color: selectedCountEl.style.color,
            boundingRect: selectedCountEl.getBoundingClientRect(),
            timestamp: new Date().toISOString()
        });
    }

    if (tableStatsEl) {
        console.log('📊 حالة عنصر الإحصائيات:', {
            textContent: tableStatsEl.textContent,
            innerHTML: tableStatsEl.innerHTML,
            className: tableStatsEl.className,
            boundingRect: tableStatsEl.getBoundingClientRect(),
            computedStyle: {
                fontSize: window.getComputedStyle(tableStatsEl).fontSize,
                lineHeight: window.getComputedStyle(tableStatsEl).lineHeight,
                textTransform: window.getComputedStyle(tableStatsEl).textTransform,
                letterSpacing: window.getComputedStyle(tableStatsEl).letterSpacing,
                whiteSpace: window.getComputedStyle(tableStatsEl).whiteSpace,
                direction: window.getComputedStyle(tableStatsEl).direction
            },
            timestamp: new Date().toISOString()
        });
    }
}

function updateSelectAllState() {
    const checkboxes = document.querySelectorAll('#pending-subscriptions-table .subscription-checkbox');
    const selectAllCheckbox = document.getElementById('select-all');

    if (!checkboxes.length) return;

    const checkedCount = document.querySelectorAll('#pending-subscriptions-table .subscription-checkbox:checked').length;
    const totalCount = checkboxes.length;

    selectAllCheckbox.checked = checkedCount === totalCount;
    selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < totalCount;

    console.log('🔍 تحديث حالة تحديد الكل:', {
        checkboxesCount: checkboxes.length,
        checkedCount: checkedCount,
        totalCount: totalCount,
        selectAllChecked: selectAllCheckbox.checked,
        selectAllIndeterminate: selectAllCheckbox.indeterminate,
        selectAllElement: selectAllCheckbox,
        selectAllComputedStyle: selectAllCheckbox ? window.getComputedStyle(selectAllCheckbox) : null,
        timestamp: new Date().toISOString()
    });
}

function updateTotalSubscriptionsCount() {
    const rows = document.querySelectorAll('#all-subscriptions-table tbody tr');
    const countEl = document.getElementById('total-subscriptions-count');
    const tableStatsEl = document.getElementById('total-subscriptions-count').closest('.table-stats');

    console.log('🔍 تحديث إجمالي الاشتراكات:', {
        rowsCount: rows.length,
        countEl: countEl,
        tableStatsEl: tableStatsEl,
        countElComputedStyle: countEl ? window.getComputedStyle(countEl) : null,
        tableStatsComputedStyle: tableStatsEl ? window.getComputedStyle(tableStatsEl) : null,
        timestamp: new Date().toISOString()
    });

    if (countEl) {
        countEl.textContent = rows.length;

        console.log('✅ تم تحديث النص الإجمالي:', {
            newText: countEl.textContent,
            boundingRect: countEl.getBoundingClientRect(),
            timestamp: new Date().toISOString()
        });
    }
}




function toggleNoData(selector) {
    const table = document.querySelector(selector);
    const tbody = table.querySelector('tbody');
    const noDataEl = table.nextElementSibling;

    if (tbody.children.length === 0) {
        noDataEl.style.display = 'block';
    } else {
        noDataEl.style.display = 'none';
    }
}

function showCustomConfirm(message, type = 'warning', onConfirm, onCancel) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(5px);
    z-index: 2000;
    display: flex;
    justify-content: center;
    align-items: center;
    animation: fadeIn 0.3s ease;
  `;

  const confirmModal = document.createElement('div');
  confirmModal.className = `confirm-modal confirm-${type}`;
  confirmModal.style.cssText = `
    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
    border-radius: 20px;
    padding: 30px;
    max-width: 450px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    border: 2px solid rgba(255, 255, 255, 0.2);
    transform: scale(0.8);
    animation: modalScale 0.3s ease forwards;
    position: relative;
    overflow: hidden;
  `;

  const headerBar = document.createElement('div');
  headerBar.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6px;
    background: linear-gradient(90deg, #007965, #00a085);
  `;

  if (type === 'danger') {
    headerBar.style.background = 'linear-gradient(90deg, #dc3545, #fd7e14)';
  } else if (type === 'success') {
    headerBar.style.background = 'linear-gradient(90deg, #28a745, #20c997)';
  }

  let iconClass = 'fa-exclamation-triangle';
  if (type === 'success') iconClass = 'fa-check-circle';
  if (type === 'danger') iconClass = 'fa-exclamation-circle';

  const iconElement = document.createElement('div');
  iconElement.innerHTML = `<i class="fas ${iconClass}" style="
    font-size: 3rem;
    color: ${type === 'danger' ? '#dc3545' : type === 'success' ? '#28a745' : '#007965'};
    background: rgba(255, 255, 255, 0.3);
    padding: 20px;
    border-radius: 50%;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    margin-bottom: 20px;
    display: inline-block;
  "></i>`;

  const messageElement = document.createElement('div');
  messageElement.style.cssText = `
    font-size: 1.1rem;
    color: #333;
    text-align: center;
    margin-bottom: 30px;
    line-height: 1.6;
    font-weight: 500;
  `;

  if (!message) {
    messageElement.style.display = 'none';
  } else {
    messageElement.textContent = message;
  }

  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.cssText = `
    display: flex;
    gap: 15px;
    justify-content: center;
  `;

  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'إلغاء';
  cancelButton.style.cssText = `
    padding: 12px 30px;
    border: 2px solid #6c757d;
    background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
    color: white;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 1rem;
  `;

  const confirmButton = document.createElement('button');
  let confirmText = 'تأكيد';
  let confirmColor = '#007965';
  let confirmBg = 'linear-gradient(135deg, #007965 0%, #00a085 100%)';

  if (type === 'danger') {
    confirmText = 'حذف';
    confirmColor = '#dc3545';
    confirmBg = 'linear-gradient(135deg, #dc3545 0%, #fd7e14 100%)';
  } else if (type === 'success') {
    confirmText = 'تفعيل';
    confirmColor = '#28a745';
    confirmBg = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
  }

  confirmButton.textContent = confirmText;
  confirmButton.style.cssText = `
    padding: 12px 30px;
    border: 2px solid ${confirmColor};
    background: ${confirmBg};
    color: white;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 1rem;
    box-shadow: 0 4px 15px rgba(0, 121, 101, 0.3);
  `;

  cancelButton.onmouseover = () => {
    cancelButton.style.transform = 'translateY(-2px)';
    cancelButton.style.boxShadow = '0 6px 20px rgba(108, 117, 125, 0.4)';
  };
  cancelButton.onmouseout = () => {
    cancelButton.style.transform = 'translateY(0)';
    cancelButton.style.boxShadow = 'none';
  };

  confirmButton.onmouseover = () => {
    confirmButton.style.transform = 'translateY(-2px)';
    confirmButton.style.boxShadow = `0 6px 20px ${type === 'danger' ? 'rgba(220, 53, 69, 0.4)' : type === 'success' ? 'rgba(40, 167, 69, 0.4)' : 'rgba(0, 121, 101, 0.4)'}`;
  };
  confirmButton.onmouseout = () => {
    confirmButton.style.transform = 'translateY(0)';
    confirmButton.style.boxShadow = `0 4px 15px ${type === 'danger' ? 'rgba(220, 53, 69, 0.3)' : type === 'success' ? 'rgba(40, 167, 69, 0.3)' : 'rgba(0, 121, 101, 0.3)'}`;
  };

  cancelButton.onclick = () => {
    document.body.removeChild(overlay);
    if (onCancel) onCancel();
  };

  confirmButton.onclick = () => {
    document.body.removeChild(overlay);
    if (onConfirm) onConfirm();
  };

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
      if (onCancel) onCancel();
    }
  };

  buttonsContainer.appendChild(cancelButton);
  buttonsContainer.appendChild(confirmButton);

  confirmModal.appendChild(headerBar);
  confirmModal.appendChild(iconElement);
  confirmModal.appendChild(messageElement);
  confirmModal.appendChild(buttonsContainer);

  overlay.appendChild(confirmModal);
  document.body.appendChild(overlay);

  if (type === 'danger') {
    setTimeout(() => {
      confirmModal.style.animation = 'shake 0.5s ease-in-out';
    }, 300);
  }
}
