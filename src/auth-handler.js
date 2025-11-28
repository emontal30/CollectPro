// auth-handler.js - Handles authentication logic for login page only

window.onerror = function(message, source, lineno, colno, error) {
  console.error("An unhandled error occurred:", {
    message: message,
    source: source,
    lineno: lineno,
    colno: colno,
    error: error
  });
};

window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection:', {
    reason: event.reason
  });
});

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('📱 Service Worker registered successfully:', registration.scope);

        // Handle updates with automatic refresh
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available - notify user and auto refresh
              console.log('📱 New version available. Auto-refreshing...');
              
              // Show update notification
              showUpdateNotification();
              
              // Auto refresh after 3 seconds
              setTimeout(() => {
                window.location.reload();
              }, 3000);
            }
          });
        });
      })
      .catch((error) => {
        console.error('📱 Service Worker registration failed:', error);
      });
  });
}

// Initialize auth logic only on login page
document.addEventListener('DOMContentLoaded', () => {
  // تحقق من أننا في صفحة تسجيل الدخول فقط
  const currentPage = window.location.pathname.split('/').pop();
  const isLoginPage = currentPage === 'index.html' || currentPage === '' || currentPage === '/';
  
  if (!isLoginPage) {
    console.log('📍 Not on login page, skipping auth initialization');
    return;
  }
  
  console.log('🔧 Initializing login page...');

  const googleLoginBtn = document.getElementById('google-login-btn');
  const shareAppBtn = document.getElementById('share-app-btn');
  const installAppBtn = document.getElementById('install-app-btn');

  // إخفاء زر تسجيل الدخول مبدئيًا لمنع الوميض
  if (googleLoginBtn) {
    googleLoginBtn.style.display = 'none';
  }

  // Add loading state to prevent freezing
  document.body.classList.add('loading');
  
  // Set a timeout to prevent infinite loading
  const loadingTimeout = setTimeout(() => {
    document.body.classList.remove('loading');
    if (googleLoginBtn) {
      googleLoginBtn.style.display = 'flex';
    }
    console.warn('⚠️ Loading timeout reached - showing fallback UI');
  }, 8000);

  // محاولة جلب الجلسة الحالية فورًا عند فتح التطبيق
  (async () => {
    try {
      // Check session validity first
      if (window.sessionManager && !window.sessionManager.checkSessionValidity()) {
        console.log('❌ Session expired, showing login');
        clearTimeout(loadingTimeout);
        document.body.classList.remove('loading');
        if (googleLoginBtn) googleLoginBtn.style.display = 'flex';
        return;
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('❌ Error getting current session:', error);
        clearTimeout(loadingTimeout);
        document.body.classList.remove('loading');
        if (googleLoginBtn) googleLoginBtn.style.display = 'flex';
      } else if (session) {
        console.log('✅ Active session found via getSession, syncing profile and redirecting...');
        await syncUserProfile(session.user);
        clearTimeout(loadingTimeout);
        redirectUser(session.user);
        return;
      } else {
        console.log('No active session from getSession, waiting for onAuthStateChange...');
        clearTimeout(loadingTimeout);
        document.body.classList.remove('loading');
      }
    } catch (err) {
      console.error('❌ getSession threw an error:', err);
      clearTimeout(loadingTimeout);
      document.body.classList.remove('loading');
      if (googleLoginBtn) googleLoginBtn.style.display = 'flex';
    }
  })();

  // ضمان عدم بقاء الزر مخفيًا في حال لم يصل أي حدث من Supabase
  setTimeout(() => {
    if (googleLoginBtn && googleLoginBtn.style.display === 'none') {
      console.warn('Auth state did not respond in time. Showing login button fallback.');
      clearTimeout(loadingTimeout);
      document.body.classList.remove('loading');
      googleLoginBtn.style.display = 'flex';
    }
  }, 4000);

  // onAuthStateChange هو المصدر الوحيد للحقيقة
  supabase.auth.onAuthStateChange(async (_event, session) => {
    clearTimeout(loadingTimeout);
    document.body.classList.remove('loading');
    
    if (session) {
      console.log('✅ Active session found, syncing profile...');
      await syncUserProfile(session.user);
      console.log('✅ Profile synced, redirecting...');
      redirectUser(session.user);
    } else {
      console.log('No active session. Showing login UI.');
      if (googleLoginBtn) googleLoginBtn.style.display = 'flex'; 
    }
  });

  // إعداد مستمع النقر على زر تسجيل الدخول
  googleLoginBtn.addEventListener('click', async () => {
    console.log('🔧 Google login button clicked');
    googleLoginBtn.disabled = true;
    googleLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التوجيه...';

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          prompt: 'select_account'
        }
      }
    });

    if (error) {
      console.error('❌ Google login error:', error);
      googleLoginBtn.disabled = false;
      googleLoginBtn.innerHTML = '<i class="fab fa-google"></i> تسجيل الدخول بحساب جوجل';
      alert('فشل تسجيل الدخول: ' + error.message);
    }
  });

  // Share app functionality
  if (shareAppBtn) {
    shareAppBtn.addEventListener('click', async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'CollectPro - تطبيق جمع التحصيلات',
            text: 'تطبيق احترافي لإدارة التحصيلات والاشتراكات',
            url: window.location.href
          });
        } catch (err) {
          console.log('Share cancelled or failed:', err);
        }
      } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
          alert('تم نسخ رابط التطبيق!');
        });
      }
    });
  }

  // Install app functionality
  if (installAppBtn) {
    installAppBtn.addEventListener('click', async () => {
      if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
        const { outcome } = await window.deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        window.deferredPrompt = null;
        installAppBtn.style.display = 'none';
      } else {
        alert('التطبيق مثبت بالفعل أو غير متاح للتثبيت');
      }
    });
  }
});

// Helper functions
async function syncUserProfile(user) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      const full_name = user.user_metadata?.full_name || user.email;
      const { error: insertError } = await supabase.from('users').insert({
        id: user.id,
        full_name: full_name,
        email: user.email,
        password_hash: ''
      });

      if (insertError) {
        console.error('❌ Error inserting user profile:', insertError);
      } else {
        console.log('✅ User profile synced successfully');
      }
    } else if (data) {
      console.log('✅ User profile already exists');
    } else {
      console.error('❌ Error checking user profile:', error);
    }
  } catch (err) {
    console.error('❌ Sync user profile error:', err);
  }
}

async function redirectUser(user) {
    if (!user) return;

    // لا تقم بالتحويل إذا كنا بالفعل في صفحة محددة (غير صفحة تسجيل الدخول)
    const currentPage = window.location.pathname.split('/').pop();
    const isLoginPage = currentPage === 'index.html' || currentPage === '' || currentPage === '/';
    
    // إذا لم نكن في صفحة تسجيل الدخول، لا تقم بالتحويل التلقائي
    if (!isLoginPage) {
        console.log('📍 User is already on a page:', currentPage, '- skipping automatic redirect');
        return;
    }

    console.log('🔍 Checking user role for redirection. User ID:', user.id);

    // التحقق من صلاحيات المدير بناءً على البريد الإلكتروني
    const adminEmails = ['emontal.33@gmail.com'];
    const isAdmin = adminEmails.includes(user.email);

    if (isAdmin) {
      console.log('👑 Admin user detected. Redirecting to dashboard page.');
      window.location.href = 'dashboard.html';
    } else {
      // Check for last page using session manager
      const lastPage = window.sessionManager ? window.sessionManager.getLastPage() : localStorage.getItem('lastPage');
      
      if (lastPage && lastPage !== 'index.html' && lastPage !== '/') {
        console.log('👤 Regular user detected. Redirecting to last page:', lastPage);
        
        try {
          const response = await fetch(lastPage, { method: 'HEAD' });
          if (response.ok) {
            window.location.href = lastPage;
          } else {
            console.warn('⚠️ Last page not accessible, redirecting to dashboard');
            window.location.href = 'dashboard.html';
          }
        } catch (error) {
          console.warn('⚠️ Error checking last page, redirecting to dashboard:', error);
          window.location.href = 'dashboard.html';
        }
      } else {
        console.log('👤 Regular user detected. Redirecting to dashboard page.');
        window.location.href = 'dashboard.html';
      }
    }
}

function showUpdateNotification() {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #007965;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    direction: rtl;
  `;
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <i class="fas fa-download"></i>
      <span>جاري تحديث التطبيق...</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}
