// ========== نظام تتبع الأخطاء ========== //

// نظام تتبع الأخطاء
class BugTracker {
  constructor() {
    this.bugs = [];
    this.currentBug = null;
    this.init();
  }

  // التهيئة
  init() {
    // تحميل قائمة الأخطاء
    this.loadBugs();

    // إنشاء زر تتبع الأخطاء
    this.createBugButton();

    // إضافة مستمعي الأخطاء
    this.setupErrorListeners();
  }

  // تحميل قائمة الأخطاء
  async loadBugs() {
    try {
      const config = window.AppConfig || {};
      const supabaseUrl = config.supabase?.url;
      const supabaseAnonKey = config.supabase?.anonKey;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('إعدادات Supabase غير مكتملة');
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/bugs?order=created_at.desc`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });

      if (!response.ok) {
        throw new Error('فشل ج قائمة الأخطاء');
      }

      this.bugs = await response.json();
    } catch (error) {
      console.error('خطأ في تحميل قائمة الأخطاء:', error);

      // استخدام قائمة الأخطاء الافتراضية
      this.bugs = [
        {
          id: 1,
          title: 'مشكلة في تسجيل الدخول',
          description: 'لا يمكن للمستخدمين تسجيل الدخول باستخدام حساباتهم',
          status: 'open',
          priority: 'high',
          category: 'المصادقة',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          title: 'مشكلة في عرض التحصيلات',
          description: 'لا تظهر التحصيلات بشكل صحيح في صفحة الأرشيف',
          status: 'in-progress',
          priority: 'medium',
          category: 'التحصيل',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 3,
          title: 'مشكلة في التصميم المتجاوب',
          description: 'لا يعمل التصميم بشكل صحيح على الشاشات الصغيرة',
          status: 'open',
          priority: 'low',
          category: 'واجهة المستخدم',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
    }
  }

  // إنشاء زر تتبع الأخطاء
  createBugButton() {
    const bugButton = document.createElement('button');
    bugButton.className = 'bug-button';
    bugButton.innerHTML = '<i class="fas fa-bug"></i> تتبع الأخطاء';
    bugButton.title = 'إدارة الأخطاء والمشاكل';

    document.body.appendChild(bugButton);

    bugButton.addEventListener('click', () => {
      this.showBugTracker();
    });
  }

  // إعداد مستمعي الأخطاء
  setupErrorListeners() {
    // مستمع الأخطاء غير الملتقمة
    window.addEventListener('error', (event) => {
      this.reportBug({
        title: `خطأ في JavaScript: ${event.message}`,
        description: `حدث خطأ في الملف ${event.filename} على السطر ${event.lineno}, العمود ${event.colno}`,
        category: 'JavaScript',
        priority: 'high',
        stackTrace: event.error?.stack
      });
    });

    // مستخدمي الأخطاء في الطلبات
    window.addEventListener('unhandledrejection', (event) => {
      this.reportBug({
        title: `خطأ في Promise: ${event.reason?.message || String(event.reason)}`,
        description: `فشلت Promise غير المُدارة`,
        category: 'JavaScript',
        priority: 'high',
        stackTrace: event.reason?.stack
      });
    });
  }

  // إبلاغ عن خطأ
  async reportBug(bugData) {
    try {
      const config = window.AppConfig || {};
      const supabaseUrl = config.supabase?.url;
      const supabaseAnonKey = config.supabase?.anonKey;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('إعدادات Supabase غير مكتملة');
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/bugs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          ...bugData,
          status: 'open',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('فشل الإبلاغ عن الخطأ');
      }

      const newBug = await response.json();
      this.bugs.push(newBug);

      return {
        success: true,
        bug: newBug
      };
    } catch (error) {
      console.error('خطأ في الإبلاغ عن الخطأ:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // عرض نظام تتبع الأخطاء
  showBugTracker() {
    const tracker = document.createElement('div');
    tracker.className = 'bug-tracker';
    tracker.innerHTML = `
      <div class="bug-tracker-header">
        <h2>نظام تتبع الأخطاء</h2>
        <button class="close-tracker"><i class="fas fa-times"></i></button>
      </div>
      <div class="bug-tracker-tabs">
        <button class="tab active" data-tab="list">قائمة الأخطاء</button>
        <button class="tab" data-tab="new">إبلاغ عن خطأ</button>
        <button class="tab" data-tab="statistics">إحصائيات</button>
      </div>
      <div class="bug-tracker-content">
        <div class="tab-content active" id="list-content">
          <div class="bug-filters">
            <select id="bug-status-filter">
              <option value="">جميع الحالات</option>
              <option value="open">مفتوح</option>
              <option value="in-progress">قيد المعالجة</option>
              <option value="resolved">تم حله</option>
              <option value="closed">مغلق</option>
            </select>
            <select id="bug-priority-filter">
              <option value="">جميع الأولويات</option>
              <option value="low">منخفض</option>
              <option value="medium">متوسط</option>
              <option value="high">عالي</option>
            </select>
            <select id="bug-category-filter">
              <option value="">جميع التصنيفات</option>
              <option value="JavaScript">JavaScript</option>
              <option value="المصادقة">المصادقة</option>
              <option value="التحصيل">التحصيل</option>
              <option value="واجهة المستخدم">واجهة المستخدم</option>
            </select>
            <input type="text" id="bug-search" placeholder="بحث في الأخطاء...">
          </div>
          <div class="bug-list" id="bug-list"></div>
        </div>
        <div class="tab-content" id="new-content">
          <form id="new-bug-form">
            <div class="form-group">
              <label for="bug-title">عنوان الخطأ</label>
              <input type="text" id="bug-title" required>
            </div>
            <div class="form-group">
              <label for="bug-description">الوصف</label>
              <textarea id="bug-description" required></textarea>
            </div>
            <div class="form-group">
              <label for="bug-category">التصنيف</label>
              <select id="bug-category" required>
                <option value="">اختر التصنيف</option>
                <option value="JavaScript">JavaScript</option>
                <option value="المصادقة">المصادقة</option>
                <option value="التحصيل">التحصيل</option>
                <option value="واجهة المستخدم">واجهة المستخدم</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>
            <div class="form-group">
              <label for="bug-priority">الأولوية</label>
              <select id="bug-priority" required>
                <option value="">اختر الأولوية</option>
                <option value="low">منخفض</option>
                <option value="medium">متوسط</option>
                <option value="high">عالي</option>
              </select>
            </div>
            <div class="form-group">
              <label for="bug-steps">خطوات إعادة الإنتاج</label>
              <textarea id="bug-steps"></textarea>
            </div>
            <div class="form-group">
              <label for="bug-screenshot">لقطات الشاشة</label>
              <input type="file" id="bug-screenshot" accept="image/*" multiple>
            </div>
            <button type="submit">إبلاغ عن الخطأ</button>
          </form>
        </div>
        <div class="tab-content" id="statistics-content">
          <div class="bug-statistics">
            <div class="stat-card">
              <h3>إجمالي الأخطاء</h3>
              <p class="stat-value">${this.bugs.length}</p>
            </div>
            <div class="stat-card">
              <h3>الأخطاء المفتوحة</h3>
              <p class="stat-value">${this.bugs.filter(b => b.status === 'open').length}</p>
            </div>
            <div class="stat-card">
              <h3>الأخطاء قيد المعالجة</h3>
              <p class="stat-value">${this.bugs.filter(b => b.status === 'in-progress').length}</p>
            </div>
            <div class="stat-card">
              <h3>الأخطاء المحلولة</h3>
              <p class="stat-value">${this.bugs.filter(b => b.status === 'resolved').length}</p>
            </div>
            <div class="stat-card">
              <h3>الأخطاء المغلقة</h3>
              <p class="stat-value">${this.bugs.filter(b => b.status === 'closed').length}</p>
            </div>
          </div>
          <div class="bug-chart">
            <canvas id="bug-chart"></canvas>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(tracker);

    // إغلاق التتبع
    const closeButton = tracker.querySelector('.close-tracker');
    closeButton.addEventListener('click', () => {
      tracker.remove();
    });

    // تبديب الألسنة
    const tabs = tracker.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.dataset.tab);
      });
    });

    // عرض قائمة الأخطاء
    this.displayBugs();

    // إضافة مستمعي الفلاتر
    const statusFilter = tracker.querySelector('#bug-status-filter');
    const priorityFilter = tracker.querySelector('#bug-priority-filter');
    const categoryFilter = tracker.querySelector('#bug-category-filter');
    const searchInput = tracker.querySelector('#bug-search');

    statusFilter.addEventListener('change', () => {
      this.displayBugs();
    });

    priorityFilter.addEventListener('change', () => {
      this.displayBugs();
    });

    categoryFilter.addEventListener('change', () => {
      this.displayBugs();
    });

    searchInput.addEventListener('input', () => {
      this.displayBugs();
    });

    // إضافة مستخدمي النموذج
    const newBugForm = tracker.querySelector('#new-bug-form');
    newBugForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitNewBug();
    });

    // إنشاء الرسم البياني
    this.createBugChart();
  }

  // تبديب الألسنة
  switchTab(tabName) {
    const tracker = document.querySelector('.bug-tracker');
    const tabs = tracker.querySelectorAll('.tab');
    const contents = tracker.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    contents.forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}-content`);
    });

    // عرض المحتوى المناسب
    if (tabName === 'list') {
      this.displayBugs();
    } else if (tabName === 'statistics') {
      this.createBugChart();
    }
  }

  // عرض قائمة الأخطاء
  displayBugs() {
    const tracker = document.querySelector('.bug-tracker');
    const bugList = tracker.querySelector('#bug-list');
    const statusFilter = tracker.querySelector('#bug-status-filter').value;
    const priorityFilter = tracker.querySelector('#bug-priority-filter').value;
    const categoryFilter = tracker.querySelector('#bug-category-filter').value;
    const searchInput = tracker.querySelector('#bug-search').value.toLowerCase();

    // فلترة الأخطاء
    let filteredBugs = this.bugs;

    if (statusFilter) {
      filteredBugs = filteredBugs.filter(bug => bug.status === statusFilter);
    }

    if (priorityFilter) {
      filteredBugs = filteredBugs.filter(bug => bug.priority === priorityFilter);
    }

    if (categoryFilter) {
      filteredBugs = filteredBugs.filter(bug => bug.category === categoryFilter);
    }

    if (searchInput) {
      filteredBugs = filteredBugs.filter(bug => 
        bug.title.toLowerCase().includes(searchInput) || 
        bug.description.toLowerCase().includes(searchInput)
      );
    }

    // عرض الأخطاء
    bugList.innerHTML = filteredBugs.map(bug => `
      <div class="bug-item ${bug.status}">
        <div class="bug-header">
          <h3>${bug.title}</h3>
          <div class="bug-meta">
            <span class="bug-status">${bug.status}</span>
            <span class="bug-priority">${bug.priority}</span>
            <span class="bug-category">${bug.category}</span>
          </div>
        </div>
        <div class="bug-description">
          <p>${bug.description}</p>
        </div>
        <div class="bug-footer">
          <span class="bug-date">${new Date(bug.created_at).toLocaleDateString()}</span>
          <button class="view-bug" data-id="${bug.id}">عرض التفاصيل</button>
        </div>
      </div>
    `).join('');

    // إضافة مستخدمي عرض التفاصيل
    const viewButtons = bugList.querySelectorAll('.view-bug');
    viewButtons.forEach(button => {
      button.addEventListener('click', () => {
        const bugId = parseInt(button.getAttribute('data-id'));
        this.showBugDetails(bugId);
      });
    });
  }

  // عرض تفاصيل الخطأ
  showBugDetails(bugId) {
    const bug = this.bugs.find(b => b.id === bugId);
    if (!bug) return;

    const details = document.createElement('div');
    details.className = 'bug-details';
    details.innerHTML = `
      <div class="bug-details-header">
        <h2>${bug.title}</h2>
        <button class="close-details"><i class="fas fa-times"></i></button>
      </div>
      <div class="bug-details-meta">
        <div class="meta-item">
          <span class="meta-label">الحالة:</span>
          <span class="meta-value">${bug.status}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">الأولوية:</span>
          <span class="meta-value">${bug.priority}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">التصنيف:</span>
          <span class="meta-value">${bug.category}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">التاريخ:</span>
          <span class="meta-value">${new Date(bug.created_at).toLocaleString()}</span>
        </div>
      </div>
      <div class="bug-details-description">
        <h3>الوصف</h3>
        <p>${bug.description}</p>
      </div>
      <div class="bug-details-actions">
        <button class="update-status" data-id="${bug.id}" data-status="in-progress">تحديث الحالة</button>
        <button class="close-bug" data-id="${bug.id}">إغلاق الخطأ</button>
      </div>
    `;

    document.body.appendChild(details);

    // إغلاق التفاصيل
    const closeButton = details.querySelector('.close-details');
    closeButton.addEventListener('click', () => {
      details.remove();
    });

    // تحديث الحالة
    const updateButton = details.querySelector('.update-status');
    updateButton.addEventListener('click', () => {
      this.updateBugStatus(bugId, 'in-progress');
      details.remove();
    });

    // إغلاق الخطأ
    const closeButton2 = details.querySelector('.close-bug');
    closeButton2.addEventListener('click', () => {
      this.updateBugStatus(bugId, 'closed');
      details.remove();
    });
  }

  // تحديث حالة الخطأ
  async updateBugStatus(bugId, newStatus) {
    try {
      const config = window.AppConfig || {};
      const supabaseUrl = config.supabase?.url;
      const supabaseAnonKey = config.supabase?.anonKey;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('إعدادات Supabase غير مكتملة');
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/bugs?id=eq.${bugId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('فشل تحديث حالة الخطأ');
      }

      // تحديث القائمة المحلية
      const bugIndex = this.bugs.findIndex(b => b.id === bugId);
      if (bugIndex !== -1) {
        this.bugs[bugIndex].status = newStatus;
        this.bugs[bugIndex].updated_at = new Date().toISOString();
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('خطأ في تحديث حالة الخطأ:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // تقديم خطأ جديد
  async submitNewBug() {
    const tracker = document.querySelector('.bug-tracker');
    const title = tracker.querySelector('#bug-title').value;
    const description = tracker.querySelector('#bug-description').value;
    const category = tracker.querySelector('#bug-category').value;
    const priority = tracker.querySelector('#bug-priority').value;
    const steps = tracker.querySelector('#bug-steps').value;

    const result = await this.reportBug({
      title,
      description,
      category,
      priority,
      steps
    });

    if (result.success) {
      // إظهار رسالة النجاح
      const successMessage = document.createElement('div');
      successMessage.className = 'success-message';
      successMessage.textContent = 'تم الإبلاغ عن الخطأ بنجاح';
      tracker.appendChild(successMessage);

      // إعادة تعيين النموذج
      tracker.querySelector('#new-bug-form').reset();

      // إخفاء الرسالة بعد ثانيتين
      setTimeout(() => {
        successMessage.remove();
      }, 2000);

      // تحديث قائمة الأخطاء
      this.loadBugs();
    } else {
      // إظهار رسالة الخطأ
      const errorMessage = document.createElement('div');
      errorMessage.className = 'error-message';
      errorMessage.textContent = `فشل الإبلاغ عن الخطأ: ${result.error}`;
      tracker.appendChild(errorMessage);

      // إخفاء الرسالة بعد ثانيتين
      setTimeout(() => {
        errorMessage.remove();
      }, 2000);
    }
  }

  // إنشاء رسم بياني للأخطاء
  createBugChart() {
    const tracker = document.querySelector('.bug-tracker');
    const canvas = tracker.querySelector('#bug-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // حساب الإحصائيات
    const statusCounts = {
      open: this.bugs.filter(b => b.status === 'open').length,
      'in-progress': this.bugs.filter(b => b.status === 'in-progress').length,
      resolved: this.bugs.filter(b => b.status === 'resolved').length,
      closed: this.bugs.filter(b => b.status === 'closed').length
    };

    // إنشاء الرسم البياني
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['مفتوح', 'قيد المعالجة', 'محلول', 'مغلق'],
        datasets: [{
          label: 'عدد الأخطاء',
          data: [statusCounts.open, statusCounts['in-progress'], statusCounts.resolved, statusCounts.closed],
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }
}

// إنشاء مثيل من نظام تتبع الأخطاء
const bugTracker = new BugTracker();

// تصدير نظام تتبع الأخطاء
window.BugTracker = bugTracker;
