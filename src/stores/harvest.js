import { defineStore } from 'pinia';
import { supabase } from '@/services/api';
import { useAuthStore } from './auth';
import localforage from 'localforage';
import { addToSyncQueue, getQueueStats } from '@/services/archiveSyncQueue';
import { setSmartCache, getSmartCache, removeFromAllCaches, safeDeepClone } from '@/services/cacheManager';

export const useHarvestStore = defineStore('harvest', {
  state: () => ({
    currentData: [],
    archivedData: [],
    currentDate: new Date().toISOString().split('T')[0],
    masterLimit: 100000,
    isLoading: false,
    error: null,
    searchQuery: '',
    currentBalance: 0,
    rows: [],
    syncQueueStats: { pendingCount: 0, totalRetries: 0, oldestItem: null }
  }),

  getters: {
    totalAmount: (state) => {
      const rows = state.rows || []
      return rows.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
    },

    netAmount: (state) => {
      const rows = state.rows || []
      return rows.reduce((sum, item) => sum + (parseFloat(item.net) || 0), 0)
    },

    totalRecords: (state) => (state.rows || []).length,

    formattedTotal: (state) => {
      const rows = state.rows || []
      return state.formatNumber(rows.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0))
    },
    formattedNet: (state) => {
      const rows = state.rows || []
      return state.formatNumber(rows.reduce((sum, item) => sum + (parseFloat(item.net) || 0), 0))
    },

    filteredRows: (state) => {
        let rows = state.rows || []
        if (rows.length === 0) {
          rows = [{
            id: Date.now(),
            shop: '',
            code: '',
            amount: 0,
            extra: 0,
            collector: 0,
            isImported: false
          }]
        }

        let filtered
        if (!state.searchQuery) {
          filtered = rows
        } else {
          filtered = rows.filter(row =>
            row.shop?.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
            row.code?.toLowerCase().includes(state.searchQuery.toLowerCase())
          )
        }

        // Ensure isImported is set
        return filtered.map(row => {
          row.isImported = row.isImported ?? false
          return row
        })
      },

    totals: (state) => {
      const rows = state.rows || []
      const amount = rows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0)
      const extra = rows.reduce((sum, row) => sum + (parseFloat(row.extra) || 0), 0)
      const collector = rows.reduce((sum, row) => sum + (parseFloat(row.collector) || 0), 0)
      return {
        amount: amount,
        extra: extra,
        collector: collector,
        net: collector - (amount + extra)
      }
    },

    totalNet: (state) => {
      const totals = state.totals || { amount: 0, extra: 0, collector: 0 }
      return totals.collector - (totals.amount + totals.extra)
    },

    resetAmount: (state) => {
      return state.currentBalance - (state.masterLimit || 0)
    },

    resetStatus: (state) => {
      const totalCollected = state.totals.collector || 0;
      const resetAmount = state.resetAmount;
      const combinedValue = totalCollected + resetAmount;
      if (combinedValue === 0) {
        return { val: combinedValue, text: 'تم التحصيل بنجاح ✅', color: '#28a745' };
      } else if (combinedValue < 0) {
        return { val: combinedValue, text: 'عجز 🔴', color: '#dc3545' };
      } else {
        return { val: combinedValue, text: 'زيادة 🔵', color: '#007bff' };
      }
    }
  },

  actions: {
    // Load data for current date
    async loadCurrentData(date = null) {
      if (date) this.currentDate = date
      this.isLoading = true
      this.error = null

      try {
        const localData = this.loadFromLocalStorage()
        if (localData && localData.length > 0) {
          this.currentData = localData
        }
      } catch (error) {
        console.error('Error loading current data:', error)
        this.error = error.message
      } finally {
        this.isLoading = false
      }
    },

    // Sync with database
    async syncWithDatabase(userId) {
      try {
        // In development mode, skip database sync and use localStorage only
        if (import.meta.env.DEV) {
          console.log('Development mode: Skipping database sync, using localStorage only')
          return
        }

        const isoDate = new Date(this.currentDate).toISOString().split('T')[0]

        const { data, error } = await supabase
          .from('archive_data')
          .select('*')
          .eq('user_id', userId)
          .eq('date', isoDate)
          .order('created_at', { ascending: true })

        if (error) throw error

        if (data && data.length > 0) {
          this.currentData = data.map(item => ({
            id: item.id,
            serial: item.serial,
            shop: item.shop,
            code: item.code,
            amount: item.amount,
            extra: item.extra,
            collector: item.collector,
            net: item.net || item.amount
          }))
          this.saveToLocalStorage()
        }
      } catch (error) {
        console.error('Error syncing with database:', error)
      }
    },

    // Add new harvest record
    addRecord(record) {
      const amount = parseFloat(record.amount) || 0
      const extra = parseFloat(record.extra) || 0
      const collector = parseFloat(record.collector) || 0
      const newRecord = {
        id: Date.now(),
        serial: this.currentData.length + 1,
        shop: record.shop || '',
        code: record.code || '',
        amount: amount,
        extra: extra,
        collector: collector,
        net: collector - (amount + extra)
      }

      this.currentData.push(newRecord)
      this.saveToLocalStorage()
    },

    // Update existing record
    updateRecord(index, record) {
      if (index >= 0 && index < this.currentData.length) {
        const amount = parseFloat(record.amount) || 0
        const extra = parseFloat(record.extra) || 0
        const collector = parseFloat(record.collector) || 0
        const updatedRecord = {
          ...this.currentData[index],
          shop: record.shop || '',
          code: record.code || '',
          amount: amount,
          extra: extra,
          collector: collector,
          net: collector - (amount + extra)
        }

        this.currentData[index] = updatedRecord
        this.saveToLocalStorage()
      }
    },

    // Delete record
    deleteRecord(index) {
      if (index >= 0 && index < this.currentData.length) {
        this.currentData.splice(index, 1)
        // Re-number serials
        this.currentData.forEach((record, i) => {
          record.serial = i + 1
        })
        this.saveToLocalStorage()
      }
    },

    // Clear all data
    clearData() {
      this.currentData = []
      this.saveToLocalStorage()
      this.deleteFromDatabase()
    },

    // Archive current data
    async archiveData() {
      try {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) throw new Error('User not authenticated')
        const user = authStore.user

        const isoDate = new Date(this.currentDate).toISOString()

        const archiveData = this.currentData.map(item => ({
          user_id: user.id,
          date: this.currentDate,
          serial: item.serial,
          shop: item.shop,
          code: item.code,
          amount: item.amount,
          extra: item.extra,
          collector: item.collector,
          net: item.net,
          created_at: isoDate
        }))

        // Delete existing data for this date
        await supabase
          .from('archive_data')
          .delete()
          .eq('user_id', user.id)
          .eq('date', this.currentDate)

        // Insert new data
        const { error } = await supabase
          .from('archive_data')
          .insert(archiveData)

        if (error) throw error

        // Clear current data
        this.clearData()

        return { success: true }
      } catch (error) {
        console.error('Error archiving data:', error)
        return { success: false, error: error.message }
      }
    },

    // Load archived data
    async loadArchivedData(date) {
      this.isLoading = true
      try {
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) throw new Error('User not authenticated')
        const user = authStore.user

        const { data, error } = await supabase
          .from('archive_data')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', date)
          .order('created_at', { ascending: true })

        if (error) throw error

        this.archivedData = data || []
        return this.archivedData
      } catch (error) {
        console.error('Error loading archived data:', error)
        this.error = error.message
        return []
      } finally {
        this.isLoading = false
      }
    },

    // Save to database
    async saveToDatabase() {
      try {
        // In development mode, skip database sync and use localStorage only
        if (import.meta.env.DEV) {
          console.log('Development mode: Skipping database save, using localStorage only')
          return
        }

        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) return
        const user = authStore.user

        const isoDate = new Date().toISOString()

        const dbData = this.currentData.map(item => ({
          user_id: user.id,
          date: this.currentDate,
          serial: item.serial,
          shop: item.shop,
          code: item.code,
          amount: item.amount,
          extra: item.extra,
          collector: item.collector,
          net: item.net,
          created_at: isoDate
        }))

        // Delete existing data for this date
        await supabase
          .from('archive_data')
          .delete()
          .eq('user_id', user.id)
          .eq('date', this.currentDate)

        // Insert current data
        const { error } = await supabase
          .from('archive_data')
          .insert(dbData)

        if (error) {
          console.error('Error saving to database:', error)
        }
      } catch (error) {
        console.error('Error in saveToDatabase:', error)
      }
    },

    // Delete from database
    async deleteFromDatabase() {
      try {
        // In development mode, skip database sync and use localStorage only
        if (import.meta.env.DEV) {
          console.log('Development mode: Skipping database delete, using localStorage only')
          return
        }

        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) return
        const user = authStore.user

        await supabase
          .from('archive_data')
          .delete()
          .eq('user_id', user.id)
          .eq('date', this.currentDate)
      } catch (error) {
        console.error('Error deleting from database:', error)
      }
    },

    // Local storage operations
    saveToLocalStorage() {
      try {
        localStorage.setItem(`harvest_${this.currentDate}`, JSON.stringify(this.currentData))
      } catch (error) {
        console.error('Error saving to localStorage:', error)
      }
    },

    async saveToIndexedDB() {
      try {
        const key = `harvest_rows_${this.currentDate}`;
        const cleanRows = safeDeepClone(this.rows);
        // use smart cache to ensure consistent store format & metadata
        await setSmartCache(key, cleanRows, 'indexedDB');
        console.log('✅ Rows saved to IndexedDB via smart cache:', key);
      } catch (error) {
        // Log error but don't call saveRowsToLocalStorage to avoid infinite loop
        // localStorage is already being saved separately
        console.warn('⚠️ IndexedDB save failed (using localStorage fallback):', error?.message);
      }
    },

    async loadFromIndexedDB() {
      try {
        const key = `harvest_rows_${this.currentDate}`;
        const data = await localforage.getItem(key);
        if (data && data.length > 0) {
          this.rows = data;
          console.log('✅ Rows loaded from IndexedDB:', key);
          return data;
        }
      } catch (error) {
        console.error('Error loading from IndexedDB:', error);
      }
      return null;
    },

    loadFromLocalStorage() {
      try {
        const data = localStorage.getItem(`harvest_${this.currentDate}`)
        return data ? JSON.parse(data) : []
      } catch (error) {
        console.error('Error loading from localStorage:', error)
        return []
      }
    },

    // Save rows to localStorage (also attempt IndexedDB in background, non-blocking)
    async saveRowsToLocalStorage() {
      try {
        const key = 'harvest_rows';
        
        // تنظيف البيانات من الـ Vue reactive proxies قبل الحفظ (structuredClone -> JSON fallback)
        const cleanedRows = safeDeepClone(this.rows);
        
        // احفظ في LocalStorage مباشرة (موثوق)
        localStorage.setItem(key, JSON.stringify(cleanedRows));
        
        // محاولة مزامنة إجمالي المحصل مع صفحة عداد الأموال
        try {
          const totalCollected = cleanedRows.reduce((sum, row) => sum + (parseFloat(row.collector) || 0), 0);
          localStorage.setItem('totalCollected', totalCollected.toString());
          
          // إشعار counter store بتحديث إجمالي المحصل
          window.dispatchEvent(new CustomEvent('harvestDataUpdated', { 
            detail: { totalCollected } 
          }));
        } catch (syncError) {
          console.warn('⚠️ خطأ في مزامنة إجمالي المحصل:', syncError.message);
        }
        
        // حاول حفظ في IndexedDB في الخلفية (non-blocking)
        setTimeout(async () => {
          try {
            await setSmartCache(key, cleanedRows, 'indexedDB');
          } catch (dbError) {
            // لا تكسر البرنامج - LocalStorage يكفي
            console.warn('⚠️ IndexedDB backup failed:', dbError.message);
          }
        }, 0);
        
        console.log('✅ تم حفظ الصفوف:', this.rows.length, 'صف');
      } catch (error) {
        console.error('❌ خطأ في حفظ الصفوف:', error);
      }
    },

    // Save current balance to localStorage
    saveCurrentBalanceToLocalStorage() {
      try {
        localStorage.setItem('currentBalance', this.currentBalance.toString());
        console.log('Saved currentBalance to localStorage:', this.currentBalance);
      } catch (error) {
        console.error('Error saving currentBalance to localStorage:', error);
      }
    },

    // Set master limit
    setMasterLimit(limit) {
      this.masterLimit = parseFloat(limit) || 100000
      localStorage.setItem('masterLimit', this.masterLimit.toString())
      console.log('Master limit set and saved:', this.masterLimit)
    },

    // Set current balance
    setCurrentBalance(balance) {
      this.currentBalance = parseFloat(balance) || 0
      this.saveCurrentBalanceToLocalStorage()
    },

    // Load master limit
    loadMasterLimit() {
      const limit = localStorage.getItem('masterLimit')
      if (limit) {
        this.masterLimit = parseFloat(limit)
      }
    },

    // Format number for display
    formatNumber(num) {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(num || 0)
    },

    // Ensure empty row exists (legacy, kept for compatibility but not used in new logic)
    ensureEmptyRow() {
      // This function is deprecated and replaced by reactive logic in the component
      // Keeping it for backward compatibility
    },

    // Clear all fields
    clearFields() {
      console.log('clearFields called, clearing all data');
      this.rows = [{
        id: Date.now(),
        shop: '',
        code: '',
        amount: 0,
        extra: 0,
        collector: 0,
        net: 0
      }];
      this.searchQuery = '';
      this.currentBalance = 0; // Clear current balance as per user requirement
      this.saveRowsToLocalStorage();
      localStorage.removeItem('currentBalance'); // Remove from storage
      console.log('Data cleared and saved');
    },

    // دالة لتحويل النص الخام (من localStorage) إلى كائنات صفوف
    parseRawDataToRows(rawData) {
      if (!rawData) return []
      
      const lines = rawData.split("\n")
      const parsedRows = []
      
      lines.forEach((line, index) => {
        const trimmedLine = line.trim()
        if (!trimmedLine) return

        // تخطي سطر العناوين إذا وجد
        if (trimmedLine.includes("المسلسل") && trimmedLine.includes("إجمالي البيع-التحويل-الرصيد")) return

        const parts = trimmedLine.split("\t")
        // التأكد من وجود بيانات كافية (على الأقل المسلسل والاسم)
        if (parts.length < 2) return

        /*
          تحليل البيانات بناءً على التنسيق المتوقع:
          التنسيق القديم: [المسلسل, الاسم/الكود, ..., المبلغ, ...]
        */
        
        const centerInfo = parts[1].trim()
        let shopName = centerInfo
        let code = parts[2] ? parts[2].trim() : ""

        // محاولة استخراج الاسم والكود إذا كانا مدمجين (مثل: "اسم المحل: 123")
        const match = centerInfo.match(/(.+?):\s*(\d+)/)
        if (match) {
          shopName = match[1].trim()
          code = match[2].trim()
        }

        // المبلغ عادة في العمود الرابع (index 3) في البيانات المنسوخة
        const transferAmount = parseFloat(parts[3]?.replace(/,/g, '') || 0)

        if (transferAmount !== 0) { // تجاهل الصفوف الصفرية
          parsedRows.push({
            id: Date.now() + index, // معرف فريد
            shop: shopName,
            code: code,
            amount: transferAmount,
            extra: 0,     // القيمة الافتراضية
            collector: 0,  // القيمة الافتراضية
            net: 0 - transferAmount // صافي = محصل - (مبلغ + أخرى) = 0 - transferAmount
          })
        }
      })
      
      return parsedRows
    },

    // الدالة الرئيسية لاستدعاء البيانات
    async loadDataFromStorage() {
      // 1. محاولة تحميل البيانات الجديدة القادمة من صفحة الإدخال
      const newData = localStorage.getItem("harvestData")
      
      if (newData) {
        const newRows = this.parseRawDataToRows(newData)
        if (newRows.length > 0) {
           // تحديث الصفوف بالبيانات الجديدة مع إضافة flag للصفوف المستوردة
           this.rows = newRows.map(row => ({ ...row, isImported: true }))

           // تنظيف البيانات المؤقتة
           await removeFromAllCaches("harvestData")
           localStorage.removeItem("harvestData")

           // إضافة صف فارغ في النهاية للكتابة
           this.rows.push({
             id: Date.now(),
             shop: '',
             code: '',
             amount: 0,
             extra: 0,
             collector: 0,
             net: 0,
             isImported: false
           });
           this.saveRowsToLocalStorage();
           return true // تم التحميل بنجاح
         }
      }
      
      // 2. إذا لم توجد بيانات جديدة، لا نفعل شيئاً (ستبقى البيانات المحفوظة في harvest_rows)
      return false
    },

    // Archive today's data with sync queue support
    async archiveTodayData() {
      try {
        // 1. التحقق من وجود صفوف (غير الصفوف الفارغة)
        const validRows = this.rows.filter(r => r.shop || r.code || r.amount > 0 || r.extra > 0 || r.collector > 0);
        
        if (validRows.length === 0) {
          return { success: false, message: 'لا توجد بيانات لأرشفتها!' };
        }

        // 2. الحصول على المستخدم الحالي
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
          return { success: false, message: 'يجب تسجيل الدخول أولاً!' };
        }
        const user = authStore.user

        // 3. تحضير التواريخ
        const todayDate = new Date();
        const localDateStr = todayDate.toLocaleDateString("en-GB", {
          day: '2-digit', month: '2-digit', year: 'numeric'
        });
        const isoDate = todayDate.toISOString().split('T')[0];

        // 4. التحقق من وجود أرشيف سابق لهذا اليوم (محلياً)
        const localArchive = JSON.parse(localStorage.getItem("archiveData") || "{}");
        if (localArchive[localDateStr]) {
          // استبدال مباشر
        }

        // 5. تحضير البيانات - تنظيفها من Vue Proxies
        // تنسيخ عميق (deep clone) للبيانات لإزالة أي Vue reactivity
        const cleanValidRows = safeDeepClone(validRows);
        
        const supabaseData = cleanValidRows.map(row => ({
          user_id: user.id,
          archive_date: isoDate,
          shop: row.shop || "",
          code: row.code || "",
          amount: Number(row.amount) || 0,
          extra: Number(row.extra) || 0,
          collector: Number(row.collector) || 0,
          net: (Number(row.collector) || 0) - ((Number(row.extra) || 0) + (Number(row.amount) || 0))
        }));

        const localDataString = cleanValidRows.map(row => {
          const net = (Number(row.collector) || 0) - ((Number(row.extra) || 0) + (Number(row.amount) || 0));
          return `${row.shop}\t${row.code}\t${row.amount}\t${row.extra}\t${row.collector}\t${net}`;
        }).join("\n");

        // 6. حفظ محلياً أولاً (ضمان عدم فقدان البيانات)
        localArchive[localDateStr] = localDataString;
        localStorage.setItem("archiveData", JSON.stringify(localArchive));

        // 7. محاولة الإرسال إلى الخادم
        let savedToServer = false;
        if (navigator.onLine && !import.meta.env.DEV) {
          try {
            // حذف البيانات القديمة
            const { error: deleteError } = await supabase
              .from('archive_data')
              .delete()
              .eq('user_id', user.id)
              .eq('archive_date', isoDate);

            if (deleteError) throw deleteError;

            // إدراج البيانات الجديدة
            const { error: insertError } = await supabase
              .from('archive_data')
              .insert(supabaseData);

            if (insertError) throw insertError;

            // تحديث جدول التواريخ
            await supabase
              .from('archive_dates')
              .upsert({ user_id: user.id, archive_date: isoDate }, { onConflict: 'user_id, archive_date' });

            console.log('✅ Archive synced to database');
            savedToServer = true;
            // نجح الإرسال — لا حاجة لإضافة للـ queue
          } catch (err) {
            console.warn('⚠️ Failed to sync archive to database, adding to sync queue:', err.message);
            // فشل الإرسال — أضف للـ queue للإعادة لاحقاً
            await addToSyncQueue({
              user_id: user.id,
              archive_date: isoDate,
              rows: supabaseData,
              localDataString
            });
          }
        } else {
          // غير متصل أو في development — أضف للـ queue
          if (!import.meta.env.DEV) {
            console.log('📌 Offline — adding archive to sync queue');
            await addToSyncQueue({
              user_id: user.id,
              archive_date: isoDate,
              rows: supabaseData,
              localDataString
            });
          }
        }

        // تحديث إحصائيات الـ queue
        this.updateSyncQueueStats();

        // تنظيف بيانات الحصاد بعد الأرشفة بنجاح
        await removeFromAllCaches('harvest_rows');
        this.rows = [{
          id: Date.now(),
          shop: '',
          code: '',
          amount: 0,
          extra: 0,
          collector: 0,
          net: 0
        }];
        this.saveRowsToLocalStorage();

        const successMessage = savedToServer
          ? 'تم أرشفة بيانات اليوم بنجاح وتم حفظها فى قاعده البيانات'
          : 'تم أرشفة بيانات اليوم بنجاح! سيتم المزامنة عند الاتصال.';

        return { success: true, message: successMessage };

      } catch (error) {
        console.error('Archive Error:', error);
        return { success: false, message: `حدث خطأ: ${error.message || 'فشل الاتصال'}` };
      }
    },

    // Initialize the store
    async initialize() {
      console.log('Initializing harvest store...');
      
      // Try localStorage first (الأكثر أماناً)
      if (!this.rows || this.rows.length === 0) {
        const savedRows = localStorage.getItem('harvest_rows');
        if (savedRows) {
          try {
            this.rows = JSON.parse(savedRows);
            console.log('✅ Loaded rows from localStorage:', this.rows.length, 'rows');
            console.log('Rows already exist in store:', this.rows.length, 'rows');

            // Ensure master limit and current balance are loaded even when rows exist
            this.loadMasterLimit();
            const savedBalanceEarly = localStorage.getItem('currentBalance');
            if (savedBalanceEarly) {
              this.currentBalance = parseFloat(savedBalanceEarly);
              console.log('Loaded currentBalance from localStorage (early):', this.currentBalance);
            } else {
              console.log('No saved currentBalance in localStorage (early)');
            }

            return; // تم التحميل بنجاح
          } catch (error) {
            console.error('Error parsing saved rows:', error);
            // المتابعة إلى الخطوة التالية
          }
        }
        
        // إذا لم تكن هناك بيانات محفوظة، ابدأ برف فارغة
        console.log('No saved rows, initializing empty row');
        this.rows = [{
          id: Date.now(),
          shop: '',
          code: '',
          amount: 0,
          extra: 0,
          collector: 0,
          net: 0
        }];
      }
      
      this.loadMasterLimit();
      const savedBalance = localStorage.getItem('currentBalance');
      if (savedBalance) {
        this.currentBalance = parseFloat(savedBalance);
        console.log('Loaded currentBalance from localStorage:', this.currentBalance);
      } else {
        console.log('No saved currentBalance in localStorage');
      }

      // محاولة تحميل بيانات جديدة عند التهيئة
      const dataLoaded = this.loadDataFromStorage();
      console.log('loadDataFromStorage result:', dataLoaded);

      // التأكد من وجود صف فارغ في النهاية إذا لم تكن هناك صفوف
      if (!this.rows || this.rows.length === 0) {
        this.rows = [{
          id: Date.now(),
          shop: '',
          code: '',
          amount: 0,
          extra: 0,
          collector: 0,
          net: 0,
          isImported: false
        }];
        this.saveRowsToLocalStorage();
      }

      // تحديث إحصائيات قائمة الانتظار
      this.updateSyncQueueStats();
    },

    async updateSyncQueueStats() {
      try {
        this.syncQueueStats = await getQueueStats();
      } catch (error) {
        console.error('Error updating sync queue stats:', error);
      }
    }
  }
})