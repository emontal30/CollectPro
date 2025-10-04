// إعداد Supabase
console.log('بدء تحميل subscriptions.js');
console.log('env object:', window.env);

const supabaseUrl = window.env.SUPABASE_URL;
const supabaseKey = window.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('خطأ: متغيرات البيئة مفقودة');
  alert('خطأ في إعدادات البيئة. يرجى التحقق من ملف env.js');
}

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? 'تم التحميل' : 'مفقود');

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
console.log('تم إنشاء Supabase client');

document.addEventListener('DOMContentLoaded', () => {
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
}

async function checkAuthStatus() {
  // التحقق من وجود جلسة مستخدم
  const { data: { user } } = await supabase.auth.getUser();
  
  // تم التعديل: السماح بالوصول للصفحة بدون تسجيل دخول
  // if (!user) {
  //   // إذا لم يكن المستخدم مسجلاً، توجيهه لصفحة تسجيل الدخول
  //   window.location.href = 'index.html';
  // }
}