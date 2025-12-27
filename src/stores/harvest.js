import { defineStore } from 'pinia';
import { useAuthStore } from './auth';
import { useArchiveStore } from './archiveStore';
import { addToSyncQueue } from '@/services/archiveSyncQueue';
import { safeDeepClone } from '@/services/cacheManager';
import { apiInterceptor } from '@/services/apiInterceptor';
import api from '@/services/api';
import logger from '@/utils/logger.js';
import localforage from 'localforage';

export const useHarvestStore = defineStore('harvest', {
  state: () => ({
    rows: [],
    currentDate: new Date().toISOString().split('T')[0],
    masterLimit: 100000,
    extraLimit: 0,
    currentBalance: 0,
    isLoading: false,
    error: null,
    searchQuery: '',
    isModified: false,
  }),

  getters: {
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
    
    customerCount: (state) => {
      return (state.rows || []).filter(row => row.shop && row.shop.trim() !== '').length;
    },
    
    filteredRows: (state) => {
      let data = state.rows || [];
      if (data.length === 0) return [];
      if (!state.searchQuery) return data;
      const query = state.searchQuery.toLowerCase();
      return data.filter(row =>
        (row.shop && row.shop.toLowerCase().includes(query)) ||
        (row.code && row.code.toString().toLowerCase().includes(query))
      );
    },

    resetStatus: (state) => {
      const totalCollected = state.totals.collector || 0;
      const resetVal = (state.currentBalance || 0) - ((state.masterLimit || 0) + (state.extraLimit || 0));
      const combinedValue = totalCollected + resetVal;
      
      if (combinedValue === 0) return { val: combinedValue, text: 'تم التحصيل بنجاح ✅', color: '#10b981' };
      else if (combinedValue < 0) return { val: combinedValue, text: 'عجز 🔴', color: '#ef4444' };
      else return { val: combinedValue, text: 'زيادة 🔵', color: '#3b82f6' };
    },
    
    resetAmount: (state) => (parseFloat(state.currentBalance) || 0) - ((parseFloat(state.masterLimit) || 0) + (parseFloat(state.extraLimit) || 0)),
    
    totalNet: (state) => state.totals.collector - (state.totals.amount + state.totals.extra)
  },

  actions: {
    async initialize() {
      try {
        this.loadMasterLimit();
        this.loadExtraLimit();
        const savedBalance = localStorage.getItem('currentBalance');
        if (savedBalance) this.currentBalance = parseFloat(savedBalance);

        const hasImportedData = await this.loadDataFromStorage();
        if (!hasImportedData) {
          const savedRows = localStorage.getItem('harvest_rows');
          if (savedRows) {
            try { this.rows = JSON.parse(savedRows); } catch (e) { this.resetTable(); }
          } else {
            this.resetTable();
          }
        }
      } catch (err) {
        this.resetTable();
      }
    },

    resetTable() {
      this.rows = [{ id: Date.now(), shop: '', code: '', amount: '', extra: '', collector: '', net: 0 }];
      this.saveRowsToLocalStorage();
    },

    clearAll() {
      this.resetTable();
      this.searchQuery = '';
      this.currentBalance = 0;
      this.extraLimit = 0;
      localStorage.removeItem('currentBalance');
      localStorage.removeItem('extraLimit');
      this.isModified = false;
      // ملحوظة: لا يتم حذف masterLimit هنا بناءً على طلب المستخدم
    },

    clearFields() {
      this.clearAll();
    },

    async saveRowsToLocalStorage() {
      try {
        const cleanedRows = safeDeepClone(this.rows);
        localStorage.setItem('harvest_rows', JSON.stringify(cleanedRows));
        this.isModified = true;
      } catch (error) {
        logger.error('Error saving rows:', error);
      }
    },

    async archiveTodayData() {
      try {
        this.isLoading = true;
        const authStore = useAuthStore();
        const archiveStore = useArchiveStore();

        if (!authStore.isAuthenticated) throw new Error('يجب تسجيل الدخول أولاً');

        const validRows = this.rows.filter(r => 
          r.shop || r.code || (parseFloat(r.amount) > 0) || (parseFloat(r.collector) > 0)
        );

        if (validRows.length === 0) return { success: false, message: 'لا توجد بيانات صالحة للأرشفة' };

        const cleanRows = safeDeepClone(validRows).map(row => ({
          shop: row.shop || '',
          code: row.code || '',
          amount: parseFloat(row.amount) || 0,
          extra: parseFloat(row.extra) || 0,
          collector: parseFloat(row.collector) || 0,
          net: parseFloat(row.net) || 0
        }));

        const localDateStr = archiveStore.getTodayLocal();
        const localKey = `arch_data_${localDateStr}`;

        // 1. الحفظ المحلي الفوري
        await localforage.setItem(localKey, cleanRows);
        
        // 2. تحديث قائمة التواريخ محلياً
        await archiveStore.loadAvailableDates();

        // 3. الحفظ السحابي
        const dbPayload = {
          user_id: authStore.user.id,
          archive_date: localDateStr,
          data: cleanRows,
          total_amount: (this.totals.collector || 0) - ((this.totals.amount || 0) + (this.totals.extra || 0)),
          updated_at: new Date()
        };

        let message = '';

        if (navigator.onLine) {
          const { error } = await apiInterceptor(
            api.archive.saveDailyArchive(dbPayload.user_id, dbPayload.archive_date, dbPayload.data)
          );

          if (!error) {
            message = 'تم أرشفة اليوم بنجاح على الهاتف وسحابياً ✅';
            await archiveStore.loadAvailableDates();
          } else {
            await addToSyncQueue({ type: 'daily_archive', payload: dbPayload });
            message = 'تم الحفظ على الهاتف وسيتم الحفظ على السحابة بمجرد توافر إنترنت 💾';
          }
        } else {
          await addToSyncQueue({ type: 'daily_archive', payload: dbPayload });
          message = 'تم الحفظ على الهاتف وسيتم الحفظ على السحابة بمجرد توافر إنترنت 💾';
        }

        return { success: true, message };

      } catch (error) {
        logger.error('💥 Archive Error:', error);
        return { success: false, message: error.message || 'فشل في الأرشفة' };
      } finally {
        this.isLoading = false;
      }
    },

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
            extra: null,
            collector: null,
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
          localStorage.removeItem("harvestData");
          this.saveRowsToLocalStorage();
          return true;
        }
      }
      return false;
    },

    addRow() {
      this.rows.push({
        id: Date.now() + Math.random(),
        serial: this.rows.length + 1,
        shop: '', code: '', amount: '', extra: '', collector: '', net: 0, isImported: false
      });
      this.saveRowsToLocalStorage();
    },

    setMasterLimit(limit) {
      this.masterLimit = parseFloat(limit) || 0;
      localStorage.setItem('masterLimit', this.masterLimit.toString());
    },

    loadMasterLimit() {
      const limit = localStorage.getItem('masterLimit');
      if (limit !== null) {
        this.masterLimit = parseFloat(limit);
      } else {
        this.masterLimit = 100000;
      }
    },

    setExtraLimit(limit) {
      this.extraLimit = parseFloat(limit) || 0;
      localStorage.setItem('extraLimit', this.extraLimit.toString());
    },

    loadExtraLimit() {
      const limit = localStorage.getItem('extraLimit');
      if (limit) this.extraLimit = parseFloat(limit);
    },

    setCurrentBalance(balance) {
      this.currentBalance = parseFloat(balance) || 0;
      localStorage.setItem('currentBalance', this.currentBalance.toString());
    },

    formatNumber(num) {
      return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num || 0);
    }
  }
});
