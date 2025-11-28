window.onerror = function(message, source, lineno, colno, error) {
  console.error("An unhandled error occurred:", {
    message: message,
    source: source,
    lineno: lineno,
    colno: colno,
    error: error
  });
  // Here you could send the error to a logging service
};

window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection:', {
    reason: event.reason
  });
  // Here you could send the error to a logging service
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

document.addEventListener('DOMContentLoaded', () => {
  // تحقق من أننا في صفحة تسجيل الدخول فقط
  const currentPage = window.location.pathname.split('/').pop();
  const isLoginPage = currentPage === 'index.html' || currentPage === '' || currentPage === '/';
  
  if (!isLoginPage) {
    console.log('📍 Not on login page, skipping main.js initialization');
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
  }, 8000); // 8 seconds timeout

  // محاولة جلب الجلسة الحالية فورًا عند فتح التطبيق (مثل فتح اختصار PWA من الشاشة الرئيسية)
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
        return; // لا نحتاج لإظهار زر الدخول في هذه الحالة
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

  // ضمان عدم بقاء الزر مخفيًا في حال لم يصل أي حدث من Supabase (حماية من التوقف على شاشة البداية)
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
    // يتم استدعاء هذا عند التحميل الأولي وعندما تتغير حالة المصادقة.
    clearTimeout(loadingTimeout);
    document.body.classList.remove('loading');
    
    if (session) {
      // المستخدم مسجل دخوله.
      console.log('✅ Active session found, syncing profile...');
      await syncUserProfile(session.user);
      console.log('✅ Profile synced, redirecting...');
      redirectUser(session.user);
    } else {
      // المستخدم غير مسجل دخوله.
      console.log('No active session. Showing login UI.');
      // إظهار زر تسجيل الدخول فقط عندما نتأكد من عدم وجود جلسة
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
          prompt: 'select_account' // يجبر جوجل يسألك تختار حساب من جديد
        }
      }
    });

    if (error) {
      console.error('❌ Error initiating Google login:', error.message);
      googleLoginBtn.disabled = false;
      googleLoginBtn.innerHTML = '<i class="fab fa-google"></i> تسجيل الدخول باستخدام جوجل';
      alert('حدث خطأ أثناء محاولة تسجيل الدخول. يرجى المحاولة مرة أخرى.');
    }
  });

  // إعداد مستمع النقر على زر المشاركة
  if (shareAppBtn) {
    shareAppBtn.addEventListener('click', async () => {
      console.log('🔧 Share app button clicked');
      
      try {
        // إنشاء محتوى المشاركة مع الشعار
        const appUrl = window.location.href;
        const logoUrl = `${window.location.origin}/manifest/icon-512x512.png`;
        
        console.log('📍 App URL:', appUrl);
        console.log('🖼️ Logo URL:', logoUrl);
        
        const shareData = {
          title: 'CollectPro - نظام إدارة التحصيلات المتقدم',
          text: `📱 CollectPro
تطبيق احترافي لإدارة التحصيلات وتتبع البيانات المالية

🖼️ شعار التطبيق: ${logoUrl}

🔗 رابط التطبيق: ${appUrl}

📲 حمل التطبيق الآن!

---
CollectPro - نظام إدارة التحصيلات المتقدم`,
          url: appUrl
        };

        console.log('📤 Share data prepared:', shareData);

        // استخدام Web Share API إذا كانت مدعومة
        if (navigator.share) {
          console.log('🌐 Using Web Share API');
          await navigator.share(shareData);
          console.log('✅ App shared successfully');
        } else {
          console.log('📱 Using fallback share method');
          // بديل للمتصفحات التي لا تدعم Web Share API
          await fallbackShare(shareData);
        }
      } catch (error) {
        console.error('❌ Error sharing app:', error);
        if (error.name !== 'AbortError') {
          showAlert('حدث خطأ أثناء محاولة المشاركة', 'danger');
        }
      }
    });
  } else {
    console.warn('❌ Share app button not found');
  }

  // إعداد مستمع النقر على زر تثبيت التطبيق
  if (installAppBtn) {
    installAppBtn.addEventListener('click', async () => {
      console.log('📱 Install app button clicked');
      
      // استخدام نفس دالة التثبيت المباشر من install-prompt.js
      if (window.installPrompt) {
        window.installPrompt.handleInstall();
      } else {
        // fallback إذا لم تكن الرسالة المنبثقة متاحة
        let deferredPrompt = window.deferredPrompt;
        
        try {
          if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('📱 Install outcome:', outcome);
            deferredPrompt = null;
            window.deferredPrompt = null;
            
            if (outcome === 'accepted') {
              localStorage.setItem('appInstalled', 'true');
              console.log('✅ App installed successfully');
              installAppBtn.style.display = 'none';
            }
          } else {
            console.log('📱 Install prompt not ready');
          }
        } catch (error) {
          console.error('❌ Error installing app:', error);
        }
      }
    });
  } else {
    console.warn('❌ Install app button not found');
  }
});

/**
 * Fallback share function for browsers that don't support Web Share API
 * @param {Object} shareData - The share data object
 */
async function fallbackShare(shareData) {
  try {
    // نسخ الرابط إلى الحافظة
    await navigator.clipboard.writeText(shareData.text);
    
    // عرض رسالة تأكيد
    showAlert('تم نسخ التطبيق مع الشعار إلى الحافظة! يمكنك مشاركته الآن.', 'success');
    console.log('✅ Link copied to clipboard as fallback');
  } catch (clipboardError) {
    // إذا فشل نسخ الحافظة، عرض الرابط في نافذة منبثقة مع الشعار
    const logoUrl = `${window.location.origin}/manifest/icon-512x512.png`;
    
    // إنشاء محتوى مخصص للمشاركة
    const shareContent = `
      <div style="text-align: center; margin: 20px 0;">
        <img src="${logoUrl}" alt="CollectPro" style="width: 100px; height: 100px; border: 3px solid #007965; border-radius: 50%;" />
        <p style="margin: 10px 0; font-weight: bold; color: #007965; font-size: 18px;">
          CollectPro
        </p>
        <p style="margin: 5px 0; color: #666; font-size: 14px;">
          نظام إدارة التحصيلات المتقدم
        </p>
      </div>
      
      <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); 
                  padding: 20px; border-radius: 12px; 
                  border: 2px solid #007965; margin: 20px 0;">
        <h4 style="margin: 0 0 15px 0; color: #007965; font-size: 16px;">
          📤 محتوى المشاركة:
        </h4>
        <div style="background: white; padding: 15px; border-radius: 8px; 
                    direction: ltr; font-family: 'Courier New', monospace; 
                    word-break: break-all; font-size: 12px; line-height: 1.5;
                    border: 1px solid #ddd; white-space: pre-wrap;">
📱 CollectPro
تطبيق احترافي لإدارة التحصيلات وتتبع البيانات المالية

🖼️ شعار التطبيق: ${logoUrl}

🔗 رابط التطبيق: ${shareData.url}

📲 حمل التطبيق الآن!

---
CollectPro - نظام إدارة التحصيلات المتقدم</div>
      </div>
      
      <div style="text-align: center; margin: 15px 0;">
        <p style="margin: 5px 0; color: #666; font-size: 13px;">
          💡 انسخ المحتوى أعلاه وشاركه في أي منصة
        </p>
      </div>
    `;
    
    // استخدام تنبيه بسيط بدلاً من النافذة المنبثقة
    alert('مشاركة تطبيق CollectPro:\n\n' + shareContent);
  }
}

/**
 * Show update notification to user
 */
function showUpdateNotification() {
  const notification = document.createElement('div');
  notification.className = 'update-notification';
  notification.innerHTML = `
    <div class="update-content">
      <i class="fas fa-download"></i>
      <span>جاري تحديث التطبيق تلقائياً...</span>
    </div>
  `;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #007965, #00a86b);
    color: white;
    padding: 15px 25px;
    border-radius: 50px;
    box-shadow: 0 4px 20px rgba(0, 121, 101, 0.3);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    animation: slideDown 0.5s ease;
  `;
  
  document.body.appendChild(notification);
  
  // Remove notification after refresh
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 4000);
}

/**
 * Show alert message (simple implementation for login page)
 * @param {string} message - The message to display
 * @param {string} type - The type of alert (info, success, danger, warning)
 */
function showAlert(message, type = 'info') {
  const alertContainer = document.getElementById('alert-container');
  if (!alertContainer) {
    // إذا لم يوجد حاوية تنبيهات، استخدم alert العادي
    alert(message);
    return;
  }

  const alert = document.createElement('div');
  alert.className = `alert alert-${type} show`;

  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-check-circle';
  if (type === 'danger') icon = 'fa-exclamation-circle';
  if (type === 'warning') icon = 'fa-exclamation-triangle';

  alert.innerHTML = `<i class="fas ${icon}"></i> ${message}`;

  alertContainer.appendChild(alert);

  setTimeout(() => {
    alert.classList.remove('show');
    setTimeout(() => alert.remove(), 500);
  }, 5000);
}

/**
 * Redirects the user based on their role.
 * @param {Object} user The Supabase user object.
 */
/**
 * Syncs the user profile to public.users table if not exists.
 * @param {Object} user The Supabase user object.
 */
async function syncUserProfile(user) {
  try {
    const { data, error } = await supabase.from('users').select('id').eq('id', user.id).single();

    if (error && error.code === 'PGRST116') {
      // User not found, insert new record
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

/**
 * Redirects the user based on their role and last page
 * @param {Object} user The Supabase user object.
 */
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

    // التحقق من صلاحيات المدير بناءً على البريد الإلكتروني بدلاً من قاعدة البيانات
    const adminEmails = ['emontal.33@gmail.com']; // يمكن إضافة المزيد من عناوين البريد الإلكتروني للمديرين
    const isAdmin = adminEmails.includes(user.email);

    if (isAdmin) {
      console.log('👑 Admin user detected. Redirecting to dashboard page.');
      window.location.href = 'dashboard.html';
    } else {
      // Check for last page using session manager
      const lastPage = window.sessionManager ? window.sessionManager.getLastPage() : localStorage.getItem('lastPage');
      
      if (lastPage && lastPage !== 'index.html' && lastPage !== '/') {
        console.log('👤 Regular user detected. Redirecting to last page:', lastPage);
        
        // Validate that the last page still exists
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

