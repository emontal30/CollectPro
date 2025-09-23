// ========== نظام المساعدة والدعم ========== //

// نظام المساعدة والدعم
class HelpSystem {
  constructor() {
    this.helpArticles = [];
    this.currentArticle = null;
    this.searchQuery = '';
    this.init();
  }

  // التهيئة
  init() {
    // تحميل مقالات المساعدة
    this.loadHelpArticles();

    // إنشاء زر المساعدة
    this.createHelpButton();

    // إنشاء واجهة المساعدة
    this.createHelpInterface();

    // إضافة مستمعي الأحداث
    this.setupEventListeners();
  }

  // تحميل مقالات المساعدة
  async loadHelpArticles() {
    try {
      const config = window.AppConfig || {};
      const supabaseUrl = config.supabase?.url;
      const supabaseAnonKey = config.supabase?.anonKey;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('إعدادات Supabase غير مكتملة');
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/help_articles?order=category,order`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });

      if (!response.ok) {
        throw new Error('فشل جلب مقالات المساعدة');
      }

      this.helpArticles = await response.json();
    } catch (error) {
      console.error('خطأ في تحميل مقالات المساعدة:', error);

      // استخدام مقالات المساعدة الافتراضية
      this.helpArticles = [
        {
          id: 1,
          title: 'كيفية تسجيل الدخول',
          content: 'للتسجيل الدخول، اضغط على زر "تسجيل الدخول" في الزاوية العلوية اليمنى من الشاشة. أدخل بريدك الإلكتروني وكلمة المرور، ثم اضغط على "دخول".',
          category: 'المصادقة',
          order: 1
        },
        {
          id: 2,
          title: 'كيفية إنشاء حساب جديد',
          content: 'لإنشاء حساب جديد، اضغط على زر "إنشاء حساب" في صفحة تسجيل الدخول. املأ البيانات المطلوبة واضغط على "إنشاء الحساب".',
          category: 'المصادقة',
          order: 2
        },
        {
          id: 3,
          title: 'كيفية إضافة تحصيل جديد',
          content: 'لإضافة تحصيل جديد، انتقل إلى صفحة "التحصيل" من القائمة الجانبية. اضغط على زر "إضافة تحصيل" واملأ البيانات المطلوبة.',
          category: 'التحصيل',
          order: 1
        },
        {
          id: 4,
          title: 'كيفية عرض الأرشيف',
          content: 'لعرض الأرشيف، انتقل إلى صفحة "الأرشيف" من القائمة الجانبية. يمكنك البحث عن تحصيلات محددة باستخدام أدوات البحث المتوفرة.',
          category: 'الأرشيف',
          order: 1
        },
        {
          id: 5,
          title: 'كيفية إدارة الاشتراكات',
          content: 'لإدارة اشتراكاتك، انتقل إلى صفحة "الاشتراكات" من القائمة الجانبية. يمكنك هنا عرض اشتراكاتك الحالية وتجديدها.',
          category: 'الاشتراكات',
          order: 1
        }
      ];
    }
  }

  // إنشاء زر المساعدة
  createHelpButton() {
    const helpButton = document.createElement('button');
    helpButton.className = 'help-button';
    helpButton.innerHTML = '<i class="fas fa-question-circle"></i> المساعدة';
    helpButton.title = 'فتح نظام المساعدة';

    document.body.appendChild(helpButton);

    helpButton.addEventListener('click', () => {
      this.toggleHelpInterface();
    });
  }

  // إنشاء واجهة المساعدة
  createHelpInterface() {
    const helpInterface = document.createElement('div');
    helpInterface.className = 'help-interface';
    helpInterface.innerHTML = `
      <div class="help-header">
        <h2>نظام المساعدة</h2>
        <button class="close-help"><i class="fas fa-times"></i></button>
      </div>
      <div class="help-search">
        <input type="text" placeholder="ابحث في مقالات المساعدة..." id="help-search-input">
      </div>
      <div class="help-categories">
        <h3>التصنيفات</h3>
        <div class="category-list" id="help-category-list"></div>
      </div>
      <div class="help-articles">
        <h3 id="help-category-title">جميع المقالات</h3>
        <div class="article-list" id="help-article-list"></div>
      </div>
      <div class="help-article-content" id="help-article-content"></div>
    `;

    document.body.appendChild(helpInterface);

    // إغلاق الواجهة عند النقر خارجها
    helpInterface.addEventListener('click', (e) => {
      if (e.target === helpInterface) {
        this.closeHelpInterface();
      }
    });

    // إغلاق الواجهة عند النقر على زر الإغلاق
    const closeButton = helpInterface.querySelector('.close-help');
    closeButton.addEventListener('click', () => {
      this.closeHelpInterface();
    });

    // إضافة مستمع البحث
    const searchInput = helpInterface.querySelector('#help-search-input');
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.displayArticles();
    });
  }

  // إعداد مستمعي الأحداث
  setupEventListeners() {
    // مستمع لتغيير حجم الشاشة
    window.addEventListener('resize', () => {
      this.adjustHelpInterface();
    });
  }

  // تبديل واجهة المساعدة
  toggleHelpInterface() {
    const helpInterface = document.querySelector('.help-interface');
    if (helpInterface.classList.contains('active')) {
      this.closeHelpInterface();
    } else {
      this.openHelpInterface();
    }
  }

  // فتح واجهة المساعدة
  openHelpInterface() {
    const helpInterface = document.querySelector('.help-interface');
    helpInterface.classList.add('active');
    this.displayCategories();
    this.displayArticles();
    this.adjustHelpInterface();
  }

  // إغلاق واجهة المساعدة
  closeHelpInterface() {
    const helpInterface = document.querySelector('.help-interface');
    helpInterface.classList.remove('active');
    this.currentArticle = null;
  }

  // تعديل حجم واجهة المساعدة
  adjustHelpInterface() {
    const helpInterface = document.querySelector('.help-interface');
    const width = window.innerWidth;

    if (width < 768) {
      helpInterface.classList.add('mobile');
    } else {
      helpInterface.classList.remove('mobile');
    }
  }

  // عرض التصنيفات
  displayCategories() {
    const categoryList = document.querySelector('#help-category-list');
    categoryList.innerHTML = '';

    // تجميع المقالات حسب التصنيف
    const categories = {};
    this.helpArticles.forEach(article => {
      if (!categories[article.category]) {
        categories[article.category] = [];
      }
      categories[article.category].push(article);
    });

    // إنشاء قائمة التصنيفات
    Object.keys(categories).forEach(category => {
      const categoryItem = document.createElement('div');
      categoryItem.className = 'category-item';
      categoryItem.textContent = category;
      categoryItem.addEventListener('click', () => {
        this.displayCategoryArticles(category);
      });
      categoryList.appendChild(categoryItem);
    });
  }

  // عرض المقالات حسب التصنيف
  displayCategoryArticles(category) {
    const categoryTitle = document.querySelector('#help-category-title');
    categoryTitle.textContent = category;

    this.displayArticles(category);
  }

  // عرض المقالات
  displayArticles(category = null) {
    const articleList = document.querySelector('#help-article-list');
    articleList.innerHTML = '';

    // فلترة المقالات حسب التصنيف والبحث
    let filteredArticles = this.helpArticles;

    if (category) {
      filteredArticles = filteredArticles.filter(article => article.category === category);
    }

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filteredArticles = filteredArticles.filter(article => 
        article.title.toLowerCase().includes(query) || 
        article.content.toLowerCase().includes(query)
      );
    }

    // عرض المقالات
    filteredArticles.forEach(article => {
      const articleItem = document.createElement('div');
      articleItem.className = 'article-item';
      articleItem.innerHTML = `
        <h4>${article.title}</h4>
        <p>${article.content.substring(0, 100)}...</p>
      `;
      articleItem.addEventListener('click', () => {
        this.displayArticle(article);
      });
      articleList.appendChild(articleItem);
    });
  }

  // عرض مقال محدد
  displayArticle(article) {
    this.currentArticle = article;
    const articleContent = document.querySelector('#help-article-content');
    articleContent.innerHTML = `
      <h3>${article.title}</h3>
      <div class="article-body">${article.content}</div>
    `;
    articleContent.classList.add('active');
  }
}

// نظام الدعم
class SupportSystem {
  constructor() {
    this.tickets = [];
    this.currentTicket = null;
    this.init();
  }

  // التهيئة
  init() {
    // إنشاء زر الدعم
    this.createSupportButton();

    // إنشاء واجهة الدعم
    this.createSupportInterface();

    // إضافة مستمعي الأحداث
    this.setupEventListeners();
  }

  // إنشاء زر الدعم
  createSupportButton() {
    const supportButton = document.createElement('button');
    supportButton.className = 'support-button';
    supportButton.innerHTML = '<i class="fas fa-headset"></i> الدعم';
    supportButton.title = 'فتح نظام الدعم';

    document.body.appendChild(supportButton);

    supportButton.addEventListener('click', () => {
      this.toggleSupportInterface();
    });
  }

  // إنشاء واجهة الدعم
  createSupportInterface() {
    const supportInterface = document.createElement('div');
    supportInterface.className = 'support-interface';
    supportInterface.innerHTML = `
      <div class="support-header">
        <h2>نظام الدعم</h2>
        <button class="close-support"><i class="fas fa-times"></i></button>
      </div>
      <div class="support-tabs">
        <button class="tab active" data-tab="tickets">الطلبات</button>
        <button class="tab" data-tab="new-ticket">طلب دعم جديد</button>
        <button class="tab" data-tab="faq">الأسئلة الشائعة</button>
      </div>
      <div class="support-content">
        <div class="tab-content active" id="tickets-content">
          <div class="tickets-list" id="tickets-list"></div>
        </div>
        <div class="tab-content" id="new-ticket-content">
          <form id="new-ticket-form">
            <div class="form-group">
              <label for="ticket-subject">الموضوع</label>
              <input type="text" id="ticket-subject" required>
            </div>
            <div class="form-group">
              <label for="ticket-category">التصنيف</label>
              <select id="ticket-category" required>
                <option value="">اختر التصنيف</option>
                <option value="technical">مشاكل تقنية</option>
                <option value="billing">مشاكل الدفع والاشتراك</option>
                <option value="account">مشاكل الحساب</option>
                <option value="other">أخرى</option>
              </select>
            </div>
            <div class="form-group">
              <label for="ticket-message">الرسالة</label>
              <textarea id="ticket-message" required></textarea>
            </div>
            <button type="submit">إ الطلب</button>
          </form>
        </div>
        <div class="tab-content" id="faq-content">
          <div class="faq-list" id="faq-list"></div>
        </div>
      </div>
    `;

    document.body.appendChild(supportInterface);

    // إغلاق الواجهة عند النقر خارجها
    supportInterface.addEventListener('click', (e) => {
      if (e.target === supportInterface) {
        this.closeSupportInterface();
      }
    });

    // إغلاق الواجهة عند النقر على زر الإغلاق
    const closeButton = supportInterface.querySelector('.close-support');
    closeButton.addEventListener('click', () => {
      this.closeSupportInterface();
    });

    // إضافة مستخدمي الأحداث للتبويب
    const tabs = supportInterface.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.dataset.tab);
      });
    });

    // إضافة مستخدمي الأحداث للنموذج
    const form = supportInterface.querySelector('#new-ticket-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitTicket();
    });
  }

  // إعداد مستمعي الأحداث
  setupEventListeners() {
    // مستخدم لتغيير حجم الشاشة
    window.addEventListener('resize', () => {
      this.adjustSupportInterface();
    });
  }

  // تبديل واجهة الدعم
  toggleSupportInterface() {
    const supportInterface = document.querySelector('.support-interface');
    if (supportInterface.classList.contains('active')) {
      this.closeSupportInterface();
    } else {
      this.openSupportInterface();
    }
  }

  // فتح واجهة الدعم
  openSupportInterface() {
    const supportInterface = document.querySelector('.support-interface');
    supportInterface.classList.add('active');
    this.displayTickets();
    this.adjustSupportInterface();
  }

  // إغلاق واجهة الدعم
  closeSupportInterface() {
    const supportInterface = document.querySelector('.support-interface');
    supportInterface.classList.remove('active');
    this.currentTicket = null;
  }

  // تعديل حجم واجهة الدعم
  adjustSupportInterface() {
    const supportInterface = document.querySelector('.support-interface');
    const width = window.innerWidth;

    if (width < 768) {
      supportInterface.classList.add('mobile');
    } else {
      supportInterface.classList.remove('mobile');
    }
  }

  // التبديب بين التبويبات
  switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    tabContents.forEach(content => {
      if (content.id === `${tabName}-content`) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });

    // تحميل المحتوى حسب التبويب
    if (tabName === 'tickets') {
      this.displayTickets();
    } else if (tabName === 'faq') {
      this.displayFAQ();
    }
  }

  // عرض الطلبات
  displayTickets() {
    const ticketsList = document.querySelector('#tickets-list');
    ticketsList.innerHTML = '';

    // تحميل الطلبات من التخزين المحلي
    const storedTickets = localStorage.getItem('supportTickets');
    if (storedTickets) {
      this.tickets = JSON.parse(storedTickets);
    }

    // عرض الطلبات
    if (this.tickets.length === 0) {
      ticketsList.innerHTML = '<p>لا توجد طلبات سابقة</p>';
    } else {
      this.tickets.forEach(ticket => {
        const ticketItem = document.createElement('div');
        ticketItem.className = 'ticket-item';
        ticketItem.innerHTML = `
          <div class="ticket-header">
            <h4>${ticket.subject}</h4>
            <span class="ticket-status ${ticket.status}">${ticket.status}</span>
          </div>
          <div class="ticket-category">${ticket.category}</div>
          <div class="ticket-preview">${ticket.message.substring(0, 100)}...</div>
          <div class="ticket-date">${new Date(ticket.createdAt).toLocaleDateString()}</div>
        `;
        ticketItem.addEventListener('click', () => {
          this.displayTicket(ticket);
        });
        ticketsList.appendChild(ticketItem);
      });
    }
  }

  // عرض طلب دعم محدد
  displayTicket(ticket) {
    this.currentTicket = ticket;
    const ticketsList = document.querySelector('#tickets-list');
    ticketsList.innerHTML = `
      <div class="ticket-detail">
        <div class="ticket-header">
          <h3>${ticket.subject}</h3>
          <span class="ticket-status ${ticket.status}">${ticket.status}</span>
        </div>
        <div class="ticket-category">التصنيف: ${ticket.category}</div>
        <div class="ticket-message">${ticket.message}</div>
        <div class="ticket-date">تاريخ الطلب: ${new Date(ticket.createdAt).toLocaleString()}</div>
        <div class="ticket-response">
          <h4>الرد من الدعم:</h4>
          <p>${ticket.response || 'في انتظار الرد من فريق الدعم'}</p>
        </div>
        <button class="back-to-tickets">العودة إلى الطلبات</button>
      </div>
    `;

    // إضافة مستمع للعودة إلى قائمة الطلبات
    const backButton = ticketsList.querySelector('.back-to-tickets');
    backButton.addEventListener('click', () => {
      this.displayTickets();
    });
  }

  // إرسال طلب دعم جديد
  submitTicket() {
    const subject = document.querySelector('#ticket-subject').value;
    const category = document.querySelector('#ticket-category').value;
    const message = document.querySelector('#ticket-message').value;

    const ticket = {
      id: Date.now(),
      subject,
      category,
      message,
      status: 'open',
      createdAt: new Date().toISOString(),
      response: ''
    };

    // إضافة الطلب إلى قائمة الطلبات
    this.tickets.push(ticket);
    localStorage.setItem('supportTickets', JSON.stringify(this.tickets));

    // عرض رسالة نجاح
    alert('تم إرسال طلب الدعم بنجاح. سيتم الرد عليك في أقرب وقت ممكن.');

    // إعادة تعيين النموذج والعودة إلى قائمة الطلبات
    document.querySelector('#new-ticket-form').reset();
    this.switchTab('tickets');
    this.displayTickets();
  }

  // عرض الأسئلة الشائعة
  displayFAQ() {
    const faqList = document.querySelector('#faq-list');
    faqList.innerHTML = '';

    const faqs = [
      {
        question: 'كيف يمكنني تغيير كلمة المرور؟',
        answer: 'يمكنك تغيير كلمة المرور من خلال الانتقال إلى صفحة الحساب واختيار "تغيير كلمة المرور".'
      },
      {
        question: 'كيف يمكنني تجديد اشتراكي؟',
        answer: 'يمكنك تجديد اشتراكك من خلال صفحة "الاشتراكات" بالنقر على زر "تجديد الاشتراك".'
      },
      {
        question: 'كيف يمكنني حذف حسابي؟',
        answer: 'لحذف حسابك، اتصل بفريق الدعم وسيساعدك في عملية حذف الحساب.'
      },
      {
        question: 'هل يتم تخزين بياناتي بشكل آمن؟',
        answer: 'نعم، يتم تشفير بياناتك وتخزينها بشكل آمن باستخدام أحدث تقنيات التشفير.'
      }
    ];

    faqs.forEach(faq => {
      const faqItem = document.createElement('div');
      faqItem.className = 'faq-item';
      faqItem.innerHTML = `
        <h4>${faq.question}</h4>
        <p>${faq.answer}</p>
      `;
      faqList.appendChild(faqItem);
    });
  }
}

// إنشاء مثيلات من الفئات
const helpSystem = new HelpSystem();
const supportSystem = new SupportSystem();

// تصدير وحدة المساعدة والدعم
window.HelpSystem = {
  helpSystem,
  supportSystem
};

// تهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  // لا حاجة لتهيئة إضافية هنا
});
