// Global error handlers
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

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              console.log('📱 New version available. Please refresh to update.');
              // You could show a notification to the user here
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
  console.log('🔧 Initializing login page...');

  const googleLoginBtn = document.getElementById('google-login-btn');
  const shareAppBtn = document.getElementById('share-app-btn');

  // إخفاء زر تسجيل الدخول مبدئيًا لمنع الوميض
  googleLoginBtn.style.display = 'none';

  // محاولة جلب الجلسة الحالية فورًا عند فتح التطبيق (مثل فتح اختصار PWA من الشاشة الرئيسية)
  (async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('❌ Error getting current session:', error);
      } else if (session) {
        console.log('✅ Active session found via getSession, syncing profile and redirecting...');
        await syncUserProfile(session.user);
        redirectUser(session.user);
        return; // لا نحتاج لإظهار زر الدخول في هذه الحالة
      } else {
        console.log('No active session from getSession, waiting for onAuthStateChange...');
      }
    } catch (err) {
      console.error('❌ getSession threw an error:', err);
    }
  })();

  // ضمان عدم بقاء الزر مخفيًا في حال لم يصل أي حدث من Supabase (حماية من التوقف على شاشة البداية)
  setTimeout(() => {
    if (googleLoginBtn && googleLoginBtn.style.display === 'none') {
      console.warn('Auth state did not respond in time. Showing login button fallback.');
      googleLoginBtn.style.display = 'flex';
    }
  }, 4000);

  // onAuthStateChange هو المصدر الوحيد للحقيقة
  supabase.auth.onAuthStateChange(async (_event, session) => {
    // يتم استدعاء هذا عند التحميل الأولي وعندما تتغير حالة المصادقة.
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
      googleLoginBtn.style.display = 'flex'; 
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
      
      const shareData = {
        title: 'CollectPro - نظام إدارة التحصيلات المتقدم',
        text: 'تطبيق احترافي لإدارة التحصيلات وتتبع البيانات المالية',
        url: window.location.href
      };

      try {
        // استخدام Web Share API إذا كانت مدعومة
        if (navigator.share) {
          await navigator.share(shareData);
          console.log('✅ App shared successfully');
        } else {
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
    console.warn('Share app button not found');
  }
});

/**
 * Fallback share function for browsers that don't support Web Share API
 * @param {Object} shareData - The share data object
 */
async function fallbackShare(shareData) {
  try {
    // نسخ الرابط إلى الحافظة
    await navigator.clipboard.writeText(shareData.url);
    
    // عرض رسالة تأكيد
    showAlert('تم نسخ رابط التطبيق إلى الحافظة! يمكنك مشاركته الآن.', 'success');
    console.log('✅ Link copied to clipboard as fallback');
  } catch (clipboardError) {
    // إذا فشل نسخ الحافظة، عرض الرابط في نافذة منبثقة
    const message = `شارك تطبيق CollectPro:\n\n${shareData.title}\n${shareData.text}\n\nالرابط: ${shareData.url}`;
    
    // إنشاء نافذة منبثقة مخصصة لنسخ الرابط يدوياً
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>مشاركة التطبيق</h3>
        <p>${shareData.title}</p>
        <p>${shareData.text}</p>
        <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; direction: ltr; font-family: monospace; word-break: break-all; margin: 10px 0;">
          ${shareData.url}
        </div>
        <div class="modal-buttons">
          <button id="copyLinkBtn" class="confirm-btn">نسخ الرابط</button>
          <button id="closeModalBtn" class="cancel-btn">إغلاق</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    // إضافة مستمعي الأحداث للأزرار
    document.getElementById('copyLinkBtn').onclick = async () => {
      try {
        await navigator.clipboard.writeText(shareData.url);
        showAlert('تم نسخ الرابط بنجاح!', 'success');
        modal.remove();
      } catch (error) {
        console.error('Failed to copy link:', error);
        showAlert('فشل نسخ الرابط، يرجى النسخ يدوياً', 'danger');
      }
    };
    
    document.getElementById('closeModalBtn').onclick = () => {
      modal.remove();
    };
    
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    };
    
    console.log('✅ Fallback share modal displayed');
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

