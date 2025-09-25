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
      // تسجيل الدخول باستخدام Supabase
      const response = await realLoginRequest(email, password);

      if (response.success) {
        // حفظ معلومات الجلسة
        auth.saveUserSession(response.user, remember);

        // إظهار رسالة نجاح
        showAlert('تم تسجيل الدخول بنجاح! جاري التحويل...', 'success');

        // التحويل إلى صفحة الإدخال كصفحة رئيسية
        setTimeout(() => {
          window.location.href = 'dashboard.html';
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
async function setupGoogleLogin() {
  const googleLoginBtn = document.getElementById('google-login');
  if (!googleLoginBtn) return;

  googleLoginBtn.addEventListener('click', async () => {
    try {
      // إظهار حالة التحميل
      showLoadingState(googleLoginBtn, true);

      // تسجيل الدخول بحساب Google باستخدام Supabase
      const response = await realGoogleLogin();

      if (response.success) {
        // إظهار رسالة نجاح
        showAlert('تم تسجيل الدخول بحساب Google بنجاح! جاري التحويل...', 'success');

        // التحويل إلى صفحة الإدخال كصفحة رئيسية
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1000);
      } else {
        // إظهار رسالة خطأ
        showAlert(response.message || 'فشل تسجيل الدخول بحساب Google. يرجى المحاولة مرة أخرى.', 'danger');
      }
    } catch (error) {
      console.error('Google login error:', error);
      showAlert(error.message || 'حدث خطأ أثناء محاولة تسجيل الدخول بحساب Google. يرجى المحاولة مرة أخرى لاحقًا.', 'danger');
    } finally {
      // إخفاء حالة التحميل
      showLoadingState(googleLoginBtn, false);
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

// ========== طلبات API الحقيقية ========== //

async function realLoginRequest(email, password) {
  try {
    // انتظار تحميل Supabase
    let attempts = 0;
    const maxAttempts = 100;

    while (typeof window.supabase === 'undefined' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (typeof window.supabase === 'undefined') {
      throw new Error('مكتبة Supabase غير محملة');
    }

    // الحصول على إعدادات Supabase
    const supabaseUrl = getConfig('supabase.url');
    const supabaseKey = getConfig('supabase.anonKey');

    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project-id')) {
      throw new Error('إعدادات Supabase غير صحيحة. يرجى التحقق من متغيرات البيئة');
    }

    // إنشاء Supabase client
    const { createClient } = window.supabase;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // تسجيل الدخول
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      console.error('Supabase login error:', error);
      return {
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      };
    }

    if (data.user) {
      return {
        success: true,
        user: {
          id: data.user.id,
          name: data.user.user_metadata?.name || data.user.email.split('@')[0],
          email: data.user.email,
          avatar: data.user.user_metadata?.avatar_url || '',
          token: data.session?.access_token || '',
          provider: 'email'
        }
      };
    }

    return {
      success: false,
      message: 'فشل تسجيل الدخول'
    };
  } catch (error) {
    console.error('Real login error:', error);
    throw error;
  }
}

// ========== محاكاة طلبات API (للاختبار) ========== //
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


// دالة تسجيل الدخول بـ Google باستخدام Supabase
async function realGoogleLogin() {
  try {
    // انتظار تحميل Supabase
    let attempts = 0;
    const maxAttempts = 100;

    while (typeof window.supabase === 'undefined' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (typeof window.supabase === 'undefined') {
      throw new Error('مكتبة Supabase غير محملة');
    }

    // الحصول على إعدادات Supabase
    const supabaseUrl = getConfig('supabase.url');
    const supabaseKey = getConfig('supabase.anonKey');

    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project-id')) {
      throw new Error('إعدادات Supabase غير صحيحة. يرجى التحقق من متغيرات البيئة');
    }

    // إنشاء Supabase client
    const { createClient } = window.supabase;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // تسجيل الدخول بـ Google
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard.html`
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
    throw error;
  }
}

// دالة تسجيل الدخول المبسطة بـ Google (للاختبار)
async function simpleGoogleLogin() {
  try {
    // انتظار تحميل Supabase
    let attempts = 0;
    const maxAttempts = 100;

    while (typeof window.supabase === 'undefined' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (typeof window.supabase === 'undefined') {
      throw new Error('مكتبة Supabase غير محملة');
    }

    // الحصول على إعدادات Supabase من متغيرات البيئة
    const supabaseUrl = getConfig('supabase.url');
    const supabaseKey = getConfig('supabase.anonKey');

    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project-id')) {
      throw new Error('إعدادات Supabase غير متوفرة. يرجى التحقق من متغيرات البيئة');
    }

    // إنشاء Supabase client
    const { createClient } = window.supabase;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // تسجيل الدخول بـ Google
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google'
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
    throw error;
  }
}




