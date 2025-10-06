document.addEventListener('DOMContentLoaded', async () => {

  // --- إنشاء وإضافة طبقة التغطية ---
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  // --- التأكد من وجود زر التبديل وإنشاؤه إذا لزم الأمر ---
  let sidebarToggle = document.getElementById('sidebarToggle');
  if (!sidebarToggle) {
    console.warn('زر التبديل لم يتم العثور عليه في HTML، جاري إنشائه...');
    sidebarToggle = document.createElement('button');
    sidebarToggle.className = 'sidebar-toggle';
    sidebarToggle.id = 'sidebarToggle';
    sidebarToggle.setAttribute('aria-label', 'تبديل القائمة الجانبية');
    sidebarToggle.innerHTML = '<i class="fas fa-bars"></i>';
    document.body.appendChild(sidebarToggle);
  }

  // --- تحديث أيقونة زر التبديل ---
  const updateToggleIcon = () => {
    const icon = sidebarToggle.querySelector('i');
    if (icon) {
      if (document.body.classList.contains('sidebar-collapsed')) {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
      } else {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
      }
    }
  };

  // --- ملء بيانات المستخدم بشكل آمن ---
  const populateSidebarUserData = async () => {
    const userNameEl = document.getElementById('user-name');
    const userInitialEl = document.getElementById('user-initial');
    const userEmailEl = document.getElementById('user-email');
    const userIdEl = document.getElementById('user-id');

    try {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        console.error('خطأ في جلب بيانات المستخدم، أو لا توجد جلسة.', error);
        // يمكنك إعادة توجيه المستخدم لصفحة تسجيل الدخول هنا
        // window.location.href = 'login.html';
        return;
      }

      const { user } = data;
      const fullName = user.user_metadata?.full_name || 'مستخدم';
      const email = user.email;

      if (userNameEl) userNameEl.textContent = fullName;
      if (userInitialEl) userInitialEl.textContent = fullName.charAt(0).toUpperCase();
      if (userEmailEl) userEmailEl.textContent = email;
      if (userIdEl) userIdEl.textContent = `ID: ${user.id.substring(0, 5)}...`;
    
    } catch (e) {
        console.error('حدث خطأ حرج أثناء ملء بيانات المستخدم:', e);
    }
  };

  // --- وظيفة التبديل للشريط الجانبي ---
  // التأكد من أن الجسم يبدأ في حالة مغلق
  document.body.classList.add('sidebar-collapsed');

  if (sidebarToggle && overlay) {
    sidebarToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      document.body.classList.toggle('sidebar-collapsed');
      updateToggleIcon();
    });

    overlay.addEventListener('click', () => {
      document.body.classList.add('sidebar-collapsed');
      updateToggleIcon();
    });
  } else {
    console.error('لم يتم العثور على زر التبديل أو طبقة التغطية.');
  }

  // --- التعامل مع تغيير حجم النافذة ---
  const handleWindowResize = () => {
    if (window.innerWidth <= 768) {
      document.body.classList.add('sidebar-collapsed');
      updateToggleIcon();
    }
  };
  window.addEventListener('resize', handleWindowResize);
  handleWindowResize(); // استدعاء مرة واحدة عند التحميل

  // --- تحديد رابط التنقل النشط ---
  try {
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === currentPage) {
        link.classList.add('active');
      }
    });
  } catch(e) {
      console.warn('لا يمكن تعيين رابط التنقل النشط.', e);
  }

  // --- وظيفة تسجيل الخروج ---
  const logoutButton = document.getElementById('logout-btn');
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      logoutButton.disabled = true;
      logoutButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تسجيل الخروج...';
      
      const { error } = await supabase.auth.signOut();

      if (!error) {
        console.log('تم تسجيل الخروج بنجاح');
        window.location.href = 'login.html'; // وجه إلى صفحة تسجيل الدخول
      } else {
        console.error('فشل تسجيل الخروج:', error.message);
        logoutButton.disabled = false;
        logoutButton.innerHTML = '<i class="fas fa-sign-out-alt"></i><span>تسجيل الخروج</span>';
      }
    });
  }

  // --- الاستدعاءات الأولية ---
  updateToggleIcon();
  await populateSidebarUserData();
});