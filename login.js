// ========== تهيئة المتغيرات ========== //
document.addEventListener('DOMContentLoaded', () => {
  // تطبيق الوضع الليلي المحفوظ
  applyDarkModeFromStorage();

  // إعداد مستمعي الأحداث
  setupEventListeners();

  // إعداد زر تبديل كلمة المرور
  setupPasswordToggle();

  // إعداد نموذج تسجيل الدخول
  setupLoginForm();

  // إعداد نموذج استعادة كلمة المرور
  setupForgotPasswordForm();

  // إعداد نموذج إنشاء حساب جديد
  setupSignupForm();

  // إعداد نموذج التحقق بخطوتين
  setupTwoFactorForm();

  // إعداد زر تسجيل الدخول بحساب Google
  setupGoogleLogin();

  // إعداد قوة كلمة المرور
  setupPasswordStrength();
});

// ========== تطبيق الوضع الليلي ========== //
function applyDarkModeFromStorage() {
  const isDarkMode = localStorage.getItem("darkMode") === "on";
  document.body.classList.toggle("dark", isDarkMode);
}

// ========== إعداد مستمعي الأحداث ========== //
function setupEventListeners() {
  // إغلاق النوافذ المنبثقة عند النقر خارجها
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });

    // إغلاق النوافذ المنبثقة عند النقر على زر الإغلاق
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => closeModal(modal));
    }
  });

  // فتح نافذة استعادة كلمة المرور
  const forgotPasswordLink = document.querySelector('.forgot-password');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('forgot-password-modal');
    });
  }

  // فتح نافذة إنشاء حساب جديد
  const signupLink = document.querySelector('.signup-link a');
  if (signupLink) {
    signupLink.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('signup-modal');
    });
  }
}

// ========== إدارة النوافذ المنبثقة ========== //
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modal) {
  if (typeof modal === 'string') {
    modal = document.getElementById(modal);
  }

  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';

    // إعادة تعيين النماذج عند الإغلاق
    const forms = modal.querySelectorAll('form');
    forms.forEach(form => form.reset());

    // إخفاء رسائل الخطأ
    const errorMessages = modal.querySelectorAll('.error-message');
    errorMessages.forEach(msg => msg.textContent = '');
  }
}

// ========== إظهار التنبيهات ========== //
function showAlert(message, type = 'info', container = 'alert-container') {
  const alertContainer = document.getElementById(container);
  if (!alertContainer) return;

  // إزالة التنبيهات الحالية
  alertContainer.innerHTML = '';

  // إنشاء تنبيه جديد
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;

  // إضافة الأيقونة المناسبة
  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-check-circle';
  if (type === 'danger') icon = 'fa-exclamation-circle';

  alert.innerHTML = `<i class="fas ${icon}"></i> ${message}`;

  alertContainer.appendChild(alert);

  // إزالة التنبيه تلقائيًا بعد 5 ثوانٍ
  setTimeout(() => {
    alert.style.opacity = '0';
    setTimeout(() => alert.remove(), 300);
  }, 5000);
}

// ========== تبديل عرض كلمة المرور ========== //
function setupPasswordToggle() {
  document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', () => {
      const input = button.previousElementSibling;
      const icon = button.querySelector('i');

      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });
  });
}

// ========== نموذج تسجيل الدخول ========== //
function setupLoginForm() {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // إعادة تعيين رسائل الخطأ
    document.getElementById('email-error').textContent = '';
    document.getElementById('password-error').textContent = '';

    // الحصول على قيم الحقول
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;

    // التحقق من صحة البيانات
    let isValid = true;

    if (!email) {
      document.getElementById('email-error').textContent = 'البريد الإلكتروني مطلوب';
      isValid = false;
    } else if (!isValidEmail(email)) {
      document.getElementById('email-error').textContent = 'البريد الإلكتروني غير صالح';
      isValid = false;
    }

    if (!password) {
      document.getElementById('password-error').textContent = 'كلمة المرور مطلوبة';
      isValid = false;
    }

    if (!isValid) return;

    // إظهار حالة التحميل
    const submitBtn = loginForm.querySelector('.login-btn');
    submitBtn.classList.add('loading');

    try {
      // محاكاة طلب تسجيل الدخول
      const response = await simulateLoginRequest(email, password);

      if (response.success) {
        // حفظ معلومات الجلسة
        auth.saveUserSession(response.user, remember);

        // إظهار رسالة نجاح
        showAlert('تم تسجيل الدخول بنجاح! جاري التحويل...', 'success');

        // التحويل إلى صفحة الإدخال كصفحة رئيسية
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1000);
      } else {
        // إظهار رسالة خطأ
        showAlert(response.message || 'فشل تسجيل الدخول. يرجى التحقق من بياناتك والمحاولة مرة أخرى.', 'danger');
      }
    } catch (error) {
      console.error('Login error:', error);
      showAlert('حدث خطأ أثناء محاولة تسجيل الدخول. يرجى المحاولة مرة أخرى لاحقًا.', 'danger');
    } finally {
      // إخفاء حالة التحميل
      submitBtn.classList.remove('loading');
    }
  });
}

// ========== نموذج استعادة كلمة المرور ========== //
function setupForgotPasswordForm() {
  const forgotPasswordForm = document.getElementById('forgot-password-form');
  if (!forgotPasswordForm) return;

  forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // إعادة تعيين رسائل الخطأ
    document.getElementById('reset-email-error').textContent = '';

    // الحصول على قيمة الحقل
    const email = document.getElementById('reset-email').value.trim();

    // التحقق من صحة البريد الإلكتروني
    if (!email) {
      document.getElementById('reset-email-error').textContent = 'البريد الإلكتروني مطلوب';
      return;
    } else if (!isValidEmail(email)) {
      document.getElementById('reset-email-error').textContent = 'البريد الإلكتروني غير صالح';
      return;
    }

    // إظهار حالة التحميل
    const submitBtn = forgotPasswordForm.querySelector('.submit-btn');
    submitBtn.classList.add('loading');

    try {
      // محاكاة طلب استعادة كلمة المرور
      const response = await simulateForgotPasswordRequest(email);

      if (response.success) {
        // إظهار رسالة نجاح
        showAlert('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.', 'success');

        // إغلاق النافذة المنبثقة بعد ثانية
        setTimeout(() => {
          closeModal('forgot-password-modal');
        }, 1000);
      } else {
        // إظهار رسالة خطأ
        showAlert(response.message || 'فشل إرسال رابط استعادة كلمة المرور. يرجى المحاولة مرة أخرى.', 'danger');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      showAlert('حدث خطأ أثناء محاولة استعادة كلمة المرور. يرجى المحاولة مرة أخرى لاحقًا.', 'danger');
    } finally {
      // إخفاء حالة التحميل
      submitBtn.classList.remove('loading');
    }
  });
}

// ========== نموذج إنشاء حساب جديد ========== //
function setupSignupForm() {
  const signupForm = document.getElementById('signup-form');
  if (!signupForm) return;

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // إعادة تعيين رسائل الخطأ
    document.getElementById('signup-name-error').textContent = '';
    document.getElementById('signup-email-error').textContent = '';
    document.getElementById('signup-password-error').textContent = '';
    document.getElementById('signup-confirm-password-error').textContent = '';
    document.getElementById('accept-terms-error').textContent = '';

    // الحصول على قيم الحقول
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const phone = document.getElementById('signup-phone').value.trim();
    const acceptTerms = document.getElementById('accept-terms').checked;

    // التحقق من صحة البيانات
    let isValid = true;

    if (!name) {
      document.getElementById('signup-name-error').textContent = 'الاسم مطلوب';
      isValid = false;
    }

    if (!email) {
      document.getElementById('signup-email-error').textContent = 'البريد الإلكتروني مطلوب';
      isValid = false;
    } else if (!isValidEmail(email)) {
      document.getElementById('signup-email-error').textContent = 'البريد الإلكتروني غير صالح';
      isValid = false;
    }

    if (!password) {
      document.getElementById('signup-password-error').textContent = 'كلمة المرور مطلوبة';
      isValid = false;
    } else if (password.length < 8) {
      document.getElementById('signup-password-error').textContent = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
      isValid = false;
    }

    if (!confirmPassword) {
      document.getElementById('signup-confirm-password-error').textContent = 'تأكيد كلمة المرور مطلوب';
      isValid = false;
    } else if (password !== confirmPassword) {
      document.getElementById('signup-confirm-password-error').textContent = 'كلمتا المرور غير متطابقتين';
      isValid = false;
    }

    if (!acceptTerms) {
      document.getElementById('accept-terms-error').textContent = 'يجب الموافقة على الشروط والأحكام';
      isValid = false;
    }

    if (!isValid) return;

    // إظهار حالة التحميل
    const submitBtn = signupForm.querySelector('.submit-btn');
    submitBtn.classList.add('loading');

    try {
      // محاكاة طلب إنشاء حساب جديد
      const response = await simulateSignupRequest({
        name,
        email,
        password,
        phone
      });

      if (response.success) {
        // إظهار رسالة نجاح
        showAlert('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.', 'success');

        // إغلاق النافذة المنبثقة بعد ثانية
        setTimeout(() => {
          closeModal('signup-modal');

          // تعبئة حقل البريد الإلكتروني في نموذج تسجيل الدخول
          document.getElementById('email').value = email;
        }, 1000);
      } else {
        // إظهار رسالة خطأ
        showAlert(response.message || 'فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.', 'danger');
      }
    } catch (error) {
      console.error('Signup error:', error);
      showAlert('حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى لاحقًا.', 'danger');
    } finally {
      // إخفاء حالة التحميل
      submitBtn.classList.remove('loading');
    }
  });
}

// ========== نموذج التحقق بخطوتين ========== //
function setupTwoFactorForm() {
  const twoFactorForm = document.getElementById('two-factor-form');
  if (!twoFactorForm) return;

  // إعداد مؤقت إعادة الإرسال
  let resendTimer = null;
  let countdown = 60;

  // إعداد زر إعادة الإرسال
  const resendLink = document.getElementById('resend-code-link');
  const resendTimerElement = document.getElementById('resend-timer');

  if (resendLink) {
    resendLink.addEventListener('click', async (e) => {
      e.preventDefault();

      // تعطيل الزر مؤقتًا
      resendLink.style.display = 'none';
      resendTimerElement.style.display = 'block';

      // بدء العد التنازلي
      countdown = 60;
      resendTimerElement.textContent = `يمكنك إعادة الإرسال بعد ${countdown} ثانية`;

      resendTimer = setInterval(() => {
        countdown--;
        resendTimerElement.textContent = `يمكنك إعادة الإرسال بعد ${countdown} ثانية`;

        if (countdown <= 0) {
          clearInterval(resendTimer);
          resendLink.style.display = 'inline';
          resendTimerElement.style.display = 'none';
        }
      }, 1000);

      try {
        // محاكاة طلب إعادة إرسال الرمز
        const response = await simulateResendCodeRequest();

        if (response.success) {
          showAlert('تم إرسال رمز التحقق مرة أخرى.', 'success');
        } else {
          showAlert(response.message || 'فشل إعادة إرسال الرمز. يرجى المحاولة مرة أخرى.', 'danger');
        }
      } catch (error) {
        console.error('Resend code error:', error);
        showAlert('حدث خطأ أثناء إعادة إرسال الرمز. يرجى المحاولة مرة أخرى لاحقًا.', 'danger');
      }
    });
  }

  twoFactorForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // إعادة تعيين رسائل الخطأ
    document.getElementById('verification-code-error').textContent = '';

    // الحصول على قيمة الحقل
    const code = document.getElementById('verification-code').value.trim();

    // التحقق من صحة الرمز
    if (!code) {
      document.getElementById('verification-code-error').textContent = 'رمز التحقق مطلوب';
      return;
    } else if (code.length !== 6 || !/^\d+$/.test(code)) {
      document.getElementById('verification-code-error').textContent = 'رمز التحقق يجب أن يكون 6 أرقام';
      return;
    }

    // إظهار حالة التحميل
    const submitBtn = twoFactorForm.querySelector('.submit-btn');
    submitBtn.classList.add('loading');

    try {
      // محاكاة طلب التحقق من الرمز
      const response = await simulateVerifyCodeRequest(code);

      if (response.success) {
        // حفظ معلومات الجلسة
        saveSession(response.user, true);

        // إظهار رسالة نجاح
        showAlert('تم التحقق بنجاح! جاري التحويل...', 'success');

        // التحويل إلى الصفحة الرئيسية بعد ثانية
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1000);
      } else {
        // إظهار رسالة خطأ
        showAlert(response.message || 'رمز التحقق غير صالح. يرجى المحاولة مرة أخرى.', 'danger');
      }
    } catch (error) {
      console.error('Verify code error:', error);
      showAlert('حدث خطأ أثناء التحقق من الرمز. يرجى المحاولة مرة أخرى لاحقًا.', 'danger');
    } finally {
      // إخفاء حالة التحميل
      submitBtn.classList.remove('loading');
    }
  });
}

// ========== تسجيل الدخول بحساب Google ========== //
function setupGoogleLogin() {
  const googleLoginBtn = document.getElementById('google-login');
  if (!googleLoginBtn) return;

  googleLoginBtn.addEventListener('click', async () => {
    try {
      // التحقق من المكتبات المطلوبة
      const dependencyErrors = checkDependencies();
      if (dependencyErrors.length > 0) {
        showAlert(dependencyErrors.join(', '), 'danger');
        return;
      }

      // إظهار حالة التحميل
      googleLoginBtn.classList.add('loading');

      // تسجيل الدخول بحساب Google
      const response = await simulateGoogleLoginRequest();

      if (response.success) {
        // إذا كان redirect، فالمستخدم سيتم توجيهه تلقائياً
        if (response.redirect) {
          showAlert(response.message || 'جاري إعادة التوجيه إلى Google...', 'info');
          // لا نحتاج إلى إعادة توجيه يدوي لأن Supabase سيتولى الأمر
          return;
        }
        
        // حفظ معلومات الجلسة للحالات العادية
        if (response.user) {
          if (typeof auth !== 'undefined' && auth.saveUserSession) {
            auth.saveUserSession(response.user, true);
          }

          // إظهار رسالة نجاح
          showAlert('تم تسجيل الدخول بحساب Google بنجاح! جاري التحويل...', 'success');

          // التحويل إلى صفحة الإدخال كصفحة رئيسية
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 1000);
        }
      } else {
        // إظهار رسالة خطأ
        showAlert(response.message || 'فشل تسجيل الدخول بحساب Google. يرجى المحاولة مرة أخرى.', 'danger');
      }
    } catch (error) {
      console.error('Google login error:', error);
      showAlert(error.message || 'حدث خطأ أثناء محاولة تسجيل الدخول بحساب Google. يرجى المحاولة مرة أخرى لاحقًا.', 'danger');
    } finally {
      // إخفاء حالة التحميل
      googleLoginBtn.classList.remove('loading');
    }
  });
}

// ========== قوة كلمة المرور ========== //
function setupPasswordStrength() {
  const passwordInput = document.getElementById('signup-password');
  if (!passwordInput) return;

  passwordInput.addEventListener('input', () => {
    const password = passwordInput.value;
    const strength = calculatePasswordStrength(password);

    const strengthMeter = document.querySelector('.strength-meter-fill');
    const strengthText = document.querySelector('.strength-text');
    const strengthContainer = document.querySelector('.password-strength');

    // إزالة جميع فئات القوة
    strengthContainer.classList.remove('strength-weak', 'strength-medium', 'strength-strong');

    if (password.length === 0) {
      strengthMeter.style.width = '0';
      strengthText.textContent = 'قوة كلمة المرور';
      return;
    }

    // إضافة الفئة المناسبة
    if (strength < 3) {
      strengthContainer.classList.add('strength-weak');
      strengthText.textContent = 'ضعيفة';
    } else if (strength < 5) {
      strengthContainer.classList.add('strength-medium');
      strengthText.textContent = 'متوسطة';
    } else {
      strengthContainer.classList.add('strength-strong');
      strengthText.textContent = 'قوية';
    }
  });
}

function calculatePasswordStrength(password) {
  let strength = 0;

  // طول كلمة المرور
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;

  // تنوع الأحرف
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  return strength;
}

// ========== وظائف مساعدة ========== //
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function saveSession(user, remember) {
  // حفظ معلومات المستخدم في التخزين المحلي
  const userData = {
    id: user.id,
    name: user.name,
    email: user.email,
    token: user.token
  };

  if (remember) {
    localStorage.setItem('user', JSON.stringify(userData));
  } else {
    sessionStorage.setItem('user', JSON.stringify(userData));
  }
}

// ========== محاكاة طلبات API ========== //
// في تطبيق حقيقي، سيتم استبدال هذه الدوال بطلبات API حقيقية

async function simulateLoginRequest(email, password) {
  // محاكاة تأخير الشبكة
  await new Promise(resolve => setTimeout(resolve, 1000));

  // محاكاة استجابة ناجحة
  if (email === 'admin@example.com' && password === 'password123') {
    return {
      success: true,
      user: {
        id: 1,
        name: 'مدير النظام',
        email: 'admin@example.com',
        token: 'fake-jwt-token'
      }
    };
  }

  // محاكاة استجابة فاشلة
  return {
    success: false,
    message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
  };
}

async function simulateForgotPasswordRequest(email) {
  // محاكاة تأخير الشبكة
  await new Promise(resolve => setTimeout(resolve, 1000));

  // محاكاة استجابة ناجحة
  return {
    success: true,
    message: 'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني'
  };
}

async function simulateSignupRequest(userData) {
  // محاكاة تأخير الشبكة
  await new Promise(resolve => setTimeout(resolve, 1000));

  // محاكاة استجابة ناجحة
  return {
    success: true,
    message: 'تم إنشاء الحساب بنجاح'
  };
}

async function simulateVerifyCodeRequest(code) {
  // محاكاة تأخير الشبكة
  await new Promise(resolve => setTimeout(resolve, 1000));

  // محاكاة استجابة ناجحة إذا كان الرمز هو 123456
  if (code === '123456') {
    return {
      success: true,
      user: {
        id: 1,
        name: 'مدير النظام',
        email: 'admin@example.com',
        token: 'fake-jwt-token'
      }
    };
  }

  // محاكاة استجابة فاشلة
  return {
    success: false,
    message: 'رمز التحقق غير صالح'
  };
}

async function simulateResendCodeRequest() {
  // محاكاة تأخير الشبكة
  await new Promise(resolve => setTimeout(resolve, 1000));

  // محاكاة استجابة ناجحة
  return {
    success: true,
    message: 'تم إرسال رمز التحقق مرة أخرى'
  };
}

async function simulateGoogleLoginRequest() {
  try {
    // انتظار تحميل Supabase (حد أقصى 10 ثوانٍ)
    let attempts = 0;
    while (typeof window.supabase === 'undefined' && attempts < 100) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (typeof window.supabase === 'undefined') {
      throw new Error('مكتبة Supabase غير محملة');
    }

    // التحقق من وجود دالة getConfig
    if (typeof window.getConfig === 'undefined') {
      throw new Error('دالة getConfig غير متوفرة');
    }

    // الحصول على إعدادات Supabase من ملف config
    const supabaseUrl = window.getConfig('supabase.url');
    const supabaseKey = window.getConfig('supabase.anonKey');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('إعدادات Supabase غير متوفرة. يرجى التحقق من ملف config.js');
    }

    // إنشاء Supabase client
    if (typeof window.supabase.createClient !== 'function') {
      throw new Error('دالة createClient غير متوفرة في مكتبة Supabase');
    }

    const { createClient } = window.supabase;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // بدء تسجيل الدخول عبر Google
    if (typeof supabaseClient.auth.signInWithOAuth !== 'function') {
      throw new Error('دالة signInWithOAuth غير متوفرة');
    }

    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });

    if (error) {
      console.error('Supabase OAuth error:', error);
      throw new Error(`خطأ في تسجيل الدخول بـ Google: ${error.message}`);
    }

    // في حالة نجاح تسجيل الدخول، سيتم إعادة توجيه المستخدم تلقائياً
    return {
      success: true,
      message: 'جاري إعادة التوجيه إلى Google...',
      redirect: true
    };
  } catch (error) {
    console.error('Google login error:', error);

    // محاولة استخدام Google Identity Services كبديل
    return await fallbackGoogleSignIn();
  }
}


// دالة بديلة لتسجيل الدخول بـ Google باستخدام Google Identity Services
async function fallbackGoogleSignIn() {
  try {
    // التحقق من وجود مكتبة Google Identity Services
    if (typeof google === "undefined" || !google.accounts) {
      // إذا لم تكن المكتبة محملة، نعطي رسالة توضيحية
      return {
        success: false,
        message: "تسجيل الدخول بـ Google غير متوفر حالياً. يرجى استخدام البريد الإلكتروني وكلمة المرور، أو تواصل مع الدعم الفني لإعداد تسجيل الدخول بـ Google."
      };
    }

    // التحقق من وجود دالة getConfig
    if (typeof window.getConfig === 'undefined') {
      return {
        success: false,
        message: "إعدادات التطبيق غير متوفرة. يرجى تحديث الصفحة والمحاولة مرة أخرى."
      };
    }

    // التحقق من وجود Google Client ID
    const googleClientId = window.getConfig("google.clientId");
    if (!googleClientId || googleClientId.includes("your-google-client-id")) {
      return {
        success: false,
        message: "إعدادات Google Client ID غير مكتملة. يرجى التحقق من ملف config.js"
      };
    }

    // إنشاء وعد لمعالجة callback من Google
    return new Promise((resolve, reject) => {
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          try {
            // فك تشفير JWT token من Google
            const payload = parseJwt(response.credential);

            if (payload) {
              // إنشاء مستخدم من بيانات Google
              const user = {
                id: payload.sub,
                name: payload.name,
                email: payload.email,
                avatar: payload.picture,
                token: response.credential,
                provider: "google"
              };

              // حفظ معلومات المستخدم في التخزين المحلي
              if (typeof window.auth !== 'undefined' && window.auth.saveUserSession) {
                window.auth.saveUserSession(user, true);
              }

              resolve({
                success: true,
                user: user
              });
            } else {
              reject(new Error("فشل في معالجة استجابة Google"));
            }
          } catch (error) {
            console.error('Google Identity Services error:', error);
            reject(error);
          }
        }
      });

      // عرض نافذة تسجيل الدخول
      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // إذا لم تظهر النافذة، استخدم الطريقة البديلة
          google.accounts.id.renderButton(
            document.createElement("div"),
            { theme: "outline", size: "large" }
          );

          // محاولة عرض النافذة مرة أخرى
          setTimeout(() => {
            google.accounts.id.prompt();
          }, 1000);
        }
      });
    });
  } catch (error) {
    console.error("Fallback Google sign-in error:", error);
    return {
      success: false,
      message: `حدث خطأ أثناء تسجيل الدخول بـ Google: ${error.message}. يرجى المحاولة مرة أخرى أو استخدام البريد الإلكتروني وكلمة المرور.`
    };
  }
}

// دالة مساعدة لفك تشفير JWT token
function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(atob(base64).split("").map(function(c) {
      return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(""));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error parsing JWT:", error);
    return null;
  }
}

// دالة للتحقق من تحميل المكتبات المطلوبة
function checkDependencies() {
  const errors = [];

  if (typeof window.supabase === 'undefined') {
    errors.push('مكتبة Supabase غير محملة');
  }

  if (typeof window.getConfig === 'undefined') {
    errors.push('دالة getConfig غير متوفرة');
  }

  if (typeof google === 'undefined' || !google.accounts) {
    errors.push('مكتبة Google Identity Services غير متوفرة');
  }

  return errors;
}
