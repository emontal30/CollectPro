// Sidebar: modern slide-in with user info, nav, subscription meta, and logout
// Reads user from localStorage/sessionStorage ('user') and subscription from localStorage ('subscriptionSummary')
(function () {
  const PAGES = [
    { href: 'index.html', icon: 'fa-home', label: 'ادخال البيانات' },
    { href: 'harvest.html', icon: 'fa-hand-holding-usd', label: 'التحصيل' },
    { href: 'archive.html', icon: 'fa-archive', label: 'الأرشيف' },
    { href: 'subscriptions.html', icon: 'fa-tags', label: 'الاشتراكات' },
    { href: 'my-subscription.html', icon: 'fa-id-card', label: 'اشتراكي' },
    { href: 'admin.html', icon: 'fa-user-shield', label: 'لوحة التحكم' }
  ];

  // Create toggle button
  function ensureToggleButton() {
    if (document.querySelector('.sidebar-toggle')) return;
    const btn = document.createElement('button');
    btn.className = 'sidebar-toggle';
    btn.innerHTML = '<i class="fas fa-bars"></i><span>القائمة</span>';
    btn.addEventListener('click', () => {
      const sb = document.querySelector('.sidebar');
      if (!sb) return;
      const willOpen = !sb.classList.contains('open');
      sb.classList.toggle('open');
      document.body.classList.toggle('sidebar-open', willOpen);
    });
    document.body.appendChild(btn);
  }

  // Create sidebar structure
  function createSidebar() {
    if (document.querySelector('.sidebar')) return;

    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';

    sidebar.innerHTML = `
      <div class="sidebar-header">
        <div class="user-box">
          <div class="user-avatar" id="sb-avatar">U</div>
          <div class="user-meta">
            <div class="user-name" id="sb-name">غير مسجل</div>
            <div class="user-id" id="sb-id">ID: -</div>
          </div>
        </div>
      </div>
      <div class="sidebar-content">
        <ul class="nav-links" id="sb-links"></ul>
      </div>
      <div class="sidebar-footer">
        <div class="sub-meta"><span>نوع الاشتراك:</span><span class="value" id="sb-sub-type">-</span></div>
        <div class="sub-meta"><span>ينتهي في:</span><span class="value" id="sb-sub-exp">-</span></div>
        <button class="logout-btn" id="sb-logout"><i class="fas fa-sign-out-alt"></i> تسجيل الخروج</button>
      </div>
    `;

    document.body.appendChild(sidebar);
  }

  // Read user from storage
  function readUser() {
    try {
      const ls = localStorage.getItem('user');
      const ss = sessionStorage.getItem('user');
      const raw = ls || ss;
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  // Populate header with user data
  function populateUser(user) {
    const nameEl = document.getElementById('sb-name');
    const idEl = document.getElementById('sb-id');
    const avatarEl = document.getElementById('sb-avatar');
    if (!nameEl || !idEl || !avatarEl) return;

    if (user) {
      const name = user.name || user.email || 'مستخدم';
      const id = user.id ?? '-';
      nameEl.textContent = name;
      idEl.textContent = `ID: ${id}`;
      const initials = String(name).trim().charAt(0).toUpperCase() || 'U';
      avatarEl.textContent = initials;
    } else {
      nameEl.textContent = 'غير مسجل';
      idEl.textContent = 'ID: -';
      avatarEl.textContent = 'U';
    }
  }

  // Build nav links
  function buildNav() {
    const ul = document.getElementById('sb-links');
    if (!ul) return;
    ul.innerHTML = '';
    const current = window.location.pathname.split('/').pop() || 'index.html';
    PAGES.forEach(p => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = p.href;
      a.innerHTML = `<i class="fas ${p.icon}"></i><span>${p.label}</span>`;
      if (current === p.href) a.classList.add('active');
      li.appendChild(a);
      ul.appendChild(li);
    });
  }

  // Subscription summary from local storage (fallback). This can be updated by pages that fetch Supabase.
  function readSubscriptionSummary() {
    try {
      const raw = localStorage.getItem('subscriptionSummary');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function populateSubscription(summary) {
    const typeEl = document.getElementById('sb-sub-type');
    const expEl = document.getElementById('sb-sub-exp');
    if (!typeEl || !expEl) return;

    if (summary) {
      typeEl.textContent = summary.planName || summary.plan || '-';
      expEl.textContent = summary.endDate || '-';
    } else {
      typeEl.textContent = '-';
      expEl.textContent = '-';
    }
  }

  // Logout logic: clear storages and go to login
  function setupLogout() {
    const btn = document.getElementById('sb-logout');
    if (!btn) return;
    btn.addEventListener('click', () => {
      // طلب تأكيد من المستخدم قبل تسجيل الخروج
      if (confirm('هل أنت متأكد أنك تريد تسجيل الخروج؟')) {
        try { localStorage.removeItem('user'); } catch (e) {}
        try { sessionStorage.removeItem('user'); } catch (e) {}
        window.location.href = 'login.html';
      }
    });
  }

  // Expose small API so pages can update subscription info after fetching from Supabase
  window.Sidebar = {
    setSubscription(plan, endDate) {
      const planNames = { 'monthly': 'شهري', '3-months': '3 شهور', 'yearly': 'سنوي' };
      const summary = { plan, planName: planNames[plan] || plan, endDate };
      try { localStorage.setItem('subscriptionSummary', JSON.stringify(summary)); } catch (e) {}
      populateSubscription(summary);
    }
  };

  // Init
  function init() {
    ensureToggleButton();
    createSidebar();
    populateUser(readUser());
    buildNav();
    populateSubscription(readSubscriptionSummary());
    setupLogout();

    // Gesture controls: open by swiping from right edge to left, close by swiping inside sidebar to the right
    (function addGestureControls() {
      const EDGE = 20; // px from right edge to start opening
      const OPEN_THRESHOLD = 50; // horizontal px to trigger open
      const CLOSE_THRESHOLD = 50; // horizontal px to trigger close

      const isOpen = () => document.querySelector('.sidebar')?.classList.contains('open');
      const openSidebar = () => { const sb = document.querySelector('.sidebar'); if (sb) { sb.classList.add('open'); document.body.classList.add('sidebar-open'); } };
      const closeSidebar = () => { const sb = document.querySelector('.sidebar'); if (sb) { sb.classList.remove('open'); document.body.classList.remove('sidebar-open'); } };

      // Touch gestures
      let startX = null, startY = null, tracking = null;
      function onTouchStart(e) {
        if (!e.touches || !e.touches[0]) return;
        const t = e.touches[0];
        startX = t.clientX; startY = t.clientY;
        const sb = document.querySelector('.sidebar');
        const rect = sb ? sb.getBoundingClientRect() : { left: window.innerWidth, right: window.innerWidth };
        if (!isOpen() && startX >= window.innerWidth - EDGE) {
          tracking = 'open';
        } else if (isOpen() && startX >= rect.left && startX <= rect.right) {
          tracking = 'close';
        } else {
          tracking = null;
        }
      }
      function onTouchMove(e) {
        if (!tracking || !e.touches || !e.touches[0]) return;
        const t = e.touches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        if (Math.abs(dx) < Math.abs(dy)) return; // ignore mostly vertical
        if (tracking === 'open' && dx <= -OPEN_THRESHOLD) {
          openSidebar();
          tracking = null;
        } else if (tracking === 'close' && dx >= CLOSE_THRESHOLD) {
          closeSidebar();
          tracking = null;
        }
      }
      function onTouchEnd() { tracking = null; }

      document.addEventListener('touchstart', onTouchStart, { passive: true });
      document.addEventListener('touchmove', onTouchMove, { passive: true });
      document.addEventListener('touchend', onTouchEnd, { passive: true });

      // Mouse gestures (desktop)
      let mStartX = null, mStartY = null, mTrack = null;
      document.addEventListener('mousedown', (e) => {
        mStartX = e.clientX; mStartY = e.clientY;
        const sb = document.querySelector('.sidebar');
        const rect = sb ? sb.getBoundingClientRect() : { left: window.innerWidth, right: window.innerWidth };
        if (!isOpen() && mStartX >= window.innerWidth - EDGE) {
          mTrack = 'open';
        } else if (isOpen() && mStartX >= rect.left && mStartX <= rect.right) {
          mTrack = 'close';
        } else {
          mTrack = null;
        }
      });
      document.addEventListener('mousemove', (e) => {
        if (!mTrack) return;
        const dx = e.clientX - mStartX;
        const dy = e.clientY - mStartY;
        if (Math.abs(dx) < Math.abs(dy)) return;
        if (mTrack === 'open' && dx <= -OPEN_THRESHOLD) {
          openSidebar();
          mTrack = null;
        } else if (mTrack === 'close' && dx >= CLOSE_THRESHOLD) {
          closeSidebar();
          mTrack = null;
        }
      });
      document.addEventListener('mouseup', () => { mTrack = null; });
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();