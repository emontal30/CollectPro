// ========== مدير التحديثات التلقائية ========== //

// مدير التحديثات
class UpdateManager {
  constructor() {
    this.currentVersion = null;
    this.latestVersion = null;
    this.updateAvailable = false;
    this.updateChecked = false;
    this.updateInterval = 24 * 60 * 60 * 1000; // 24 ساعة
    this.init();
  }

  // التهيئة
  async init() {
    // الحصول على الإصدار الحالي
    this.getCurrentVersion();

    // التحقق من وجود تحديثات
    await this.checkForUpdates();

    // جدولة التحقق من التحديثات
    this.scheduleUpdateChecks();

    // إنشاء زر التحديثات
    this.createUpdateButton();
  }

  // الحصول على الإصدار الحالي
  getCurrentVersion() {
    const config = window.AppConfig || {};
    this.currentVersion = config.app?.version || '1.0.0';
    return this.currentVersion;
  }

  // التحقق من وجود تحديثات
  async checkForUpdates() {
    try {
      const config = window.AppConfig || {};
      const supabaseUrl = config.supabase?.url;
      const supabaseAnonKey = config.supabase?.anonKey;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('إعدادات Supabase غير مكتملة');
      }

      // التحقق من وجود تحديثات
      const response = await fetch(`${supabaseUrl}/rest/v1/app_updates?version=neq.${this.currentVersion}&order=created_at.desc&limit=1`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });

      if (!response.ok) {
        throw new Error('فشل التحقق من التحديثات');
      }

      const updates = await response.json();

      if (updates.length > 0) {
        this.latestVersion = updates[0].version;
        this.updateAvailable = true;
        this.showUpdateNotification(updates[0]);
      } else {
        this.updateAvailable = false;
      }

      this.updateChecked = true;
    } catch (error) {
      console.error('خطأ في التحقق من التحديثات:', error);
      this.updateChecked = true;
    }
  }

  // جدولة التحقق من التحديثات
  scheduleUpdateChecks() {
    setInterval(() => {
      this.checkForUpdates();
    }, this.updateInterval);
  }

  // إنشاء زر التحديثات
  createUpdateButton() {
    const updateButton = document.createElement('button');
    updateButton.className = 'update-button';
    updateButton.innerHTML = '<i class="fas fa-sync-alt"></i> التحديثات';
    updateButton.title = 'التحقق من التحديثات';

    document.body.appendChild(updateButton);

    updateButton.addEventListener('click', () => {
      this.checkForUpdates();
    });
  }

  // إشعار التحديث
  showUpdateNotification(update) {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
      <div class="update-content">
        <h3>متوفر تحديث جديد</h3>
        <p>الإصدار ${this.latestVersion} متوفر للتحميل</p>
        <div class="update-details">
          <p><strong>الإصدار الحالي:</strong> ${this.currentVersion}</p>
          <p><strong>الإصدار الجديد:</strong> ${this.latestVersion}</p>
          <p><strong>تاريخ الإصدار:</strong> ${new Date(update.created_at).toLocaleDateString()}</p>
          <p><strong>الوصف:</strong> ${update.description || 'لا يوجد وصف متوفر'}</p>
        </div>
        <div class="update-actions">
          <button class="update-now">التحديث الآن</button>
          <button class="dismiss">تجاهل</button>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    // إجراءات الإشعار
    const updateNowButton = notification.querySelector('.update-now');
    const dismissButton = notification.querySelector('.dismiss');

    updateNowButton.addEventListener('click', () => {
      this.performUpdate();
    });

    dismissButton.addEventListener('click', () => {
      notification.remove();
    });
  }

  // تنفيذ التحديث
  async performUpdate() {
    try {
      const notification = document.querySelector('.update-notification');
      if (notification) {
        notification.remove();
      }

      // إظهار رسالة التحميل
      const loadingNotification = document.createElement('div');
      loadingNotification.className = 'update-loading';
      loadingNotification.innerHTML = `
        <div class="loading-content">
          <div class="spinner"></div>
          <p>جاري تنفيذ التحديث...</p>
        </div>
      `;

      document.body.appendChild(loadingNotification);

      // محاكاة تنفيذ التحديث
      await new Promise(resolve => setTimeout(resolve, 3000));

      // إظهار رسالة النجاح
      loadingNotification.remove();

      const successNotification = document.createElement('div');
      successNotification.className = 'update-success';
      successNotification.innerHTML = `
        <div class="success-content">
          <i class="fas fa-check-circle"></i>
          <p>تم تحديث التطبيق بنجاح إلى الإصدار ${this.latestVersion}</p>
          <button class="restart">إعادة التشغيل</button>
        </div>
      `;

      document.body.appendChild(successNotification);

      // إعادة التشغيل
      const restartButton = successNotification.querySelector('.restart');
      restartButton.addEventListener('click', () => {
        window.location.reload();
      });

      // تحديث الإصدار المحلي
      this.currentVersion = this.latestVersion;
      this.updateAvailable = false;
    } catch (error) {
      console.error('خطأ في تنفيذ التحديث:', error);

      // إظهار رسالة الخطأ
      const loadingNotification = document.querySelector('.update-loading');
      if (loadingNotification) {
        loadingNotification.remove();
      }

      const errorNotification = document.createElement('div');
      errorNotification.className = 'update-error';
      errorNotification.innerHTML = `
        <div class="error-content">
          <i class="fas fa-exclamation-circle"></i>
          <p>فشل تنفيذ التحديث: ${error.message}</p>
          <button class="retry">إعادة المحاولة</button>
        </div>
      `;

      document.body.appendChild(errorNotification);

      // إعادة المحاولة
      const retryButton = errorNotification.querySelector('.retry');
      retryButton.addEventListener('click', () => {
        this.performUpdate();
      });
    }
  }
}

// مدير الإضافات
class PluginManager {
  constructor() {
    this.plugins = [];
    this.loadedPlugins = [];
    this.init();
  }

  // التهيئة
  async init() {
    // تحميل قائمة الإضافات
    await this.loadPluginList();

    // تحميل الإضافات المفعلة
    await this.loadActivePlugins();

    // إنشاء زر الإضافات
    this.createPluginButton();
  }

  // تحميل قائمة الإضافات
  async loadPluginList() {
    try {
      const config = window.AppConfig || {};
      const supabaseUrl = config.supabase?.url;
      const supabaseAnonKey = config.supabase?.anonKey;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('إعدادات Supabase غير مكتملة');
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/plugins`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });

      if (!response.ok) {
        throw new Error('فشل جلب قائمة الإضافات');
      }

      this.plugins = await response.json();
    } catch (error) {
      console.error('خطأ في تحميل قائمة الإضافات:', error);

      // استخدام قائمة الإضافات الافتراضية
      this.plugins = [
        {
          id: 1,
          name: 'ميزة التصدير',
          description: 'تصدير البيانات إلى ملفات مختلفة',
          version: '1.0.0',
          active: true,
          file: 'plugins/export-plugin.js'
        },
        {
          id: 2,
          name: 'ميزة الاستيراد',
          description: 'استيراد البيانات من ملفات مختلفة',
          version: '1.0.0',
          active: false,
          file: 'plugins/import-plugin.js'
        },
        {
          id: 3,
          name: 'ميزة التقارير',
          description: 'إنشاء تقارير متقدمة',
          version: '1.0.0',
          active: true,
          file: 'plugins/reports-plugin.js'
        }
      ];
    }
  }

  // تحميل الإضافات المفعلة
  async loadActivePlugins() {
    const activePlugins = this.plugins.filter(plugin => plugin.active);

    for (const plugin of activePlugins) {
      try {
        await this.loadPlugin(plugin);
      } catch (error) {
        console.error(`فشل تحميل الإضافة ${plugin.name}:`, error);
      }
    }
  }

  // تحميل إضافة معينة
  async loadPlugin(plugin) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = plugin.file;
      script.async = true;

      script.onload = () => {
        this.loadedPlugins.push(plugin);
        resolve(plugin);
      };

      script.onerror = () => {
        reject(new Error(`فشل تحميل الإضافة: ${plugin.file}`));
      };

      document.head.appendChild(script);
    });
  }

  // إنشاء زر الإضافات
  createPluginButton() {
    const pluginButton = document.createElement('button');
    pluginButton.className = 'plugin-button';
    pluginButton.innerHTML = '<i class="fas fa-puzzle-piece"></i> الإضافات';
    pluginButton.title = 'إدارة الإضافات';

    document.body.appendChild(pluginButton);

    pluginButton.addEventListener('click', () => {
      this.showPluginManager();
    });
  }

  // إظهار مدير الإضافات
  showPluginManager() {
    const manager = document.createElement('div');
    manager.className = 'plugin-manager';
    manager.innerHTML = `
      <div class="plugin-manager-header">
        <h2>مدير الإضافات</h2>
        <button class="close-manager"><i class="fas fa-times"></i></button>
      </div>
      <div class="plugin-list">
        ${this.plugins.map(plugin => `
          <div class="plugin-item ${plugin.active ? 'active' : ''}">
            <div class="plugin-info">
              <h3>${plugin.name}</h3>
              <p>${plugin.description}</p>
              <span class="plugin-version">الإصدار: ${plugin.version}</span>
            </div>
            <div class="plugin-actions">
              <button class="toggle-plugin" data-id="${plugin.id}">
                ${plugin.active ? 'تعطيل' : 'تفعيل'}
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    document.body.appendChild(manager);

    // إغلاق المدير
    const closeButton = manager.querySelector('.close-manager');
    closeButton.addEventListener('click', () => {
      manager.remove();
    });

    // تبديل حالة الإضافة
    const toggleButtons = manager.querySelectorAll('.toggle-plugin');
    toggleButtons.forEach(button => {
      button.addEventListener('click', () => {
        const pluginId = parseInt(button.getAttribute('data-id'));
        this.togglePlugin(pluginId);
      });
    });
  }

  // تبديل حالة الإضافة
  async togglePlugin(pluginId) {
    const plugin = this.plugins.find(p => p.id === pluginId);
    if (!plugin) return;

    plugin.active = !plugin.active;

    if (plugin.active) {
      // تفعيل الإضافة
      try {
        await this.loadPlugin(plugin);
      } catch (error) {
        console.error(`فشل تفعيل الإضافة ${plugin.name}:`, error);
        plugin.active = false;
      }
    } else {
      // تعطيل الإضافة
      const script = document.querySelector(`script[src="${plugin.file}"]`);
      if (script) {
        script.remove();
      }

      const index = this.loadedPlugins.findIndex(p => p.id === pluginId);
      if (index !== -1) {
        this.loadedPlugins.splice(index, 1);
      }
    }

    // إظهار مدير الإضافات مرة أخرى
    const manager = document.querySelector('.plugin-manager');
    if (manager) {
      manager.remove();
      this.showPluginManager();
    }
  }
}

// إنشاء مثيلات من المديرين
const updateManager = new UpdateManager();
const pluginManager = new PluginManager();

// تصدير مديري التحديثات والإضافات
window.UpdateManager = {
  manager: updateManager,
  pluginManager: pluginManager
};

// تهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  // إضافة أنماط CSS للتحديثات والإضافات
  const style = document.createElement('style');
  style.textContent = `
    /* أنماط الإشعارات */
    .update-notification, .update-loading, .update-success, .update-error {
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      max-width: 400px;
      animation: slideIn 0.3s ease-out;
    }

    .update-content {
      padding: 20px;
    }

    .update-details {
      margin: 15px 0;
      padding: 10px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .update-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 15px;
    }

    .update-now, .dismiss, .restart, .retry {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }

    .update-now {
      background: #4CAF50;
      color: white;
    }

    .dismiss {
      background: #f5f5f5;
      color: #333;
    }

    .restart {
      background: #2196F3;
      color: white;
    }

    .retry {
      background: #f44336;
      color: white;
    }

    .update-loading {
      padding: 20px;
      text-align: center;
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 2s linear infinite;
      margin: 0 auto 15px;
    }

    .update-success, .update-error {
      text-align: center;
      padding: 20px;
    }

    .update-success i {
      font-size: 48px;
      color: #4CAF50;
      margin-bottom: 15px;
    }

    .update-error i {
      font-size: 48px;
      color: #f44336;
      margin-bottom: 15px;
    }

    /* أنماط مدير الإضافات */
    .plugin-manager {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
    }

    .plugin-manager-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px;
      border-bottom: 1px solid #eee;
    }

    .plugin-manager-header h2 {
      margin: 0;
      color: #333;
    }

    .close-manager {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #666;
    }

    .plugin-list {
      padding: 20px;
    }

    .plugin-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      border: 1px solid #eee;
      border-radius: 4px;
      margin-bottom: 10px;
    }

    .plugin-item.active {
      border-color: #4CAF50;
      background: #f1f8f4;
    }

    .plugin-info h3 {
      margin: 0 0 5px;
      color: #333;
    }

    .plugin-info p {
      margin: 0 0 5px;
      color: #666;
      font-size: 14px;
    }

    .plugin-version {
      font-size: 12px;
      color: #999;
    }

    .plugin-actions {
      display: flex;
      gap: 10px;
    }

    .toggle-plugin {
      padding: 6px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 14px;
    }

    .plugin-item.active .toggle-plugin {
      background: #f44336;
      color: white;
      border-color: #f44336;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
});
