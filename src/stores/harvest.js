import { defineStore } from 'pinia';
import { useAuthStore } from './auth';
import { supabase } from '@/supabase';
import { addToSyncQueue, getQueueStats } from '@/services/archiveSyncQueue';
import { removeFromAllCaches, safeDeepClone, setSmartCache } from '@/services/cacheManager';
import logger from '@/utils/logger.js';

export const useHarvestStore = defineStore('harvest', {
  state: () => ({
    // البيانات الأساسية
    rows: [],
    currentDate: new Date().toISOString().split('T')[0],
    
    // إعدادات وحالة إضافية (مدمجة من الكود القديم)
    masterLimit: 100000,
    currentBalance: 0,
    isLoading: false,
    error: null,
    searchQuery: '',
    isModified: false, // لتتبع التغييرات غير المحفوظة
    
    // إحصائيات المزامنة
    syncQueueStats: { pendingCount: 0, totalRetries: 0, oldestItem: null }
  }),

  getters: {
    // حساب الإجماليات
    totals: (state) => {
      const rows = state.rows || [];
      return rows.reduce((acc, row) => {
        acc.amount += parseFloat(row.amount) || 0;
        acc.extra += parseFloat(row.extra) || 0;
        acc.collector += parseFloat(row.collector) || 0;
        acc.net += parseFloat(row.net) || 0;
        return acc;
      }, { amount: 0, extra: 0, collector: 0, net: 0 });
    },

    // عدد السجلات
    rowCount: (state) => (state.rows || []).length,

    // تصفية البيانات (للبحث داخل الجدول الحالي)
    filteredRows: (state) => {
      let data = state.rows || [];
      
      // إذا كان الجدول فارغاً، نعيد مصفوفة فارغة
      if (data.length === 0) return [];

      if (!state.searchQuery) return data;

      const query = state.searchQuery.toLowerCase();
      return data.filter(row =>
        (row.shop && row.shop.toLowerCase().includes(query)) ||
        (row.code && row.code.toString().toLowerCase().includes(query))
      );
    },

    // حالة الرصيد (للوحة التحكم - ميزة قديمة تم الحفاظ عليها)
    resetStatus: (state) => {
      const totalCollected = state.totals.collector || 0;
      // الرصيد الحالي - الحد المسموح
      const resetVal = state.currentBalance - (state.masterLimit || 0);
      const combinedValue = totalCollected + resetVal;
      
      if (combinedValue === 0) {
        return { val: combinedValue, text: 'تم التحصيل بنجاح ✅', color: '#10b981' };
      } else if (combinedValue < 0) {
        return { val: combinedValue, text: 'عجز 🔴', color: '#ef4444' };
      } else {
        return { val: combinedValue, text: 'زيادة 🔵', color: '#3b82f6' };
      }
    }
  },

  actions: {
    // ==========================================================
    // 1. إدارة البيانات المحلية (CRUD)
    // ==========================================================

    /**
     * تهيئة المخزن عند بدء التطبيق
     */
    async initialize() {
      logger.debug('🚀 Initializing Harvest Store...');
      
      try {
        // 1. تحميل الإعدادات القديمة
        this.loadMasterLimit();
        const savedBalance = localStorage.getItem('currentBalance');
        if (savedBalance) {
          this.currentBalance = parseFloat(savedBalance);
        }

        // 2. محاولة تحميل بيانات "مستوردة" جديدة (من صفحة اللصق)
        const hasImportedData = await this.loadDataFromStorage();
        
        if (!hasImportedData) {
          // 3. إذا لم يوجد استيراد، حمل البيانات المحفوظة سابقاً
          const savedRows = localStorage.getItem('harvest_rows');
          if (savedRows) {
            try {
              this.rows = JSON.parse(savedRows);
              logger.info(`📦 Loaded ${this.rows.length} rows from localStorage`);
            } catch (e) {
              this.resetTable();
            }
          } else {
            // 4. إذا لم يوجد شيء، ابدأ بجدول فارغ
            this.resetTable();
          }
        }
        
        // تحديث إحصائيات المزامنة
        this.updateSyncQueueStats();

      } catch (err) {
        logger.error('❌ Error initializing harvest store:', err);
        this.resetTable();
      }
    },

    /**
     * إضافة صف جديد
     */
    addRow() {
      this.rows.push({
        id: Date.now() + Math.random(), // ID فريد
        serial: this.rows.length + 1,
        shop: '',
        code: '',
        amount: '',
        extra: '',
        collector: '',
        net: 0,
        isImported: false
      });
      this.saveRowsToLocalStorage();
    },

    /**
     * حذف صف
     */
    removeRow(index) {
      if (index >= 0 && index < this.rows.length) {
        this.rows.splice(index, 1);
        if (this.rows.length === 0) this.addRow(); // لا تترك الجدول فارغاً
        this.saveRowsToLocalStorage();
      }
    },

    /**
     * حساب الصافي لصف معين وتحديث الحالة
     */
    calculateRowNet(row) {
      const amount = parseFloat(row.amount) || 0;
      const extra = parseFloat(row.extra) || 0;
      const collector = parseFloat(row.collector) || 0;
      row.net = collector - (amount + extra);
      this.isModified = true;
      this.saveRowsToLocalStorage(); 
    },

    /**
     * إعادة تعيين الجدول لصف واحد فارغ
     */
    resetTable() {
      this.rows = [{
        id: Date.now(),
        shop: '',
        code: '',
        amount: '',
        extra: '',
        collector: '',
        net: 0
      }];
      this.saveRowsToLocalStorage();
    },

    /**
     * مسح كل البيانات (تنظيف كامل)
     * تقوم بتصفير الجدول والرصيد
     */
    clearAll() {
      this.resetTable();
      this.searchQuery = '';
      this.currentBalance = 0; // تصفير الرصيد أيضاً
      localStorage.removeItem('currentBalance');
      this.isModified = false;
      logger.info('🧹 Harvest table cleared');
    },

    /**
     * دالة التوافق مع الكود القديم (Alias)
     * تحل مشكلة TypeError: store.clearFields is not a function
     */
    clearFields() {
      this.clearAll();
    },

    /**
     * حفظ الصفوف في LocalStorage
     */
    async saveRowsToLocalStorage() {
      try {
        const key = 'harvest_rows';
        const cleanedRows = safeDeepClone(this.rows);
        
        localStorage.setItem(key, JSON.stringify(cleanedRows));
        this.isModified = true;

        // نسخة احتياطية في الخلفية (IndexedDB)
        setSmartCache(key, cleanedRows, 'indexedDB').catch(() => {});

      } catch (error) {
        logger.error('❌ Error saving rows:', error);
      }
    },

    // ==========================================================
    // 2. الأرشفة الذكية (Smart Archive)
    // ==========================================================

    async archiveTodayData() {
      try {
        this.isLoading = true;

        // 1. التحقق من المصادقة
        const authStore = useAuthStore();
        if (!authStore.isAuthenticated) {
          throw new Error('يجب تسجيل الدخول أولاً');
        }
        const user = authStore.user;

        // 2. فلترة الصفوف (استبعاد الصفوف الفارغة)
        const validRows = this.rows.filter(r => 
          r.shop || r.code || (parseFloat(r.amount) > 0) || (parseFloat(r.collector) > 0)
        );

        if (validRows.length === 0) {
          return { success: false, message: 'لا توجد بيانات صالحة للأرشفة' };
        }

        // 3. تحضير البيانات
        const cleanRows = safeDeepClone(validRows).map(row => ({
          shop: row.shop || '',
          code: row.code || '',
          amount: parseFloat(row.amount) || 0,
          extra: parseFloat(row.extra) || 0,
          collector: parseFloat(row.collector) || 0,
          net: parseFloat(row.net) || 0
        }));

        const isoDate = new Date(this.currentDate).toISOString().split('T')[0];
        const localDateStr = new Date(this.currentDate).toLocaleDateString("en-GB"); 

        // 4. الحفظ المحلي (LocalStorage Archive)
        const localArchive = JSON.parse(localStorage.getItem("archiveData") || "{}");
        const tsvData = cleanRows.map(r => 
          `${r.shop}\t${r.code}\t${r.amount}\t${r.extra}\t${r.collector}\t${r.net}`
        ).join("\n");
        
        localArchive[localDateStr] = tsvData;
        localStorage.setItem("archiveData", JSON.stringify(localArchive));

        // 5. الحفظ السحابي (Supabase)
        let savedToServer = false;
        
        const dbPayload = {
          user_id: user.id,
          archive_date: isoDate,
          data: cleanRows, // تخزين JSON كامل
          total_amount: this.totals.net
        };

        if (navigator.onLine && !import.meta.env.DEV) {
          try {
            const { error } = await supabase
              .from('daily_archives')
              .upsert(dbPayload, { onConflict: 'user_id, archive_date' });

            if (error) throw error;
            savedToServer = true;
          
          } catch (err) {
            logger.warn('⚠️ Cloud sync failed, queueing:', err.message);
            await addToSyncQueue({ type: 'daily_archive', payload: dbPayload });
          }
        } else {
          // وضع عدم الاتصال
          if (!import.meta.env.DEV) {
             await addToSyncQueue({ type: 'daily_archive', payload: dbPayload });
          }
        }

        // 6. التنظيف بعد النجاح
        await this.updateSyncQueueStats();
        this.clearAll(); 

        return { 
          success: true, 
          message: savedToServer ? 'تمت الأرشفة بنجاح ✅' : 'تم الحفظ محلياً 💾. سيتم المزامنة لاحقاً.' 
        };

      } catch (error) {
        logger.error('💥 Archive Error:', error);
        return { success: false, message: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    // ==========================================================
    // 3. أدوات مساعدة
    // ==========================================================

    parseRawDataToRows(rawData) {
      if (!rawData) return [];
      const lines = rawData.split("\n");
      const parsedRows = [];
      
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.includes("المسلسل")) return;

        const parts = trimmedLine.split("\t");
        if (parts.length < 2) return;

        let shopName = parts[1].trim();
        let code = parts[2] ? parts[2].trim() : "";
        const match = shopName.match(/(.+?):\s*(\d+)/);
        if (match) {
          shopName = match[1].trim();
          code = match[2].trim();
        }

        const transferAmount = parseFloat(parts[3]?.replace(/,/g, '') || 0);

        if (transferAmount !== 0) {
          parsedRows.push({
            id: Date.now() + index,
            serial: index + 1,
            shop: shopName,
            code: code,
            amount: transferAmount,
            extra: 0,
            collector: 0,
            net: 0 - transferAmount,
            isImported: true
          });
        }
      });
      return parsedRows;
    },

    async loadDataFromStorage() {
      const newData = localStorage.getItem("harvestData");
      if (newData) {
        const newRows = this.parseRawDataToRows(newData);
        if (newRows.length > 0) {
          this.rows = newRows;
          this.addRow();
          await removeFromAllCaches("harvestData");
          localStorage.removeItem("harvestData");
          this.saveRowsToLocalStorage();
          return true;
        }
      }
      return false;
    },

    setMasterLimit(limit) {
      this.masterLimit = parseFloat(limit) || 100000;
      localStorage.setItem('masterLimit', this.masterLimit.toString());
    },

    loadMasterLimit() {
      const limit = localStorage.getItem('masterLimit');
      if (limit) this.masterLimit = parseFloat(limit);
    },

    setCurrentBalance(balance) {
      this.currentBalance = parseFloat(balance) || 0;
      localStorage.setItem('currentBalance', this.currentBalance.toString());
    },

    async updateSyncQueueStats() {
      try {
        this.syncQueueStats = await getQueueStats();
      } catch (error) { /* ignore */ }
    },

    formatNumber(num) {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(num || 0);
    }
  }
});