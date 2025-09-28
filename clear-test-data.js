/**
 * مسح البيانات التجريبية وإجبار النظام على استخدام البيانات الحقيقية
 * يحل مشكلة عرض بيانات المستخدم الوهمية في الشريط الجانبي
 */

// مسح البيانات التجريبية
function clearTestData() {
  try {
    console.log('🧹 مسح البيانات التجريبية...');

    // مسح بيانات المستخدم الوهمية
    localStorage.removeItem('user');
    localStorage.removeItem('supabaseUser');
    localStorage.removeItem('authProvider');
    localStorage.removeItem('session_expiry');

    // مسح أي بيانات تبدأ بـ test
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('test') ||
        key.includes('mock') ||
        key.includes('fake')
      )) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('🗑️ تم حذف:', key);
    });

    console.log('✅ تم مسح البيانات التجريبية');

    // إعادة تحميل الصفحة لتحديث البيانات
    setTimeout(() => {
      window.location.reload();
    }, 1000);

    return true;
  } catch (error) {
    console.error('❌ خطأ في مسح البيانات:', error);
    return false;
  }
}

// إضافة زر مسح البيانات التجريبية
function addClearTestDataButton() {
  const button = document.createElement('button');
  button.innerHTML = '🧹 مسح البيانات التجريبية';
  button.style.cssText = `
    position: fixed;
    bottom: 70px;
    left: 20px;
    background: #ff6b6b;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 25px;
    cursor: pointer;
    z-index: 1000;
    font-size: 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;

  button.addEventListener('click', () => {
    if (confirm('هل أنت متأكد من مسح البيانات التجريبية؟')) {
      clearTestData();
    }
  });

  document.body.appendChild(button);
}

// تشغيل المسح التلقائي عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  // إضافة زر المسح في وضع التطوير فقط
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    setTimeout(() => {
      addClearTestDataButton();
    }, 3000);
  }

  // مسح تلقائي للبيانات التجريبية
  console.log('🔍 فحص البيانات المحفوظة...');
  const testData = localStorage.getItem('supabaseUser') || localStorage.getItem('user');

  if (testData) {
    try {
      // فحص إذا كانت البيانات JSON صالح قبل التحليل
      if (testData.trim().startsWith('{') && testData.trim().endsWith('}')) {
        const userData = JSON.parse(testData);
        if (userData && (
          userData.email === 'test@example.com' ||
          userData.provider === 'test' ||
          userData.name === 'مستخدم تجريبي'
        )) {
          console.log('⚠️ تم العثور على بيانات تجريبية، جاري المسح...');
          clearTestData();
        }
      } else {
        // البيانات ليست JSON، تحقق من النص مباشرة
        if (testData.includes('test@example.com') ||
            testData.includes('مستخدم تجريبي')) {
          console.log('⚠️ تم العثور على بيانات تجريبية، جاري المسح...');
          clearTestData();
        }
      }
    } catch (error) {
      console.warn('خطأ في فحص البيانات:', error);
      // في حالة خطأ في التحليل، تحقق من النص مباشرة
      if (testData.includes('test@example.com') ||
          testData.includes('مستخدم تجريبي')) {
        console.log('⚠️ تم العثور على بيانات تجريبية، جاري المسح...');
        clearTestData();
      }
    }
  }
});

// تصدير الدالة
window.clearTestData = clearTestData;