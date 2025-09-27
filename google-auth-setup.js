/**
 * إعداد Google Auth لتطبيق CollectPro
 * يساعد في إعداد OAuth بشكل صحيح مع Supabase
 */

// إعداد Google Auth
const GoogleAuthSetup = {
  /**
   * إعداد Google OAuth Console
   */
  setupGoogleConsole() {
    console.log('🔧 إعداد Google OAuth Console...');
    console.log('');
    console.log('📋 خطوات إعداد Google OAuth:');
    console.log('1. اذهب إلى Google Cloud Console: https://console.cloud.google.com/');
    console.log('2. أنشئ مشروع جديد أو اختر موجود');
    console.log('3. فعل Google+ API');
    console.log('4. أنشئ OAuth 2.0 credentials');
    console.log('5. أضف redirect URI: ' + window.location.origin + '/auth-callback.html');
    console.log('');
    console.log('📝 المعلومات المطلوبة:');
    console.log('- Client ID');
    console.log('- Client Secret');
    console.log('');
  },

  /**
   * إعداد Supabase Auth
   */
  setupSupabaseAuth() {
    console.log('🔧 إعداد Supabase Auth...');
    console.log('');
    console.log('📋 خطوات إعداد Supabase:');
    console.log('1. اذهب إلى Supabase Dashboard');
    console.log('2. اختر مشروعك');
    console.log('3. اذهب إلى Authentication > Providers');
    console.log('4. فعل Google Provider');
    console.log('5. أدخل Client ID و Client Secret');
    console.log('6. أضف redirect URL: ' + window.location.origin + '/auth-callback.html');
    console.log('');
  },

  /**
   * اختبار Google Auth
   */
  async testGoogleAuth() {
    try {
      console.log('🧪 اختبار Google Auth...');

      // التحقق من إعدادات Supabase
      if (!window.appConfig?.supabaseUrl || !window.appConfig?.supabaseAnonKey) {
        console.log('⚠️ إعدادات Supabase غير مكتملة');
        this.showSetupInstructions();
        return false;
      }

      // التحقق من supabaseClient
      if (typeof window.supabaseClient === 'undefined') {
        console.log('⏳ في انتظار تحميل supabaseClient...');
        await this.waitForSupabaseClient();
      }

      if (typeof window.supabaseClient === 'undefined') {
        console.log('❌ supabaseClient غير متاح');
        return false;
      }

      console.log('✅ supabaseClient متاح');

      // اختبار بسيط للاتصال
      const { data, error } = await window.supabaseClient.auth.getSession();

      if (error) {
        console.log('⚠️ خطأ في الاتصال:', error.message);
        return false;
      }

      console.log('✅ الاتصال بـ Supabase يعمل');
      return true;

    } catch (error) {
      console.error('❌ خطأ في اختبار Google Auth:', error);
      return false;
    }
  },

  /**
   * انتظار تحميل supabaseClient
   */
  async waitForSupabaseClient() {
    let attempts = 0;
    const maxAttempts = 50;

    while (typeof window.supabaseClient === 'undefined' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
  },

  /**
   * عرض تعليمات الإعداد
   */
  showSetupInstructions() {
    console.log('');
    console.log('📚 تعليمات الإعداد:');
    console.log('====================');
    this.setupGoogleConsole();
    this.setupSupabaseAuth();

    console.log('💡 نصائح:');
    console.log('- تأكد من أن redirect URI صحيح');
    console.log('- تأكد من أن الإعدادات محفوظة');
    console.log('- جرب تسجيل الدخول في نافذة جديدة');
    console.log('- تحقق من console للأخطاء');
  },

  /**
   * إنشاء زر اختبار Google Auth
   */
  createTestButton() {
    const testButton = document.createElement('button');
    testButton.innerHTML = '🧪 اختبار Google Auth';
    testButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: #4285f4;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 25px;
      cursor: pointer;
      z-index: 1000;
      font-size: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;

    testButton.addEventListener('click', async () => {
      console.log('🧪 تشغيل اختبار Google Auth...');
      const success = await this.testGoogleAuth();

      if (success) {
        alert('✅ Google Auth يعمل بشكل صحيح!');
      } else {
        alert('❌ يرجى مراجعة الإعدادات');
        this.showSetupInstructions();
      }
    });

    document.body.appendChild(testButton);
  },

  /**
   * تهيئة النظام
   */
  init() {
    // إضافة زر الاختبار في وضع التطوير
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      setTimeout(() => {
        this.createTestButton();
      }, 2000);
    }

    console.log('🔧 تم تهيئة Google Auth Setup');
  }
};

// تهيئة النظام
document.addEventListener('DOMContentLoaded', () => {
  GoogleAuthSetup.init();
});

// تصدير النظام
window.GoogleAuthSetup = GoogleAuthSetup;