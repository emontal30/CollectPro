// رسالة منبثقة احترافية لتثبيت التطبيق
class InstallPrompt {
  constructor() {
    this.overlay = null;
    this.modal = null;
    this.deferredPrompt = null;
    this.hasBeenShown = false;
    this.init();
  }

  init() {
    this.createHTML();
    this.bindEvents();
    this.setupPWAInstall();
    
    // إظهار الرسالة بعد تحميل الصفحة بـ 3 ثواني
    setTimeout(() => {
      this.checkAndShow();
    }, 3000);
  }

  createHTML() {
    // إنشاء الهيكل الأساسي للرسالة
    const overlayHTML = `
      <div class="install-prompt-overlay" id="installPromptOverlay">
        <div class="install-prompt-modal">
          <div class="install-prompt-header">
            <button class="install-prompt-close" id="installPromptClose">
              <i class="fas fa-times"></i>
            </button>
            <img src="/icon-512x512.png" alt="شعار CollectPro" class="install-prompt-logo">
            <h2 class="install-prompt-title">ثبت تطبيق CollectPro</h2>
            <p class="install-prompt-subtitle">احصل على تجربة استخدام أسهل وأسرع</p>
          </div>
          <div class="install-prompt-body">
            <p class="install-prompt-description">
              ثبت التطبيق على الهاتف للوصول الفوري ومميزات حصرية
            </p>
            <div class="install-prompt-features">
              <div class="install-prompt-feature">
                <i class="fas fa-bolt"></i>
                <span>وصول فوري دون الحاجة للمتصفح</span>
              </div>
              <div class="install-prompt-feature">
                <i class="fas fa-mobile-alt"></i>
                <span>تجربة مخصصة للهاتف المحمول</span>
              </div>
              <div class="install-prompt-feature">
                <i class="fas fa-star"></i>
                <span>مميزات حصرية للمستخدمين</span>
              </div>
            </div>
            <div class="install-prompt-actions">
              <button class="install-prompt-btn install-prompt-btn-primary" id="installBtn">
                <i class="fas fa-download"></i>
                <span>تثبيت</span>
              </button>
              <button class="install-prompt-btn install-prompt-btn-secondary" id="laterBtn">
                <i class="fas fa-clock"></i>
                <span>لاحقاً</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // إضافة الرسالة للصفحة
    document.body.insertAdjacentHTML('beforeend', overlayHTML);
    
    // الحصول على العناصر
    this.overlay = document.getElementById('installPromptOverlay');
    this.modal = this.overlay.querySelector('.install-prompt-modal');
  }

  bindEvents() {
    // زر الإغلاق
    const closeBtn = document.getElementById('installPromptClose');
    closeBtn.addEventListener('click', () => this.hide());

    // زر التثبيت
    const installBtn = document.getElementById('installBtn');
    installBtn.addEventListener('click', () => this.handleInstall());

    // زر لاحقاً
    const laterBtn = document.getElementById('laterBtn');
    laterBtn.addEventListener('click', () => this.hide());

    // النقر على الخلفية للإغلاق
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    // زر ESC للإغلاق
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay.classList.contains('show')) {
        this.hide();
      }
    });
  }

  setupPWAInstall() {
    // الاستماع لأحداث تثبيت PWA
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
    });

    // التحقق مما إذا كان التطبيق مثبتاً بالفعل
    window.addEventListener('appinstalled', () => {
      console.log('تم تثبيت التطبيق بنجاح');
      this.hide();
      this.showSuccessMessage();
    });
  }

  checkAndShow() {
    // عدم الإظهار إذا كان التطبيق مثبتاً
    if (this.isAppInstalled()) {
      return;
    }

    // دائماً أظهر الرسالة للمستخدمين في المتصفح
    // بغض النظر عن عدد الزيارات أو الضغط على "لاحقاً"
    this.show();
  }

  isAppInstalled() {
    // التحقق مما إذا كان التطبيق مثبتاً
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://');
  }

  show() {
    if (this.overlay && !this.overlay.classList.contains('show')) {
      this.overlay.classList.add('show');
      document.body.style.overflow = 'hidden'; // منع التمرير في الخلفية
    }
  }

  hide() {
    if (this.overlay && this.overlay.classList.contains('show')) {
      this.overlay.classList.remove('show');
      document.body.style.overflow = ''; // استعادة التمرير
    }
  }

  handleInstall() {
    if (this.deferredPrompt) {
      // تثبيت PWA مباشرة
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('قبل المستخدم تثبيت التطبيق');
          this.hide();
        } else {
          console.log('رفض المستخدم تثبيت التطبيق');
        }
        this.deferredPrompt = null;
      });
    } else {
      // إذا لم يكن هناك PWA prompt، فقط أغلق الرسالة
      // لا تظهر أي رسائل تعليمات
      this.hide();
    }
  }

  showInstallInstructions() {
    const instructions = `
      <div style="text-align: right; padding: 20px;">
        <h3 style="color: var(--primary); margin-bottom: 15px;">كيفية تثبيت التطبيق:</h3>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
          <p style="margin: 10px 0;"><strong>على أجهزة Android:</strong></p>
          <ol style="margin-right: 20px;">
            <li>اضغط على أيقونة القائمة (ثلاث نقاط) في المتصفح</li>
            <li>اختر "إضافة إلى الشاشة الرئيسية" أو "تثبيت التطبيق"</li>
            <li>اضغط على "إضافة" أو "تثبيت"</li>
          </ol>
        </div>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 10px;">
          <p style="margin: 10px 0;"><strong>على أجهزة iPhone/iPad:</strong></p>
          <ol style="margin-right: 20px;">
            <li>اضغط على أيقونة المشاركة (صندوق مع سهم لأعلى)</li>
            <li>اختر "إضافة إلى الشاشة الرئيسية"</li>
            <li>اضغط على "إضافة" في الأعلى</li>
          </ol>
        </div>
      </div>
    `;

    // استبدال محتوى الرسالة بالتعليمات
    const body = this.modal.querySelector('.install-prompt-body');
    body.innerHTML = instructions;
    
    // إضافة زر إغلاق جديد
    const closeHTML = `
      <div style="text-align: center; margin-top: 20px;">
        <button class="install-prompt-btn install-prompt-btn-secondary" onclick="installPrompt.hide()">
          <i class="fas fa-times"></i>
          <span>إغلاق</span>
        </button>
      </div>
    `;
    body.insertAdjacentHTML('beforeend', closeHTML);
  }

  showSuccessMessage() {
    const successHTML = `
      <div style="text-align: center; padding: 30px;">
        <i class="fas fa-check-circle" style="font-size: 48px; color: #27ae60; margin-bottom: 20px;"></i>
        <h3 style="color: #27ae60; margin-bottom: 15px;">شكراً لك!</h3>
        <p style="color: #555;">تم تثبيت التطبيق بنجاح. يمكنك الآن الوصول إليه من الشاشة الرئيسية.</p>
      </div>
    `;

    const body = this.modal.querySelector('.install-prompt-body');
    body.innerHTML = successHTML;
    
    // إغلاق تلقائي بعد 3 ثواني
    setTimeout(() => {
      this.hide();
    }, 3000);
  }

  // دالة لإعادة تعيين الإعدادات (للاختبار)
  reset() {
    localStorage.removeItem('visitCount');
    localStorage.removeItem('lastVisit');
    localStorage.removeItem('installPromptShown');
    localStorage.removeItem('installPromptDate');
    this.hasBeenShown = false;
  }

  // دالة لمسح بيانات التخزين المؤقت للرسالة
  clearStorage() {
    localStorage.removeItem('installPromptShown');
    localStorage.removeItem('installPromptDate');
    this.hasBeenShown = false;
  }
}

// تهيئة الرسالة المنبثقة
let installPrompt;
document.addEventListener('DOMContentLoaded', () => {
  installPrompt = new InstallPrompt();
});

// إتاحة الوصول من الكونسول للاختبار
window.installPrompt = installPrompt;
