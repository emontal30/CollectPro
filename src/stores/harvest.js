import { defineStore } from 'pinia';
import api from '@/services/api';
import { supabase } from '@/services/api';
import { useAuthStore } from './auth';

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
    rows: []
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
      if (!state.rows || state.rows.length === 0) {
        return [{
          id: Date.now(),
          shop: '',
          code: '',
          amount: 0,
          extra: 0,
          collector: 0
        }]
      }
      if (!state.searchQuery) return state.rows
      return state.rows.filter(row => 
        row.shop?.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        row.code?.toLowerCase().includes(state.searchQuery.toLowerCase())
      )
    },

    totals: (state) => {
      const rows = state.rows || []
      return {
        amount: rows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0),
        extra: rows.reduce((sum, row) => sum + (parseFloat(row.extra) || 0), 0),
        collector: rows.reduce((sum, row) => sum + (parseFloat(row.collector) || 0), 0)
      }
    },

    totalNet: (state) => {
      const totals = state.totals || { amount: 0, extra: 0, collector: 0 }
      return totals.collector - (totals.amount + totals.extra)
    },

    resetAmount: (state) => {
      const totalNet = state.totalNet || 0
      return state.currentBalance - (state.masterLimit || 0) - totalNet
    },

    resetStatus: (state) => {
      const resetAmount = state.resetAmount
      if (resetAmount === 0) {
        return { val: 0, text: 'تم التسوية ✅', color: '#28a745' }
      } else if (resetAmount > 0) {
        return { val: resetAmount, text: 'مطلوب من المحصل 💰', color: '#dc3545' }
      } else {
        return { val: resetAmount, text: 'رصيد المحصل 🎯', color: '#007bff' }
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
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) throw new Error('User not authenticated')
        const user = authStore.user

        // Try to load from localStorage first
        const localData = this.loadFromLocalStorage()
        if (localData && localData.length > 0) {
          this.currentData = localData
        }

        // Then sync with database
        await this.syncWithDatabase(user.id)

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
      const newRecord = {
        id: Date.now(),
        serial: this.currentData.length + 1,
        shop: record.shop || '',
        code: record.code || '',
        amount: parseFloat(record.amount) || 0,
        extra: parseFloat(record.extra) || 0,
        collector: record.collector || '',
        net: (parseFloat(record.amount) || 0) + (parseFloat(record.extra) || 0)
      }

      this.currentData.push(newRecord)
      this.saveToLocalStorage()
      this.saveToDatabase()
    },

    // Update existing record
    updateRecord(index, record) {
      if (index >= 0 && index < this.currentData.length) {
        const updatedRecord = {
          ...this.currentData[index],
          shop: record.shop || '',
          code: record.code || '',
          amount: parseFloat(record.amount) || 0,
          extra: parseFloat(record.extra) || 0,
          collector: record.collector || '',
          net: (parseFloat(record.amount) || 0) + (parseFloat(record.extra) || 0)
        }

        this.currentData[index] = updatedRecord
        this.saveToLocalStorage()
        this.saveToDatabase()
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
        this.saveToDatabase()
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

    loadFromLocalStorage() {
      try {
        const data = localStorage.getItem(`harvest_${this.currentDate}`)
        return data ? JSON.parse(data) : []
      } catch (error) {
        console.error('Error loading from localStorage:', error)
        return []
      }
    },

    // Set master limit
    setMasterLimit(limit) {
      this.masterLimit = parseFloat(limit) || 100000
      localStorage.setItem('masterLimit', this.masterLimit.toString())
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

    // Ensure empty row exists
    ensureEmptyRow() {
      if (!this.rows || this.rows.length === 0) {
        this.rows = [{
          id: Date.now(),
          shop: '',
          code: '',
          amount: 0,
          extra: 0,
          collector: 0
        }]
      } else {
        // Check if last row has any data
        const lastRow = this.rows[this.rows.length - 1]
        if (lastRow.shop || lastRow.code || lastRow.amount || lastRow.extra || lastRow.collector) {
          this.rows.push({
            id: Date.now() + Math.random(),
            shop: '',
            code: '',
            amount: 0,
            extra: 0,
            collector: 0
          })
        }
      }
    },

    // Clear all fields
    clearFields() {
      this.rows = [{
        id: Date.now(),
        shop: '',
        code: '',
        amount: 0,
        extra: 0,
        collector: 0
      }]
      this.searchQuery = ''
      this.saveToLocalStorage()
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
            collector: 0  // القيمة الافتراضية
          })
        }
      })
      
      return parsedRows
    },

    // الدالة الرئيسية لاستدعاء البيانات
    loadDataFromStorage() {
      // 1. محاولة تحميل البيانات الجديدة القادمة من صفحة الإدخال
      const newData = localStorage.getItem("harvestData")
      
      if (newData) {
        const newRows = this.parseRawDataToRows(newData)
        if (newRows.length > 0) {
          // تحديث الصفوف بالبيانات الجديدة
          this.rows = newRows
          
          // تنظيف البيانات المؤقتة حتى لا يتم تحميلها مرة أخرى
          localStorage.removeItem("harvestData")
          
          // إضافة صف فارغ في النهاية للكتابة
          this.ensureEmptyRow()
          return true // تم التحميل بنجاح
        }
      }
      
      // 2. إذا لم توجد بيانات جديدة، لا نفعل شيئاً (ستبقى البيانات المحفوظة في harvest_rows)
      return false
    },

    // Archive today's data with local storage support
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
        // تنسيق للعرض والتخزين المحلي (DD/MM/YYYY)
        const localDateStr = todayDate.toLocaleDateString("en-GB", {
          day: '2-digit', month: '2-digit', year: 'numeric'
        });
        // تنسيق لقاعدة البيانات (YYYY-MM-DD)
        const isoDate = todayDate.toISOString().split('T')[0];

        // 4. التحقق من وجود أرشيف سابق لهذا اليوم (محلياً)
        const localArchive = JSON.parse(localStorage.getItem("archiveData") || "{}");
        if (localArchive[localDateStr]) {
          // نترك القرار للمكون (Component) لعرض رسالة تأكيد الاستبدال
          // ولكن هنا سنفترض أن المستخدم وافق أو أننا سنستبدل مباشرة
          // يمكن تمرير flag للدالة: force = true/false
        }

        // 5. تحضير البيانات لقاعدة البيانات
        const supabaseData = validRows.map(row => ({
          user_id: user.id,
          archive_date: isoDate,
          shop: row.shop || "",
          code: row.code || "",
          amount: Number(row.amount) || 0,
          extra: Number(row.extra) || 0,
          collector: Number(row.collector) || 0,
          net: (Number(row.collector) || 0) - ((Number(row.extra) || 0) + (Number(row.amount) || 0))
        }));

        // 6. تحضير البيانات للتخزين المحلي (نفس تنسيق النص القديم مفصول بـ Tabs)
        const localDataString = validRows.map(row => {
          const net = (Number(row.collector) || 0) - ((Number(row.extra) || 0) + (Number(row.amount) || 0));
          // الترتيب: المحل - الكود - المبلغ - أخرى - المحصل - الصافي
          return `${row.shop}\t${row.code}\t${row.amount}\t${row.extra}\t${row.collector}\t${net}`;
        }).join("\n");

        // 7. التنفيذ (قاعدة البيانات)
        // In development mode, skip database operations
        if (!import.meta.env.DEV) {
          // أ- حذف البيانات القديمة لنفس اليوم (للاستبدال)
          const { error: deleteError } = await supabase
            .from('archive_data')
            .delete()
            .eq('user_id', user.id)
            .eq('archive_date', isoDate);

          if (deleteError) throw deleteError;

          // ب- إدراج البيانات الجديدة
          const { error: insertError } = await supabase
            .from('archive_data')
            .insert(supabaseData);

          if (insertError) throw insertError;

          // ج- تحديث جدول التواريخ (archive_dates) لضمان ظهوره في القائمة
          await supabase
            .from('archive_dates')
            .upsert({ user_id: user.id, archive_date: isoDate }, { onConflict: 'user_id, archive_date' });
        }

        // 8. التنفيذ (التخزين المحلي)
        localArchive[localDateStr] = localDataString;
        localStorage.setItem("archiveData", JSON.stringify(localArchive));

        return { success: true, message: 'تم أرشفة بيانات اليوم بنجاح!' };

      } catch (error) {
        console.error('Archive Error:', error);
        return { success: false, message: `حدث خطأ: ${error.message || 'فشل الاتصال'}` };
      }
    },

    // Initialize the store
    initialize() {
      if (!this.rows || this.rows.length === 0) {
        this.rows = [{
          id: Date.now(),
          shop: '',
          code: '',
          amount: 0,
          extra: 0,
          collector: 0
        }]
      }
      this.loadMasterLimit()
      const savedBalance = localStorage.getItem('currentBalance')
      if (savedBalance) {
        this.currentBalance = parseFloat(savedBalance)
      }
      
      // محاولة تحميل بيانات جديدة عند التهيئة
      this.loadDataFromStorage()
    }
  }
})

// Utility function for number formatting
function formatNumber(num) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num || 0)
}