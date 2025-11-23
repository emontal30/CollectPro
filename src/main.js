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
  const installAppBtn = document.getElementById('install-app-btn');
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

  // إعداد مستمع النقر على زر تثبيت التطبيق
  if (installAppBtn) {
    installAppBtn.addEventListener('click', async () => {
      console.log('📱 Install app button clicked');
      
      // تعطيل الزر مؤقتًا وإظهار حالة التحميل
      installAppBtn.disabled = true;
      const originalContent = installAppBtn.innerHTML;
      installAppBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>جاري التثبيت...</span>';
      
      try {
        // التحقق من دعم PWA
        if ('serviceWorker' in navigator && 'beforeinstallprompt' in window) {
          // محاولة تشغيل تثبيت PWA
          const deferredPrompt = window.deferredPrompt;
          if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('📱 Install prompt outcome:', outcome);
            
            if (outcome === 'accepted') {
              localStorage.setItem('appInstalled', 'true');
              installAppBtn.innerHTML = '<i class="fas fa-check"></i> <span>تم التثبيت بنجاح!</span>';
              setTimeout(() => {
                installAppBtn.style.display = 'none';
              }, 2000);
            } else {
              installAppBtn.innerHTML = '<i class="fas fa-times"></i> <span>تم إلغاء التثبيت</span>';
              setTimeout(() => {
                installAppBtn.innerHTML = originalContent;
                installAppBtn.disabled = false;
              }, 1500);
            }
            window.deferredPrompt = null;
          } else {
            // لا يوجد تثبيت متاح، عرض تعليمات يدوية
            showManualInstallInstructions();
          }
        } else {
          // PWA غير مدعوم، عرض تعليمات يدوية
          showManualInstallInstructions();
        }
      } catch (error) {
        console.error('❌ Error during app installation:', error);
        installAppBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <span>حدث خطأ</span>';
        setTimeout(() => {
          installAppBtn.innerHTML = originalContent;
          installAppBtn.disabled = false;
        }, 1500);
      }
    });
  }

  // دالة لعرض تعليمات التثبيت اليدوية
  function showManualInstallInstructions() {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
    
    let instructions = '';
    
    if (isMobile) {
      if (isChrome && /Android/.test(navigator.userAgent)) {
        instructions = 'للتثبيت على Android:\n1. اضغط على القائمة (ثلاث نقاط) في المتصفح\n2. اختر "تثبيت التطبيق" أو "Add to Home screen"\n3. اضغط على "تثبيت"';
      } else if (isSafari && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
        instructions = 'للتثبيت على iOS:\n1. اضغط على أيقونة المشاركة (مربع مع سهم لأعلى)\n2. اختر "إضافة إلى الشاشة الرئيسية"\n3. اضغط على "إضافة"';
      } else {
        instructions = 'للتثبيت:\n1. ابحث عن خيار "إضافة إلى الشاشة الرئيسية" في قائمة المتصفح\n2. اتبع التعليمات لإكمال التثبيت';
      }
    } else {
      instructions = 'للتثبيت على الكمبيوتر:\n1. اضغط على أيقونة التثبيت (٧) في شريط العنوان\n2. اختر "تثبيت التطبيق"\n\nأو استخدم متصفح Chrome للوصول إلى خيار التثبيت';
    }
    
    alert(instructions);
    installAppBtn.innerHTML = '<i class="fas fa-info-circle"></i> <span>انظر للتعليمات</span>';
    setTimeout(() => {
      installAppBtn.innerHTML = originalContent;
      installAppBtn.disabled = false;
    }, 3000);
  }

  // دالة المشاركة البديلة للمتصفحات التي لا تدعم Web Share API
  function fallbackShare(shareData) {
    try {
      // نسخ الرابط إلى الحافظة
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(shareData.url).then(() => {
          showAlert('✅ تم نسخ الرابط إلى الحافظة! يمكنك مشاركته الآن.', 'success');
        }).catch(() => {
          // إذا فشل نسخ الحافظة، عرض الرابط في نافذة منبثقة
          showShareDialog(shareData);
        });
      } else {
        // بديل قديم للمتصفحات التي لا تدعم Clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = shareData.url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          showAlert('✅ تم نسخ الرابط إلى الحافظة! يمكنك مشاركته الآن.', 'success');
        } catch (err) {
          showShareDialog(shareData);
        }
        
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('❌ Error in fallback share:', error);
      showShareDialog(shareData);
    }
  }

  // دالة لعرض نافذة مشاركة بديلة
  function showShareDialog(shareData) {
    const shareText = `${shareData.title}\n\n${shareData.text}\n\nالرابط: ${shareData.url}`;
    
    // محاولة استخدام WhatsApp للهواتف المحمولة
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      // للكمبيوتر، عرض الرابط في نافذة منبثقة
      prompt('شارك التطبيق باستخدام الرابط التالي:', shareData.url);
    }
  }

  // دالة لعرض التنبيهات
  function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#4caf50' : '#2196f3'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      direction: rtl;
      animation: slideDownFromTop 0.3s ease-out;
    `;
    
    alertContainer.appendChild(alert);
    
    // إزالة التنبيه بعد 3 ثوانٍ
    setTimeout(() => {
      alert.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => {
        if (alert.parentNode) {
          alert.parentNode.removeChild(alert);
        }
      }, 300);
    }, 3000);
  }

  // إعداد مستمع النقر على زر مشاركة التطبيق
  if (shareAppBtn) {
    shareAppBtn.addEventListener('click', async () => {
      console.log('🔗 Share app button clicked');
      
      try {
        const shareData = {
          title: 'CollectPro - نظام إدارة التحصيلات المتقدم',
          text: 'تطبيق احترافي لإدارة التحصيلات والمتابعة المالية. قم بتنزيله الآن!',
          url: window.location.origin
        };

        // التحقق من دعم Web Share API
        if (navigator.share) {
          await navigator.share(shareData);
          console.log('✅ App shared successfully using Web Share API');
        } else {
          // بديل للمتصفحات التي لا تدعم Web Share API
          fallbackShare(shareData);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('❌ Error sharing app:', error);
          // محاولة استخدام البديل في حالة فشل Web Share API
          fallbackShare({
            title: 'CollectPro - نظام إدارة التحصيلات المتقدم',
            text: 'تطبيق احترافي لإدارة التحصيلات والمتابعة المالية. قم بتنزيله الآن!',
            url: window.location.origin
          });
        }
      }
    });
  }
});

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

