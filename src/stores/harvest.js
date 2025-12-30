import { defineStore } from 'pinia';
import { useAuthStore } from './auth';
import { useArchiveStore } from './archiveStore';
import { addToSyncQueue } from '@/services/archiveSyncQueue';
import { safeDeepClone } from '@/services/cacheManager';
import { apiInterceptor } from '@/services/apiInterceptor';
import api from '@/services/api';
import logger from '@/utils/logger.js';
import localforage from 'localforage';

const HARVEST_ROWS_KEY = 'harvest_rows';

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
        // استخدام Math.round لضمان أرقام صحيحة وتجنب مشاكل الـ Floating point
        acc.amount += Math.round(parseFloat(row.amount) || 0);
        acc.extra += Math.round(parseFloat(row.extra) || 0);
        acc.collector += Math.round(parseFloat(row.collector) || 0);
        acc.net += Math.round(parseFloat(row.net) || 0);
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
      const resetVal = Math.round((state.currentBalance || 0) - ((state.masterLimit || 0) + (state.extraLimit || 0)));
      const combinedValue = totalCollected + resetVal;
      
      if (combinedValue === 0) return { val: combinedValue, text: 'تم التحصيل بنجاح ✅', color: '#10b981' };
      else if (combinedValue < 0) return { val: combinedValue, text: 'عجز 🔴', color: '#ef4444' };
      else return { val: combinedValue, text: 'زيادة 🔵', color: '#3b82f6' };
    },
    
    resetAmount: (state) => Math.round((parseFloat(state.currentBalance) || 0) - ((parseFloat(state.masterLimit) || 0) + (parseFloat(state.extraLimit) || 0))),
    
    totalNet: (state) => Math.round(state.totals.collector - (state.totals.amount + state.totals.extra))
  },

  actions: {
    async initialize() {
      this.isLoading = true;
      try {
        this.loadMasterLimit();
        this.loadExtraLimit();
        const savedBalance = localStorage.getItem('currentBalance');
        if (savedBalance) this.currentBalance = parseFloat(savedBalance);

        const hasImportedData = await this.loadDataFromStorage();
        if (!hasImportedData) {
          const savedRows = await localforage.getItem(HARVEST_ROWS_KEY);
          if (savedRows && Array.isArray(savedRows)) {
            this.rows = savedRows;
          } else {
            await this.resetTable();
          }
        }
      } catch (err) {
        logger.error('Harvest initialization failed:', err);
        await this.resetTable();
      } finally {
        this.isLoading = false;
      }
    },

    async resetTable() {
      this.rows = [{ id: Date.now(), shop: '', code: '', amount: '', extra: '', collector: '', net: 0 }];
      await this.saveRowsToStorage();
    },

    async clearAll() {
      await this.resetTable();
      this.searchQuery = '';
      this.currentBalance = 0;
      this.extraLimit = 0;
      localStorage.removeItem('currentBalance');
      localStorage.removeItem('extraLimit');
      await localforage.removeItem(HARVEST_ROWS_KEY);
      this.isModified = false;
    },

    async saveRowsToStorage() {
      try {
        const cleanedRows = safeDeepClone(this.rows);
        await localforage.setItem(HARVEST_ROWS_KEY, cleanedRows);
        this.isModified = true;
      } catch (error) {
        logger.error('Error saving rows to localforage:', error);
      }
    },

    async archiveTodayData() {
      try {
        this.isLoading = true;
        this.currentDate = new Date().toISOString().split('T')[0];

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
          amount: Math.round(parseFloat(row.amount) || 0),
          extra: Math.round(parseFloat(row.extra) || 0),
          collector: Math.round(parseFloat(row.collector) || 0),
          net: Math.round(parseFloat(row.net) || 0)
        }));
        
        const dateToSave = this.currentDate;
        const localKey = `${archiveStore.DB_PREFIX}${dateToSave}`;

        // 1. الحفظ المحلي
        await localforage.setItem(localKey, cleanRows);
        await archiveStore.loadAvailableDates();

        // 2. الحفظ السحابي
        const dbPayload = {
          user_id: authStore.user.id,
          archive_date: dateToSave,
          data: cleanRows,
          total_amount: Math.round((this.totals.collector || 0) - ((this.totals.amount || 0) + (this.totals.extra || 0))),
          updated_at: new Date()
        };

        if (navigator.onLine) {
          const { error } = await api.archive.saveDailyArchive(dbPayload.user_id, dbPayload.archive_date, dbPayload.data);
          if (!error) {
            return { success: true, message: 'تم أرشفة اليوم بنجاح على الهاتف وسحابياً ✅' };
          }
        }
        
        // إذا كان أوفلاين أو فشل السحاب، أضف للطابور
        await addToSyncQueue({ type: 'daily_archive', payload: dbPayload });
        return { success: true, message: 'تم الحفظ على الهاتف وسيتم الحفظ على السحابة بمجرد توافر إنترنت 💾' };

      } catch (error) {
        logger.error('💥 Archive Error:', error);
        return { success: false, message: error.message || 'فشل في الأرشفة' };
      } finally {
        this.isLoading = false;
      }
    },

    async loadDataFromStorage() {
      const newData = localStorage.getItem("harvestData");
      if (newData) {
        const newRows = this.parseRawDataToRows(newData);
        if (newRows.length > 0) {
          this.rows = newRows;
          await this.addRow();
          localStorage.removeItem("harvestData");
          await this.saveRowsToStorage();
          return true;
        }
      }
      return false;
    },

    async addRow() {
      this.rows.push({
        id: Date.now() + Math.random(),
        serial: this.rows.length + 1,
        shop: '', code: '', amount: '', extra: '', collector: '', net: 0, isImported: false
      });
      await this.saveRowsToStorage();
    },

    setMasterLimit(limit) {
      this.masterLimit = Math.round(parseFloat(limit) || 0);
      localStorage.setItem('masterLimit', this.masterLimit.toString());
    },

    loadMasterLimit() {
      const limit = localStorage.getItem('masterLimit');
      this.masterLimit = limit !== null ? Math.round(parseFloat(limit)) : 100000;
    },

    setExtraLimit(limit) {
      this.extraLimit = Math.round(parseFloat(limit) || 0);
      localStorage.setItem('extraLimit', this.extraLimit.toString());
    },

    loadExtraLimit() {
      const limit = localStorage.getItem('extraLimit');
      if (limit) this.extraLimit = Math.round(parseFloat(limit));
    },

    setCurrentBalance(balance) {
      this.currentBalance = Math.round(parseFloat(balance) || 0);
      localStorage.setItem('currentBalance', this.currentBalance.toString());
    },

    formatNumber(num) {
      return new Intl.NumberFormat('en-US').format(Math.round(num || 0));
    }
  }
});
