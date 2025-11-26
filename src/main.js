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

        // نظام التحديث التلقائي المتقدم
        setupAutoUpdateSystem(registration);

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 New service worker found, installing...');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              console.log('📱 New version available. Refreshing automatically...');
              
              // إظهار إشعار التحديث
              showUpdateNotification();
              
              // تحديث تلقائي بعد 3 ثواني
              setTimeout(() => {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
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

/**
 * نظام التحديث التلقائي المتقدم
 */
function setupAutoUpdateSystem(registration) {
  // التحقق من التحديثات كل 5 دقائق
  setInterval(async () => {
    try {
      const response = await fetch('/sw.js', { cache: 'no-store' });
      const newVersion = await response.text();
      
      // مقارنة النسخة الحالية بالجديدة
      registration.getRegistration().then(reg => {
        if (reg && reg.active) {
          reg.active.postMessage({ type: 'GET_VERSION' });
          
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.version) {
              const currentVersion = event.data.version;
              // هنا يمكن مقارنة النسخ والتحديث
            }
          });
        }
      });
    } catch (error) {
      console.log('🔄 Check for updates failed:', error);
    }
  }, 5 * 60 * 1000); // كل 5 دقائق
}

/**
 * إظهار إشعار التحديث
 */
function showUpdateNotification() {
  // إنشاء عنصر الإشعار
  const notification = document.createElement('div');
  notification.className = 'update-notification';
  notification.innerHTML = `
    <div class="update-content">
      <i class="fas fa-sync-alt fa-spin"></i>
      <span>جاري تحديث التطبيق تلقائياً...</span>
    </div>
  `;
  
  // إضافة التنسيقات
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #007965, #005a4b);
    color: white;
    padding: 15px 20px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 121, 101, 0.3);
    z-index: 10000;
    font-family: 'Tajawal', sans-serif;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: slideIn 0.3s ease;
  `;
  
  // إضافة CSS للأنيميشن
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .update-notification .update-content {
      display: flex;
      align-items: center;
      gap: 10px;
    }
  `;
  document.head.appendChild(style);
  
  // إضافة الإشعار للصفحة
  document.body.appendChild(notification);
  
  // إزالة الإشعار بعد التحديث
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 Initializing login page...');

  const googleLoginBtn = document.getElementById('google-login-btn');
  const shareAppBtn = document.getElementById('share-app-btn');
  const installAppBtn = document.getElementById('install-app-btn');

  // إخفاء زر تسجيل الدخول مبدئيًا لمنع الوميض
  googleLoginBtn.style.display = 'none';

  // الاستماع لأحداث تثبيت PWA
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    console.log('📱 Install prompt is now available');
  });

  // التحقق مما إذا كان التطبيق مثبتاً بالفعل
  window.addEventListener('appinstalled', () => {
    console.log('✅ App was installed');
    localStorage.setItem('appInstalled', 'true');
    if (installAppBtn) {
      installAppBtn.style.display = 'none';
    }
  });

  // إدارة الجلسة المستمرة - حل احترافي
  (async () => {
    try {
      // أولاً: التحقق من الجلسة الحالية
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Error getting current session:', error);
        showLoginButton();
        return;
      }

      if (session) {
        console.log('✅ Active session found, validating...');
        
        // التحقق من صلاحية الجلسة
        const isValid = await validateSession(session);
        
        if (isValid) {
          console.log('✅ Session is valid, syncing profile and redirecting...');
          await syncUserProfile(session.user);
          redirectUser(session.user);
          
          // تحديث وقت آخر نشاط
          localStorage.setItem('lastActivity', Date.now().toString());
          return;
        } else {
          console.log('❌ Session expired, clearing...');
          await supabase.auth.signOut();
          localStorage.removeItem('lastActivity');
        }
      }

      // إذا لم توجد جلسة صالحة، انتظر onAuthStateChange
      console.log('No valid session found, waiting for auth state change...');
      
    } catch (err) {
      console.error('❌ Session validation error:', err);
      showLoginButton();
    }
  })();

  // مراقبة نشاط المستخدم لتحديث الجلسة
  setupActivityMonitoring();

  // onAuthStateChange هو المصدر الوحيد للحقيقة
  supabase.auth.onAuthStateChange(async (_event, session) => {
    console.log('🔄 Auth state changed:', _event, session ? 'Session exists' : 'No session');
    
    if (session) {
      // المستخدم مسجل دخوله.
      console.log('✅ Active session found, syncing profile...');
      await syncUserProfile(session.user);
      console.log('✅ Profile synced, redirecting...');
      redirectUser(session.user);
      
      // تحديث وقت آخر نشاط
      localStorage.setItem('lastActivity', Date.now().toString());
    } else {
      // المستخدم غير مسجل دخوله.
      console.log('No active session. Showing login UI.');
      showLoginButton();
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

📱 تطبيق تحصيل شامل واحترافي

📲 حمل التطبيق الآن!

----
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
      
      // التحقق من وجود deferredPrompt
      let deferredPrompt = window.deferredPrompt;
      
      try {
        if (deferredPrompt) {
          // استخدام PWA install prompt مباشرة
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
          console.log('📱 Install prompt not available');
          // لا تفعل شيئاً - فقط انتظر until PWA prompt becomes available
        }
      } catch (error) {
        console.error('❌ Error installing app:', error);
      }
    });
  } else {
    console.warn('❌ Install app button not found');
  }
});

/**
 * Validate session and check if it's still active
 */
async function validateSession(session) {
  try {
    // التحقق من انتهاء صلاحية الجلسة
    const now = Date.now();
    const sessionAge = now - (session.expires_at * 1000);
    
    if (sessionAge > 0) {
      console.log('❌ Session expired');
      return false;
    }

    // التحقق من آخر نشاط للمستخدم (24 ساعة)
    const lastActivity = localStorage.getItem('lastActivity');
    if (lastActivity) {
      const inactiveTime = now - parseInt(lastActivity);
      const maxInactiveTime = 24 * 60 * 60 * 1000; // 24 ساعة
      
      if (inactiveTime > maxInactiveTime) {
        console.log('❌ User inactive too long');
        return false;
      }
    }

    // التحقق من وجود المستخدم في قاعدة البيانات
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', session.user.id)
      .single();
    
    if (error || !data) {
      console.log('❌ User not found in database');
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Session validation error:', error);
    return false;
  }
}

/**
 * Setup activity monitoring for session management
 */
function setupActivityMonitoring() {
  // تحديث وقت النشاط عند تفاعل المستخدم
  const activities = [
    'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'
  ];
  
  let activityTimer;
  
  function updateActivity() {
    localStorage.setItem('lastActivity', Date.now().toString());
    
    // مسح المؤقت الحالي وبدء مؤقت جديد
    clearTimeout(activityTimer);
    
    // تسجيل الخروج التلقائي بعد 24 ساعة من عدم النشاط
    activityTimer = setTimeout(async () => {
      console.log('⏰ Auto logout due to inactivity');
      await supabase.auth.signOut();
      localStorage.removeItem('lastActivity');
      
      // إظهار رسالة للمستخدم
      if (typeof showAlert === 'function') {
        showAlert('تم تسجيل الخروج تلقائياً بسبب عدم النشاط لمدة 24 ساعة', 'info');
      }
    }, 24 * 60 * 60 * 1000); // 24 ساعة
  }
  
  // إضافة مستمعي الأحداث
  activities.forEach(event => {
    document.addEventListener(event, updateActivity, true);
  });
  
  // تحديث النشاط عند تحميل الصفحة
  updateActivity();
}

/**
 * Show login button with animation
 */
function showLoginButton() {
  if (googleLoginBtn) {
    googleLoginBtn.style.display = 'flex';
    googleLoginBtn.style.opacity = '0';
    googleLoginBtn.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      googleLoginBtn.style.transition = 'all 0.3s ease';
      googleLoginBtn.style.opacity = '1';
      googleLoginBtn.style.transform = 'translateY(0)';
    }, 100);
  }
}

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

📱 تطبيق تحصيل شامل واحترافي

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
 * Redirects the user based on their role.
 * @param {Object} user The Supabase user object.
 */
async function redirectUser(user) {
    if (!user) return;

    console.log('🔍 Checking user role for redirection. User ID:', user.id);

    // التحقق من صلاحيات المدير بناءً على البريد الإلكتروني بدلاً من قاعدة البيانات
    const adminEmails = ['emontal.33@gmail.com']; // يمكن إضافة المزيد من عناوين البريد الإلكتروني للمديرين
    const isAdmin = adminEmails.includes(user.email);

    if (isAdmin) {
      console.log('👑 Admin user detected. Redirecting to data entry page.');
      window.location.href = 'dashboard.html';
    } else {
      // Check for last page
      const lastPage = localStorage.getItem('lastPage');
      if (lastPage) {
        console.log('👤 Regular user detected. Redirecting to last page:', lastPage);
        window.location.href = lastPage;
      } else {
        console.log('👤 Regular user detected. Redirecting to dashboard page.');
        window.location.href = 'dashboard.html';
      }
    }
}

