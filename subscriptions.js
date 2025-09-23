// ⚠️ ملاحظة: يفضل تخزين المفاتيح (keys) في متغيرات بيئة (Environment Variables)
// وعدم وضعها مكشوفة في الكود

// إعداد Supabase
const supabaseUrl = 'https://altnvsolaqphpndyztup.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // مختصر للحماية
let supabase;

// انتظر تحميل مكتبة supabase (لو بتتحمل عبر CDN)
window.addEventListener('supabaseLoaded', () => {
  if (window.supabase) {
    supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    console.log('✅ تم تهيئة Supabase بنجاح');
  } else {
    console.error('❌ فشل في تهيئة Supabase - المكتبة غير موجودة');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // تطبيق الوضع الليلي من التخزين
  applyDarkModeFromStorage();

  // إعداد مستمعي الأحداث
  setupEventListeners();

  // التحقق من حالة تسجيل الدخول
  checkAuthStatus();
});

function setupEventListeners() {
  // أزرار اختيار الخطة
  document.querySelectorAll('.select-plan-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.getAttribute('data-plan');
      const price = btn.getAttribute('data-price');

      // حفظ الخطة المختارة في التخزين المحلي
      localStorage.setItem('selectedPlan', plan);
      localStorage.setItem('selectedPrice', price);

      // التوجه لصفحة الدفع
      window.location.href = 'payment.html';
    });
  });

  // قسم الأسئلة الشائعة
  document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
      const faqItem = question.parentElement;
      faqItem.classList.toggle('active');
    });
  });

  // زر الوضع الليلي
  const toggleDarkBtn = document.getElementById('toggleDark');
  if (toggleDarkBtn) {
    toggleDarkBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      localStorage.setItem(
        'darkMode',
        document.body.classList.contains('dark') ? 'on' : 'off'
      );
    });
  }
}

async function checkAuthStatus() {
  try {
    if (!supabase) {
      console.warn('⚠️ لم يتم تهيئة Supabase بعد');
      return;
    }

    // لو حابب ترجع الجلسة الحالية:
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('❌ خطأ أثناء التحقق من الجلسة:', error.message);
      return;
    }

    if (session) {
      console.log('👤 مستخدم مسجل الدخول:', session.user.email);
      // هنا تقدر تنفذ أكواد خاصة بالمستخدم
    } else {
      console.log('🚪 لا يوجد مستخدم مسجل الدخول');
    }
  } catch (err) {
    console.error('❌ خطأ غير متوقع:', err);
  }
}
