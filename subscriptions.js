// إعداد Supabase
const supabaseUrl = 'https://altnvsolaqphpndyztup.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdG52c29sYXFwaHBuZHl6dHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjI2ODUsImV4cCI6MjA3MzYzODY4NX0.LOvdanWvNL1DaScTDTyXSAbi_4KX_jnJFB1WEdtb-GI';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
  // تطبيق الوضع الليلي
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
      localStorage.setItem('darkMode', document.body.classList.contains('dark') ? 'on' : 'off');
    });
  }
}

async function checkAuthStatus() {
  // التحقق من وجود جلسة مستخدم
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // إذا لم يكن المستخدم مسجلاً، توجيهه لصفحة تسجيل الدخول
    window.location.href = 'login.html';
  }
}