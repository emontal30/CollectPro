const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("toggle-btn");
const overlay = document.getElementById("overlay");

// Function to open the sidebar
const openSidebar = () => {
  if (sidebar) {
    sidebar.classList.add("active");
    sidebar.style.transform = "translateX(0)";
  }
  if (overlay) overlay.classList.add("active");
};

// Function to close the sidebar
const closeSidebar = () => {
  if (sidebar) {
    sidebar.classList.remove("active");
    sidebar.style.transform = "translateX(100%)";
  }
  if (overlay) overlay.classList.remove("active");
};

// Event listeners
if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
        // If sidebar is open, close it. Otherwise, open it.
        if (sidebar && sidebar.classList.contains("active")) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });
}

if (overlay) {
    overlay.addEventListener("click", closeSidebar);
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

// Populate user data in sidebar
async function populateUserData() {
    try {
        // جلب بيانات المستخدم من Supabase مباشرة مثل صفحة اشتراكي
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.log('No user found, trying localStorage as fallback');
            // الرجوع للبيانات المحفوظة محلياً إذا لم يكن المستخدم مسجل دخوله
            const userString = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (!userString) return;

            const userData = JSON.parse(userString);
            updateUserDisplay(userData);
            return;
        }

        // التحقق من وجود اشتراك للمستخدم (لأغراض السجل فقط)
        const { data: existingSubscription, error: subError } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();

        if (subError && subError.code !== 'PGRST116') {
            console.error('Failed to check existing subscription:', subError);
        }

        // لم نعد ننشئ اشتراكاً تجريبياً تلقائياً؛ فقط نحدّث معلومات الاشتراك الحالية أو نعرض عدم وجود اشتراك
        await updateSubscriptionInfo();

        updateUserDisplay(user);

    } catch (error) {
        console.error('Failed to get user data from Supabase, trying localStorage:', error);

        // الرجوع للبيانات المحفوظة محلياً في حالة الخطأ
        const userString = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (!userString) return;

        try {
            const user = JSON.parse(userString);
            updateUserDisplay(user);
        } catch (fallbackError) {
            console.error('Failed to parse user data from storage:', fallbackError);
        }
    }
}

async function updateUserDisplay(user) {
    const userNameEl = document.getElementById('user-name');
    const userEmailEl = document.getElementById('user-email');
    const userIdEl = document.getElementById('user-id');

    // جلب اسم المستخدم من user_metadata أو البريد الإلكتروني كبديل
    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'مستخدم';

    if (userNameEl) userNameEl.textContent = displayName;
    if (userEmailEl) userEmailEl.textContent = user.email;
    if (userIdEl) userIdEl.textContent = `ID: ${user.id.slice(-7)}`;

    // تحديث معلومات الاشتراك
    await updateSubscriptionInfo();
}

// دالة لإنشاء اشتراك تجريبي للمستخدم الجديد
async function createTestSubscription(userId) {
    try {
        console.log('Creating test subscription for user:', userId);

        // إنشاء اشتراك تجريبي لمدة 30 يوم
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 30);

        // أولاً، جلب أول خطة متاحة لاستخدامها كخطة تجريبية
        const { data: firstPlan } = await supabase
            .from('subscription_plans')
            .select('id, name')
            .limit(1)
            .single();

        const planId = firstPlan ? firstPlan.id : null;

        const { data, error } = await supabase
            .from('subscriptions')
            .insert({
                 user_id: userId,
                 plan_id: planId, // استخدام أول خطة متاحة
                 plan_name: 'فترة تجريبية',
                 plan_period: '30 يوم',
                 price: 0,
                 status: 'active',
                 start_date: startDate.toISOString(),
                 end_date: endDate.toISOString(),
                 created_at: new Date().toISOString()
             })
             .select()
             .single();

        if (error) {
            console.error('Error creating test subscription:', error);
        } else {
            console.log('Test subscription created:', data);
            // تحديث العرض بالبيانات الجديدة
            await updateSubscriptionInfo();
        }
    } catch (error) {
        console.error('Error in createTestSubscription:', error);
    }
}

// دالة لتحديث معلومات الاشتراك في الشريط الجانبي
async function updateSubscriptionInfo() {
    const currentPage = window.location.pathname.split('/').pop();
    const subscriptionInfoEl = document.getElementById('subscription-info');

    // إظهار معلومات الاشتراك في جميع الصفحات
    if (subscriptionInfoEl) {
        subscriptionInfoEl.style.display = 'block';
    }

    try {
        console.log('Updating subscription info for my-subscription.html');

        // جلب بيانات المستخدم
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.log('No user found for subscription info');
            const daysLeftEl = document.getElementById('days-left');
            if (daysLeftEl) daysLeftEl.textContent = '0';

            const subscriptionDaysEl = document.querySelector('.subscription-days-simple');
            if (subscriptionDaysEl) {
                subscriptionDaysEl.className = 'subscription-days-simple';
            }
            return;
        }

        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select(`
                end_date,
                status,
                start_date,
                plan_name,
                plan_id,
                subscription_plans (
                    name,
                    name_ar
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        console.log('Subscription data:', subscription, 'Error:', error);

        if (error && error.code !== 'PGRST116') {
            console.error('Supabase query error:', error);
            return;
        }

        const daysLeftEl = document.getElementById('days-left');

        if (!subscription) {
            console.log('No active subscription found');
            if (daysLeftEl) daysLeftEl.textContent = '0';
            if (subscriptionInfoEl) subscriptionInfoEl.style.display = 'block';

            const subscriptionDaysEl = document.querySelector('.subscription-days-simple');
            if (subscriptionDaysEl) {
                subscriptionDaysEl.className = 'subscription-days-simple';
            }
    
            // حفظ القيمة في localStorage للمزامنة مع الصفحات الأخرى
            if (daysLeftEl && daysLeftEl.textContent && daysLeftEl.textContent !== 'يرجى تسجيل الدخول' && daysLeftEl.textContent !== 'لا يوجد اشتراك نشط' && daysLeftEl.textContent !== 'خطأ في تحميل البيانات' && daysLeftEl.textContent !== '∞') {
                localStorage.setItem('sidebarDaysLeft', daysLeftEl.textContent);
            }
            console.log('Subscription info displayed in sidebar');

            // حفظ القيمة في localStorage للمزامنة مع الصفحات الأخرى
            if (daysLeftEl && daysLeftEl.textContent && daysLeftEl.textContent !== 'يرجى تسجيل الدخول' && daysLeftEl.textContent !== 'لا يوجد اشتراك نشط' && daysLeftEl.textContent !== 'خطأ في تحميل البيانات' && daysLeftEl.textContent !== '∞') {
                localStorage.setItem('sidebarDaysLeft', daysLeftEl.textContent);
            }
            return;
        }

        // إظهار معلومات الاشتراك فوراً
        if (subscriptionInfoEl) subscriptionInfoEl.style.display = 'block';

        if (subscription.end_date && subscription.status === 'active') {
            const endDate = new Date(subscription.end_date);
            const today = new Date();
            const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

            console.log('Sidebar - End date:', subscription.end_date, 'Today:', today.toISOString(), 'Days left:', daysLeft);

            if (daysLeftEl) {
                daysLeftEl.textContent = daysLeft > 0 ? daysLeft.toString() : 'انتهى';
            }

            const subscriptionDaysEl = document.querySelector('.subscription-days-simple');
            if (subscriptionDaysEl) {
                subscriptionDaysEl.className = daysLeft > 0 ? 'subscription-days-simple' : 'subscription-days-simple expired';
            }

            // إظهار تنبيهات فقط للاشتراكات النشطة
            if (daysLeft > 0 && daysLeft <= 7) {
                showAlert(`تنبيه: اشتراكك ينتهي خلال ${daysLeft} أيام. يرجى تجديد الاشتراك لتجنب انقطاع الخدمة.`, 'warning');
            } else if (daysLeft <= 0) {
                showAlert('انتهى اشتراكك! يرجى تجديد الاشتراك للاستمرار في استخدام الخدمة.', 'danger');
            }
        } else if (subscription.status === 'pending') {
            // معالجة حالة الاشتراك المعلق
            if (daysLeftEl) {
                daysLeftEl.textContent = 'معلق';
            }

            const subscriptionDaysEl = document.querySelector('.subscription-days-simple');
            if (subscriptionDaysEl) {
                subscriptionDaysEl.className = 'subscription-days-simple pending';
            }

            console.log('Subscription is pending - showing pending status');
        } else {
            // حالات أخرى (ملغي، متوقف، منتهي)
            if (daysLeftEl) {
                daysLeftEl.textContent = 'غير نشط';
            }

            const subscriptionDaysEl = document.querySelector('.subscription-days-simple');
            if (subscriptionDaysEl) {
                subscriptionDaysEl.className = 'subscription-days-simple expired';
            }
        }

        if (subscriptionInfoEl) subscriptionInfoEl.style.display = 'block';

    } catch (error) {
        console.error('Error updating subscription info:', error);
        const daysLeftEl = document.getElementById('days-left');
        if (daysLeftEl) daysLeftEl.textContent = 'خطأ في تحميل البيانات';
    }
}

// دالة للتحقق من وجود اشتراك تجريبي للمستخدم
async function checkForTestSubscription(userId) {
    try {
        console.log('Checking for test subscription for user:', userId);

        // البحث عن اشتراك تجريبي (فترة تجريبية مدتها 30 يوم)
        const { data: testSubscription, error } = await supabase
            .from('subscriptions')
            .select('id, end_date, status, created_at')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (testSubscription && testSubscription.end_date) {
            console.log('Found test subscription:', testSubscription);
            // تحديث العرض بالبيانات الفعلية
            await updateSubscriptionInfo();
        } else {
            console.log('No test subscription found, showing default message');
            const daysLeftEl = document.getElementById('days-left');
            if (daysLeftEl) daysLeftEl.textContent = 'لا يوجد اشتراك نشط';
        }
    } catch (error) {
        console.error('Error checking test subscription:', error);
    }
}

// Add active class to current page link
document.addEventListener('DOMContentLoaded', async () => {
    // تحميل القيمة المحفوظة من localStorage إذا كانت متوفرة
    const savedDaysLeft = localStorage.getItem('sidebarDaysLeft');
    if (savedDaysLeft) {
        const daysLeftEl = document.getElementById('days-left');
        if (daysLeftEl && daysLeftEl.textContent === '-') {
            daysLeftEl.textContent = savedDaysLeft;
        }
    }

    await populateUserData();

    // إخفاء رابط لوحة التحكم إلا للمدير
    await checkAndHideAdminLink();

    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.sidebar .nav-links a');

    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href').split('/').pop();
        if (linkPage === currentPage) {
            link.classList.add('active');
        }

        // Save last page on navigation
        link.addEventListener('click', () => {
            const href = link.getAttribute('href');
            if (href && href !== 'index.html') { // Don't save index.html as last page
                localStorage.setItem('lastPage', href);
            }
        });
    });

    // Add event listener for logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                if (!window.supabase) {
                    console.error('Supabase client is not initialized.');
                    showAlert('خطأ فادح: لم يتم تهيئة Supabase!', 'danger');
                    return;
                }

                // محاولة تسجيل الخروج من Supabase
                const { error } = await supabase.auth.signOut();

                // حتى لو فشل تسجيل الخروج من Supabase، نقوم بتنظيف البيانات المحلية
                if (error) {
                    console.warn('Supabase logout failed, but proceeding with local cleanup:', error.message);
                }

                // تنظيف البيانات المحلية
                localStorage.clear();
                sessionStorage.clear();

                // إعادة توجيه إلى صفحة تسجيل الدخول
                window.location.href = 'index.html';

                showAlert('تم تسجيل الخروج بنجاح!', 'success');

            } catch (err) {
                console.error('Logout error:', err);

                // حتى في حالة الخطأ، نقوم بتنظيف البيانات المحلية وإعادة التوجيه
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = 'index.html';

                showAlert('تم تسجيل الخروج مع تنظيف البيانات المحلية.', 'info');
            }
        });
    }
});

// دالة للتحقق من صلاحية المدير وإخفاء رابط لوحة التحكم
async function checkAndHideAdminLink() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            // إذا لم يكن هناك مستخدم مسجل، إخفاء الرابط
            const adminLink = document.getElementById('admin-link');
            if (adminLink) {
                adminLink.style.display = 'none';
            }
            return;
        }

        // التحقق من وجود المدير في قاعدة البيانات
        const { data: adminUser, error } = await supabase
            .from('admins')
            .select('id, email')
            .eq('email', user.email)
            .single();

        const isAdmin = adminUser && !error;

        const adminLink = document.getElementById('admin-link');
        if (adminLink) {
            if (!isAdmin) {
                adminLink.style.display = 'none';
            } else {
                adminLink.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error checking admin access for sidebar:', error);
        // في حالة الخطأ، إخفاء الرابط للأمان
        const adminLink = document.getElementById('admin-link');
        if (adminLink) {
            adminLink.style.display = 'none';
        }
    }
}