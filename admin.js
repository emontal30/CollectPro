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

  // عرض تنبيه للمستخدم
  showAlert(`حدث خطأ غير متوقع: ${message}`, 'danger');

  // إرسال الخطأ للخدمة الخارجية (يمكن إضافة لاحقاً)
  // sendErrorToLoggingService(error);

  return false; // منع الخطأ الافتراضي
};

window.addEventListener('unhandledrejection', function(event) {
  console.error('🚨 وعد غير محتمل مرفوض في لوحة التحكم:', {
    reason: event.reason,
    promise: event.promise,
    timestamp: new Date().toISOString(),
    stack: event.reason?.stack,
    message: event.reason?.message
  });

  // عرض تنبيه للمستخدم
  showAlert(`حدث خطأ في النظام: ${event.reason?.message || 'خطأ غير معروف'}`, 'danger');

  // منع انتشار الخطأ
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

// مراقبة أخطاء Supabase
window.addEventListener('supabase-error', function(event) {
  console.error('🚨 خطأ Supabase في لوحة التحكم:', {
    error: event.detail,
    timestamp: new Date().toISOString(),
    context: 'admin-dashboard'
  });
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

// دالة لتسجيل أخطاء الشبكة
function logNetworkError(operation, error, context = {}) {
  console.error('🌐 خطأ شبكة في لوحة التحكم:', {
    operation: operation,
    error: error,
    message: error?.message,
    status: error?.status,
    statusText: error?.statusText,
    url: error?.url,
    context: context,
    timestamp: new Date().toISOString(),
    online: navigator.onLine,
    connection: navigator.connection?.effectiveType || 'unknown'
  });
}

// دالة لتسجيل أخطاء DOM
function logDOMError(operation, error, context = {}) {
  console.error('🎨 خطأ DOM في لوحة التحكم:', {
    operation: operation,
    error: error,
    message: error?.message,
    element: context.element,
    selector: context.selector,
    context: context,
    timestamp: new Date().toISOString()
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

  // تحذير إذا كانت العملية بطيئة
  if (duration > 5000) {
    console.warn('🐌 عملية بطيئة جداً في لوحة التحكم:', {
      operation: operation,
      duration: `${duration.toFixed(2)}ms`,
      threshold: '5000ms',
      timestamp: new Date().toISOString()
    });
  }
}

// مراقبة تحميل الصفحة
document.addEventListener('readystatechange', function() {
  console.log('📄 حالة تحميل الصفحة:', document.readyState);
});

// مراقبة أخطاء JavaScript
window.addEventListener('error', function(event) {
  console.error('🚨 خطأ JavaScript في لوحة التحكم:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    timestamp: new Date().toISOString()
  });
});

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 بدء تحميل صفحة لوحة التحكم...');

  // Update footer year
  const yearSpanElements = document.querySelectorAll('.footer p span#year');
  const currentYear = new Date().getFullYear();
  yearSpanElements.forEach(span => {
    span.textContent = currentYear;
  });

  // Ensure footer is visible without forcefully overriding global layout styles
  const footer = document.getElementById('footer');
  if (footer) {
    // Apply minimal, non-destructive inline styles. Prefer CSS rules in stylesheet instead.
    footer.style.display = footer.style.display || 'block';
    footer.style.visibility = footer.style.visibility || 'visible';
    footer.style.padding = footer.style.padding || '12px 10px';
    footer.style.backgroundColor = footer.style.backgroundColor || '#007965';
    footer.style.color = footer.style.color || 'white';
    footer.style.textAlign = footer.style.textAlign || 'center';

    // Append to body only if missing; do not alter body or main layout styles here.
    const body = document.body;
    if (footer.parentNode !== body) {
      body.appendChild(footer);
    }

    console.log('Footer ensured (minimal inline styles applied)');
  } else {
    console.warn('Footer element not found in the DOM');
  }


  // المصدر الموحد لمعلومات الخطط
  const PLAN_DETAILS = {
    'price_1PgEU9RpN92qb2qTu219Z9G7': { name: 'خطة شهرية', price: 30, durationMonths: 1 },
    'price_1PgEUzRpN92qb2qT52L0kY5p': { name: 'خطة ربع سنوية', price: 80, durationMonths: 3 },
    'price_1PgEVKRpN92qb2qT7gYIEN1M': { name: 'خطة سنوية', price: 300, durationMonths: 12 }
  };

  console.log('🔐 التحقق من صلاحيات المدير...');
  await checkAdminAccess();

  console.log('👤 تحديث بيانات المستخدم في الشريط الجانبي...');
  await populateUserData();

  // إضافة معالجة أحداث زر التفعيل
  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('activate-subscription')) {
      const subscriptionId = e.target.dataset.subscriptionId;
      await activateSubscription(subscriptionId);
    }
  });

  // تحميل جميع البيانات بالتوازي لتحسين الأداء مع معالجة الأخطاء
  try {
    console.log('📊 تحميل البيانات من قاعدة البيانات...');
    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    await Promise.all([
      loadDashboardStats(PLAN_DETAILS),
      loadPendingSubscriptions(PLAN_DETAILS),
      loadAllSubscriptions(PLAN_DETAILS)
    ]);

    console.log('✅ تم تحميل جميع البيانات بنجاح');
  } catch (error) {
    console.error('❌ فشل في تحميل البيانات:', error);
    showAlert('حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.', 'danger');
  } finally {
    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) loadingIndicator.style.display = 'none';
  }

  // إعداد مستمعي الأحداث باستخدام تفويض الأحداث
  setupEventListeners(PLAN_DETAILS);

  console.log('🎯 تم تحميل صفحة لوحة التحكم بالكامل');
});

async function activateSubscription(subscriptionId, planDetails) {
  try {
    // أولاً، جلب الاشتراك للحصول على plan_id
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('plan_id')
      .eq('id', subscriptionId)
      .single();

    if (fetchError) throw fetchError;
    if (!subscription) throw new Error('لم يتم العثور على الاشتراك.');

    // ثانياً، جلب مدة الخطة من جدول subscription_plans
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

    // ثالثاً، تحديث الاشتراك
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      })
      .eq('id', subscriptionId);

    if (updateError) throw updateError;

    showAlert('تم تفعيل الاشتراك بنجاح!', 'success');

    // أخيراً، إعادة تحميل كل البيانات
    await Promise.all([
        loadDashboardStats(planDetails),
        loadPendingSubscriptions(planDetails),
        loadAllSubscriptions(planDetails)
    ]);

  } catch (error) {
    console.error('Error activating subscription:', error);
    showAlert(`فشل تفعيل الاشتراك: ${error.message}`, 'danger');
  }
}

async function checkAdminAccess() {
   try {
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) {
       window.location.href = 'index.html';
       return;
     }

     // التحقق من صلاحيات المدير بناءً على البريد الإلكتروني بدلاً من قاعدة البيانات
     const adminEmails = ['emontal.33@gmail.com']; // يمكن إضافة المزيد من عناوين البريد الإلكتروني للمديرين
     const isAdmin = adminEmails.includes(user.email);

     if (!isAdmin) {
       document.body.innerHTML = '<h1>غير مصرح لك بالوصول.</h1>';
       setTimeout(() => { window.location.href = 'dashboard.html'; }, 2000);
       throw new Error('User is not an admin.');
     }

     // عرض بيانات المدير باستخدام الدالة المحدثة
     updateUserDisplay(user);

   } catch (error) {
     console.error('Admin access check failed:', error.message);
     // إيقاف تنفيذ أي شيء آخر إذا لم يكن المستخدم مديرًا
     throw error;
   }
}

// --- تحميل البيانات --- //

async function loadDashboardStats(planDetails) {
    const startTime = performance.now();
    try {
        console.log('🔄 جاري تحميل إحصائيات لوحة التحكم...');

        // حساب الإحصائيات مباشرة من الجداول
        const { data: usersCount, error: usersError } = await supabase.from('users').select('id', { count: 'exact', head: true });
        if (usersError) {
            logDatabaseError('loadDashboardStats - users count', usersError, { operation: 'count_users' });
            throw usersError;
        }

        const { data: pendingCount, error: pendingError } = await supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'pending');
        if (pendingError) {
            logDatabaseError('loadDashboardStats - pending count', pendingError, { operation: 'count_pending_subscriptions' });
            throw pendingError;
        }

        const { data: activeCount, error: activeError } = await supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active');
        if (activeError) {
            logDatabaseError('loadDashboardStats - active count', activeError, { operation: 'count_active_subscriptions' });
            throw activeError;
        }

        const { data: revenueData, error: revenueError } = await supabase
            .from('subscriptions')
            .select(`
                subscription_plans:plan_id (
                    price
                )
            `)
            .eq('status', 'active');
        if (revenueError) {
            logDatabaseError('loadDashboardStats - revenue data', revenueError, { operation: 'calculate_revenue' });
            throw revenueError;
        }

        console.log('📊 بيانات الإيرادات المستلمة:', revenueData);

        const totalRevenue = revenueData
            ? revenueData.reduce((sum, sub) => {
                const price = sub?.subscription_plans?.price || 0;
                console.log('💰 حساب الإيراد للاشتراك:', { subscription_id: sub.id, price: price });
                return sum + price;
            }, 0)
            : 0;

        console.log('💰 إجمالي الإيرادات المحسوب:', totalRevenue);

        console.log('📊 إحصائيات محملة:', {
            users: usersCount?.count || 0,
            pending: pendingCount?.count || 0,
            active: activeCount?.count || 0,
            revenue: totalRevenue
        });

        // التحقق من وجود العناصر في DOM
        const totalUsersEl = document.getElementById('total-users');
        const pendingRequestsEl = document.getElementById('pending-requests');
        const activeSubscriptionsEl = document.getElementById('active-subscriptions');
        const totalRevenueEl = document.getElementById('total-revenue');

        if (!totalUsersEl) logDOMError('update stats', new Error('Element not found'), { selector: '#total-users' });
        if (!pendingRequestsEl) logDOMError('update stats', new Error('Element not found'), { selector: '#pending-requests' });
        if (!activeSubscriptionsEl) logDOMError('update stats', new Error('Element not found'), { selector: '#active-subscriptions' });
        if (!totalRevenueEl) logDOMError('update stats', new Error('Element not found'), { selector: '#total-revenue' });

        if (totalUsersEl) totalUsersEl.textContent = usersCount?.count || 0;
        if (pendingRequestsEl) pendingRequestsEl.textContent = pendingCount?.count || 0;
        if (activeSubscriptionsEl) activeSubscriptionsEl.textContent = activeCount?.count || 0;
        if (totalRevenueEl) totalRevenueEl.textContent = `${totalRevenue} ج.م`;

        console.log('✅ تم تحديث إحصائيات لوحة التحكم بنجاح');
        measurePerformance('loadDashboardStats', startTime);
    } catch (error) {
        console.error('❌ خطأ في تحميل إحصائيات لوحة التحكم:', error);
        logDatabaseError('loadDashboardStats - general', error, { operation: 'load_dashboard_stats' });
        showAlert('فشل تحميل إحصائيات لوحة التحكم.', 'danger');
        measurePerformance('loadDashboardStats (failed)', startTime);
    }
}

async function loadPendingSubscriptions(planDetails) {
    const startTime = performance.now();
    try {
        console.log('🔄 جاري تحميل طلبات الاشتراك المعلقة...');

        // استخدام الجداول مباشرة بدلاً من الـ view
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
                    price
                )
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (pendingError) {
            logDatabaseError('loadPendingSubscriptions - fetch data', pendingError, {
                operation: 'select_pending_subscriptions',
                query: 'subscriptions with joins'
            });
            throw pendingError;
        }

        validateData(pendingData, 'loadPendingSubscriptions');
        console.log('📊 تم العثور على', pendingData?.length || 0, 'طلب معلق');

        // تحويل البيانات لتطابق الشكل المتوقع
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
            plan_price: sub?.subscription_plans?.price || 0
        }));

        console.log('✅ تم تنسيق البيانات بنجاح');
        renderTable('#pending-subscriptions-table', formattedData, null, 'لا توجد طلبات قيد المراجعة حاليًا.', true);
        measurePerformance('loadPendingSubscriptions', startTime);
    } catch (error) {
        console.error('❌ خطأ في تحميل طلبات الاشتراك المعلقة:', error);
        logDatabaseError('loadPendingSubscriptions - general', error, { operation: 'load_pending_subscriptions' });
        showAlert('فشل تحميل طلبات الاشتراك المعلقة.', 'danger');
        renderTable('#pending-subscriptions-table', [], error, 'حدث خطأ أثناء تحميل البيانات.', true);
        measurePerformance('loadPendingSubscriptions (failed)', startTime);
    }
}

async function loadAllSubscriptions(planDetails = {}) {
    const startTime = performance.now();
    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    try {
        console.log('🔄 جاري تحميل جميع الاشتراكات...');

        const statusFilterElement = document.getElementById('status-filter');
        if (!statusFilterElement) {
            logDOMError('loadAllSubscriptions', new Error('Filter element not found'), { selector: '#status-filter' });
            console.warn('عنصر الفلتر غير موجود في الصفحة');
        }
        const statusFilter = statusFilterElement?.value || 'all';

        if (!supabase) {
            throw new Error('لم يتم تهيئة الاتصال بقاعدة البيانات');
        }

        // بناء الاستعلام الأساسي
        let query = supabase
            .from('subscriptions')
            .select(`
                *,
                users:user_id (full_name, email),
                subscription_plans:plan_id (name, name_ar, price)
            `);

        // إضافة فلتر الحالة إذا لم يكن "الكل"
        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
            console.log('🔍 تطبيق فلتر الحالة:', statusFilter);
        }

        // تنفيذ الاستعلام مع الترتيب
        let { data: viewData, error: viewError } = await query.order('created_at', { ascending: false });

        if (viewError) {
            logDatabaseError('loadAllSubscriptions - fetch data', viewError, {
                operation: 'select_all_subscriptions',
                filter: statusFilter,
                query: 'subscriptions with joins and filter'
            });
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
            plan_price: sub?.subscription_plans?.price || 0
        }));

        console.log('✅ تم تنسيق البيانات بنجاح');
        // عرض البيانات التي تم جلبها مباشرة بعد تنسيقها
        renderTable('#all-subscriptions-table', formattedData, null, 'لا توجد اشتراكات تطابق هذا الفلتر.', false);
        measurePerformance('loadAllSubscriptions', startTime);

    } catch (error) {
        console.error('❌ خطأ في تحميل الاشتراكات:', error);
        logDatabaseError('loadAllSubscriptions - general', error, {
            operation: 'load_all_subscriptions',
            filter: statusFilter
        });
        showAlert(`فشل تحميل قائمة الاشتراكات: ${error.message || 'خطأ غير معروف'}`, 'danger');
        renderTable('#all-subscriptions-table', [], error, 'حدث خطأ أثناء تحميل البيانات.', false);
        measurePerformance('loadAllSubscriptions (failed)', startTime);
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
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

    // استخدام البيانات من admin_subscriptions_view
    const planName = sub.plan_name_ar || sub.plan_name || 'خطة غير معروفة';

    let rowContent = `
      <td>${(sub.user_id || '').substring(0, 12)}...</td>
        <td>${sub.user_name || 'غير محدد'}</td>
        <td>${sub.email || 'غير متوفر'}</td>
        <td>${planName}</td>
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
        showCustomConfirm('هل أنت متأكد من تفعيل هذا الاشتراك؟', 'success', () => {
            activateSubscription(subscriptionId, planDetails);
        });
    } else if (target.classList.contains('reject')) {
        showCustomConfirm('هل أنت متأكد من رفض هذا الاشتراك؟ سيتم حذفه نهائياً.', 'danger', () => {
            cancelSubscription(subscriptionId, planDetails);
        });
    } else if (target.classList.contains('details')) {
        showSubscriptionDetails(subscriptionId, planDetails);
    }
}


// --- إجراءات الاشتراك (تفعيل، إلغاء) --- //

async function activateSubscription(subscriptionId, planDetails) {
  try {
    // أولاً، جلب الاشتراك للحصول على plan_id
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('plan_id')
      .eq('id', subscriptionId)
      .single();

    if (fetchError) throw fetchError;
    if (!subscription) throw new Error('لم يتم العثور على الاشتراك.');

    // ثانياً، جلب مدة الخطة من جدول subscription_plans
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

    // ثالثاً، تحديث الاشتراك
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      })
      .eq('id', subscriptionId);

    if (updateError) throw updateError;

    showAlert('تم تفعيل الاشتراك بنجاح!', 'success');
    
    // أخيراً، إعادة تحميل كل البيانات
    await Promise.all([
        loadDashboardStats(planDetails), 
        loadPendingSubscriptions(planDetails), 
        loadAllSubscriptions(planDetails)
    ]);

  } catch (error) {
    console.error('Error activating subscription:', error);
    showAlert(`فشل تفعيل الاشتراك: ${error.message}`, 'danger');
  }
}

async function cancelSubscription(subscriptionId, planDetails) {
    try {
        const { error } = await supabase
            .from('subscriptions')
            .delete()
            .eq('id', subscriptionId);

        if (error) throw error;

        showAlert('تم رفض وحذف طلب الاشتراك بنجاح.', 'success');
        
        // إعادة تحميل البيانات
        await Promise.all([
            loadDashboardStats(planDetails), 
            loadPendingSubscriptions(planDetails), 
            loadAllSubscriptions(planDetails)
        ]);

    } catch (error) {
        console.error('Error rejecting subscription:', error);
        showAlert(`فشل رفض طلب الاشتراك: ${error.message}`, 'danger');
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

async function populateUserData() {
    try {
        // جلب بيانات المستخدم من Supabase مباشرة مثل صفحة اشتراكي
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

    // جلب اسم المستخدم من user_metadata أو البريد الإلكتروني كبديل
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

  // إضافة تأثير الاهتزاز للتنبيهات الخطيرة
  if (type === 'danger') {
    alert.style.animation = 'shake 0.5s ease-in-out';
  }

  // إضافة تأثير التلألؤ للنجاح
  if (type === 'success') {
    alert.style.animation = 'glow 2s ease-in-out infinite alternate';
  }

  setTimeout(() => {
    alert.classList.remove('show');
    setTimeout(() => alert.remove(), 500);
  }, 5000);
}

// نافذة تأكيد مخصصة احترافية
function showCustomConfirm(message, type = 'warning', onConfirm) {
  // إنشاء overlay
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

  // إنشاء نافذة التأكيد
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

  // شريط علوي ملون
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

  // أيقونة التحذير
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

  // رسالة التأكيد
  const messageElement = document.createElement('div');
  messageElement.style.cssText = `
    font-size: 1.1rem;
    color: #333;
    text-align: center;
    margin-bottom: 30px;
    line-height: 1.6;
    font-weight: 500;
  `;

  // Duplicate post-try rendering removed — rendering and filtering already handled inside try/catch above
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

  // إضافة تأثيرات التمرير
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

  // إضافة وظائف الأزرار
  cancelButton.onclick = () => {
    document.body.removeChild(overlay);
  };

  confirmButton.onclick = () => {
    document.body.removeChild(overlay);
    if (onConfirm) onConfirm();
  };

  // إضافة وظائف تبديل المخططات
  document.querySelectorAll('.chart-toggle').forEach(btn => {
    btn.addEventListener('click', function() {
      const chartType = this.dataset.chart;

      // إزالة الفئة النشطة من جميع الأزرار
      document.querySelectorAll('.chart-toggle').forEach(b => b.classList.remove('active'));
      // إضافة الفئة النشطة للزر المحدد
      this.classList.add('active');

      // إخفاء جميع المخططات
      document.querySelectorAll('.simple-chart, .pie-chart, .line-chart').forEach(chart => {
        chart.classList.remove('active');
      });

      // إظهار المخطط المحدد
      const targetChart = document.getElementById(chartType + '-chart');
      if (targetChart) {
        targetChart.classList.add('active');
      }
    });
  });

  // إغلاق عند النقر خارج النافذة
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  };

  // تجميع العناصر
  buttonsContainer.appendChild(cancelButton);
  buttonsContainer.appendChild(confirmButton);

  confirmModal.appendChild(headerBar);
  confirmModal.appendChild(iconElement);
  confirmModal.appendChild(messageElement);
  confirmModal.appendChild(buttonsContainer);

  overlay.appendChild(confirmModal);
  document.body.appendChild(overlay);

  // إضافة تأثير الاهتزاز للنوافذ الخطيرة
  if (type === 'danger') {
    setTimeout(() => {
      confirmModal.style.animation = 'shake 0.5s ease-in-out';
    }, 300);
  }
}


