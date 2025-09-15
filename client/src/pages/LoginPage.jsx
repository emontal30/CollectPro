import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

/*
  صفحة تسجيل الدخول (Login Page)
  - تدعم: البريد وكلمة المرور + تذكرني + تسجيل جوجل + تسجيل دخول عبر رمز للبريد (OTP Email)
  - واجهة حديثة ومتجاوبة مع تنبيهات واضحة
  - أمان: قفل مؤقت بعد محاولات فاشلة متكررة + الاعتماد على HTTPS على Vercel + جلسات JWT من Supabase
  ملاحظات الأمان:
  - كلمات المرور يتم تشفيرها على الخادم عبر Supabase تلقائيًا (لا نقوم بالتشفير في المتصفح)
  - Supabase تستخدم JWT Sessions افتراضياً
  - لتفعيل 2FA متقدم (TOTP)، يفضّل تنفيذها عبر Edge Functions/خادم لاحقاً
*/

const MAX_ATTEMPTS = 5; // الحد الأقصى للمحاولات الفاشلة قبل القفل
const LOCKOUT_MINUTES = 10; // مدة القفل بالدقائق

const LoginPage = () => {
  const navigate = useNavigate();

  // حالات الواجهة
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // الحقول
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // التحقق
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // قفل المحاولات المتكررة
  const [lockedUntil, setLockedUntil] = useState(null);

  useEffect(() => {
    const storedUntil = localStorage.getItem('login_lockout_until');
    if (storedUntil) {
      const until = new Date(parseInt(storedUntil, 10));
      if (until > new Date()) setLockedUntil(until);
    }
  }, []);

  const remainingLockSeconds = () => {
    if (!lockedUntil) return 0;
    const diff = Math.max(0, Math.floor((lockedUntil.getTime() - Date.now()) / 1000));
    return diff;
  };

  const validate = () => {
    let valid = true;
    setEmailError('');
    setPasswordError('');

    // تحقق البريد
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('الرجاء إدخال بريد إلكتروني صالح');
      valid = false;
    }

    // تحقق كلمة المرور
    if (!password || password.length < 6) {
      setPasswordError('كلمة المرور يجب ألا تقل عن 6 أحرف');
      valid = false;
    }

    return valid;
  };

  const recordFailedAttempt = () => {
    const attempts = parseInt(localStorage.getItem('login_failed_attempts') || '0', 10) + 1;
    localStorage.setItem('login_failed_attempts', attempts.toString());

    if (attempts >= MAX_ATTEMPTS) {
      const until = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      localStorage.setItem('login_lockout_until', until.getTime().toString());
      setLockedUntil(until);
    }
  };

  const resetAttempts = () => {
    localStorage.removeItem('login_failed_attempts');
    localStorage.removeItem('login_lockout_until');
    setLockedUntil(null);
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // منع المحاولة أثناء القفل
    if (lockedUntil && lockedUntil > new Date()) {
      setError('تم قفل تسجيل الدخول مؤقتًا بسبب محاولات فاشلة. الرجاء المحاولة لاحقًا.');
      return;
    }

    if (!validate()) return;

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // تفعيل التذكر: Supabase تخزن الجلسة في LocalStorage. يمكن إضافة كوكي حسب طلبك.
      if (rememberMe) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          document.cookie = `sb-access-token=${session.access_token}; max-age=604800; path=/; Secure; SameSite=Lax`;
          document.cookie = `sb-refresh-token=${session.refresh_token}; max-age=604800; path=/; Secure; SameSite=Lax`;
        }
      }

      resetAttempts();
      setSuccess('تم تسجيل الدخول بنجاح');

      // انتقال للصفحة التالية
      setTimeout(() => navigate('/subscriptions'), 600);
    } catch (err) {
      console.error('Login error:', err);
      recordFailedAttempt();
      setError('حدث خطأ أثناء تسجيل الدخول. يرجى التحقق من البريد الإلكتروني وكلمة المرور.');
    } finally {
      setLoading(false);
    }
  };

  // تسجيل دخول عبر جوجل
  const handleGoogleLogin = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/subscriptions' }
      });
      if (error) throw error;
    } catch (err) {
      console.error('Login error:', err);
      setError('حدث خطأ أثناء تسجيل الدخول عبر جوجل. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  // بديل 2FA بسيط: تسجيل دخول برمز يُرسل إلى البريد (OTP Email)
  const handleEmailOtp = async () => {
    setError('');
    setSuccess('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('الرجاء إدخال بريد إلكتروني صالح أولاً');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + '/subscriptions'
        }
      });
      if (error) throw error;
      setSuccess('تم إرسال رابط/رمز تسجيل الدخول إلى بريدك الإلكتروني');
    } catch (err) {
      console.error('OTP error:', err);
      setError('تعذر إرسال الرمز. حاول مرة أخرى لاحقًا.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-green-700 text-white p-4 shadow-md">
        <div className="flex items-center justify-center w-full">
          <div className="flex items-center space-x-2">
            <img src="/logo-momkn.png" alt="CollectPro" className="h-10 w-10" />
            <p className="text-xl font-bold">CollectPro</p>
          </div>
        </div>
        <h1 className="text-2xl font-bold mt-4 text-center w-full">تسجيل الدخول 🔐</h1>
      </header>

      <main className="flex-grow flex items-center justify-center p-4">
        {loading && (
          <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center animate-[fadeIn_0.2s_ease]">
              <p>جاري تحميل بيانات المصادقة...</p>
              <div className="mt-4 w-12 h-12 border-t-4 border-green-500 border-solid rounded-full animate-spin mx-auto"></div>
            </div>
          </div>
        )}

        <section className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-xl font-bold mb-1">مرحبًا بك 👋</h2>
          <p className="mb-4 text-gray-600">سجّل الدخول للمتابعة باستخدام حسابك</p>

          {/* رسائل النجاح/الخطأ */}
          {success && (
            <div className="mb-3 p-3 bg-green-100 text-green-700 rounded-md">{success}</div>
          )}
          {error && (
            <div className="mb-3 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>
          )}

          {/* تنبيه القفل المؤقت */}
          {lockedUntil && lockedUntil > new Date() && (
            <div className="mb-3 p-3 bg-yellow-100 text-yellow-800 rounded-md">
              تم قفل تسجيل الدخول لمدة قصيرة بسبب محاولات فاشلة. حاول بعد {Math.ceil(remainingLockSeconds() / 60)} دقيقة.
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 transition-transform duration-300 ease-in-out hover:scale-[1.01] focus:scale-[1.01]"
              />
              {emailError && <p className="text-xs text-red-600 mt-1">{emailError}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">كلمة المرور</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 transition-transform duration-300 ease-in-out hover:scale-[1.01] focus:scale-[1.01]"
              />
              {passwordError && <p className="text-xs text-red-600 mt-1">{passwordError}</p>}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded transition-transform duration-300 ease-in-out hover:scale-110"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">تذكرني</label>
              </div>
              <div className="text-sm">
                <a href="/reset-password" className="font-medium text-green-600 hover:text-green-500 transition-all duration-200 hover:underline">نسيت كلمة المرور؟</a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded flex items-center justify-center gap-2 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                disabled={lockedUntil && lockedUntil > new Date()}
              >
                <span>تسجيل الدخول</span>
              </button>
            </div>
          </form>

          {/* تسجيل عبر جوجل */}
          <div className="mt-4">
            <button
              onClick={handleGoogleLogin}
              className="w-full bg-white hover:bg-gray-100 text-gray-800 font-bold py-3 px-4 rounded flex items-center justify-center gap-2 border border-gray-300 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>تسجيل الدخول عبر جوجل</span>
            </button>
          </div>

          {/* بديل 2FA: تسجيل دخول برمز عبر البريد */}
          <div className="mt-3">
            <button
              onClick={handleEmailOtp}
              className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-semibold py-3 px-4 rounded border border-indigo-200 transition-transform duration-200 hover:scale-[1.02]"
            >
              تسجيل دخول برمز يصل إلى البريد
            </button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              ليس لديك حساب؟{' '}
              <a href="/signup" className="font-medium text-green-600 hover:text-green-500 transition-all duration-200 hover:underline">إنشاء حساب جديد</a>
            </p>
          </div>

          <div className="mt-4 text-xs text-gray-500 leading-5">
            - يعمل عبر HTTPS تلقائيًا عند النشر على Vercel.
            <br />- كلمات المرور تُدار وتُشفّر بواسطة Supabase.
            <br />- لتفعيل 2FA المتقدم لاحقًا، يُنصح بإضافته عبر خادم/Edge Functions.
          </div>
        </section>
      </main>

      <footer className="bg-gray-800 text-white p-4 text-center">
        <p>تم التصميم والتطوير بواسطة <strong>أيمن حافظ</strong></p>
      </footer>
    </div>
  );
};

export default LoginPage;