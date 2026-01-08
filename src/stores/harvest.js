import { defineStore } from 'pinia';
import { useAuthStore } from './auth';
import { useArchiveStore } from './archiveStore';
import { useCollaborationStore } from './collaborationStore';
import { addToSyncQueue } from '@/services/archiveSyncQueue';
import { safeDeepClone } from '@/services/cacheManager';
import { apiInterceptor } from '@/services/apiInterceptor';
import api from '@/services/api';
import logger from '@/utils/logger.js';
import localforage from 'localforage';
import { supabase } from '@/supabase';

const HARVEST_ROWS_KEY = 'harvest_rows';

export const useHarvestStore = defineStore('harvest', {
  state: () => ({
    // Local State
    rows: [],
    masterLimit: 100000,
    extraLimit: 0,
    currentBalance: 0,
    isLoading: false,
    isModified: false,
    
    // Shared State
    sharedRows: [],
    sharedMasterLimit: 0,
    sharedExtraLimit: 0,
    sharedCurrentBalance: 0,
    isSharedLoading: false,

    // General
    currentDate: new Date().toISOString().split('T')[0],
    error: null,
    searchQuery: '',
    realtimeChannel: null,
    isCloudSyncing: false,
  }),

  getters: {
    // --- Local Getters ---
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

    hasData: (state) => {
      if (!state.rows || state.rows.length === 0) return false;
      if (state.rows.length > 1) return true;
      const firstRow = state.rows[0];
      return !!(firstRow.shop || firstRow.code || firstRow.amount || firstRow.collector || firstRow.extra);
    },
    
    resetStatus: (state) => {
      const totalCollected = state.totals.collector || 0;
      const resetVal = (state.currentBalance || 0) - ((state.masterLimit || 0) + (state.extraLimit || 0));
      const combinedValue = totalCollected + resetVal;
      
      if (combinedValue === 0) return { val: combinedValue, text: 'تم التحصيل بنجاح ✅', color: '#10b981' };
      if (combinedValue < 0) return { val: combinedValue, text: 'عجز 🔴', color: '#ef4444' };
      return { val: combinedValue, text: 'زيادة 🔵', color: '#3b82f6' };
    },
    
    resetAmount: (state) => (parseFloat(state.currentBalance) || 0) - ((parseFloat(state.masterLimit) || 0) + (parseFloat(state.extraLimit) || 0)),
    
    totalNet: (state) => state.totals.collector - (state.totals.amount + state.totals.extra),

    // --- Shared Getters ---
    sharedTotals: (state) => {
      const rows = state.sharedRows || [];
      return rows.reduce((acc, row) => {
        acc.amount += parseFloat(row.amount) || 0;
        acc.extra += parseFloat(row.extra) || 0;
        acc.collector += parseFloat(row.collector) || 0;
        acc.net += parseFloat(row.net) || 0;
        return acc;
      }, { amount: 0, extra: 0, collector: 0, net: 0 });
    },
  },

  actions: {
    async initialize() {
      // This function ONLY loads local data. Shared data is handled by switchToUserSession.
      this.isLoading = true;
      try {
        this.loadMasterLimit(); // From localStorage
        this.loadExtraLimit(); // From localStorage
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
      this.rows = [{ id: Date.now(), shop: '', code: '', amount: '', extra: '', collector: '', net: 0, hasOverdue: false, hasOverpayment: false }];
      await this.saveRowsToStorage();
    },

    async saveRowsToStorage() {
      // This function ONLY saves the local `rows` to localforage.
      try {
        const cleanedRows = safeDeepClone(this.rows);
        await localforage.setItem(HARVEST_ROWS_KEY, cleanedRows);
        this.isModified = true;

        const authStore = useAuthStore();
        if (navigator.onLine && authStore.user) {
          this.syncToCloud(authStore.user.id).catch(err => {
            logger.warn('Cloud sync for local data skipped:', err.message); 
          });
        }
      } catch (error) {
        logger.error('Error saving local rows to storage:', error);
      }
    },

    // Syncs LOCAL data to the cloud for the logged-in user.
    async syncToCloud(targetUserId) {
      if (!targetUserId) return;
      this.isCloudSyncing = true;
      try {
        const payload = {
          user_id: targetUserId,
          rows: this.rows,
          master_limit: this.masterLimit,
          extra_limit: this.extraLimit,
          current_balance: this.currentBalance,
          last_updated_by: (await supabase.auth.getUser()).data.user?.id,
          updated_at: new Date()
        };
        const { error } = await supabase.from('live_harvest').upsert(payload);
        if (error) throw error;
      } catch (error) {
        console.warn('Sync local data to cloud failed:', error.message);
      } finally {
        this.isCloudSyncing = false;
      }
    },

    async updateSharedData(targetUserId) {
      // New action to sync SHARED data to the cloud.
      if (!targetUserId) return;
      this.isCloudSyncing = true; // Consider a separate flag if needed e.g., isSharedSyncing
      try {
        const payload = {
          user_id: targetUserId,
          rows: this.sharedRows,
          master_limit: this.sharedMasterLimit,
          extra_limit: this.sharedExtraLimit,
          current_balance: this.sharedCurrentBalance,
          last_updated_by: (await supabase.auth.getUser()).data.user?.id,
          updated_at: new Date()
        };
        const { error } = await supabase.from('live_harvest').upsert(payload);
        if (error) throw error;
      } catch (error) {
        console.error('Failed to update shared data:', error.message);
      } finally {
        this.isCloudSyncing = false;
      }
    },

    async switchToUserSession(userId) {
      // CRITICAL: This function now only affects the SHARED part of the state.
      if (this.realtimeChannel) {
        await supabase.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
      }

      if (!userId) {
        this.sharedRows = [];
        this.sharedMasterLimit = 0;
        this.sharedExtraLimit = 0;
        this.sharedCurrentBalance = 0;
        return;
      }

      this.isSharedLoading = true;
      try {
        const { data, error } = await supabase
          .from('live_harvest')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          this.sharedRows = data.rows || [];
          this.sharedMasterLimit = parseFloat(data.master_limit) || 0;
          this.sharedExtraLimit = parseFloat(data.extra_limit) || 0;
          this.sharedCurrentBalance = parseFloat(data.current_balance) || 0;
        } else {
          // If no data exists for the user, reset the shared state.
          this.sharedRows = [];
          this.sharedMasterLimit = 0;
          this.sharedExtraLimit = 0;
          this.sharedCurrentBalance = 0;
        }

        this.realtimeChannel = supabase
          .channel(`harvest-${userId}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'live_harvest', filter: `user_id=eq.${userId}` },
            (payload) => {
              const newData = payload.new;
              if (newData) {
                // Update shared data on the fly.
                this.sharedRows = newData.rows;
                this.sharedMasterLimit = parseFloat(newData.master_limit) || 0;
                this.sharedExtraLimit = parseFloat(newData.extra_limit) || 0;
                this.sharedCurrentBalance = parseFloat(newData.current_balance) || 0;
              }
            }
          )
          .subscribe();

      } catch (err) {
        logger.error('Failed to switch to user session:', err);
        // On failure, clear the shared state, don't touch local data.
        this.sharedRows = [];
        this.sharedMasterLimit = 0;
        this.sharedExtraLimit = 0;
        this.sharedCurrentBalance = 0;
      } finally {
        this.isSharedLoading = false;
      }
    },

    // --- All other actions remain largely the same, operating on LOCAL state ---
    
    async fetchOverdueStores() {
      return await localforage.getItem('overdue_stores') || [];
    },

    async applyOverdueStores(storesToApply) {
      if (!storesToApply || storesToApply.length === 0) return;

      storesToApply.forEach(overdueStore => {
        const existingRow = this.rows.find(r => r.code && r.code.toString() === overdueStore.code.toString());
        const overdueAmount = overdueStore.net * -1;

        if (existingRow) {
          existingRow.extra = (parseFloat(existingRow.extra) || 0) + overdueAmount;
          if (overdueStore.net < 0) existingRow.hasOverdue = true;
          else existingRow.hasOverpayment = true;
        } else {
          if (this.rows.length === 1 && !this.rows[0].shop && !this.rows[0].code) {
            this.rows.pop();
          }
          this.rows.push({
            id: Date.now() + Math.random(),
            shop: overdueStore.shop,
            code: overdueStore.code,
            amount: null,
            extra: overdueAmount,
            collector: null,
            net: 0,
            isImported: false,
            hasOverdue: overdueStore.net < 0,
            hasOverpayment: overdueStore.net > 0,
          });
        }
      });

      const lastRow = this.rows[this.rows.length - 1];
      if (lastRow && (lastRow.shop || lastRow.code || lastRow.amount || lastRow.extra)) {
        this.addRow();
      }

      await this.saveRowsToStorage();
    },

    async clearOverdueStores() {
      await localforage.removeItem('overdue_stores');
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

    async clearFields() {
      await this.clearAll();
    },

    async getAccurateDate() {
      try {
        const { data, error } = await apiInterceptor(supabase.rpc('get_server_time'));
        if (error) throw new Error('Supabase RPC get_server_time failed');
        const serverDate = new Date(data);
        return serverDate.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
      } catch (error) {
        logger.error('Accurate time fetch failed, using local fallback:', error.message);
        return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
      }
    },

    async archiveTodayData(dateToSave) {
      const collabStore = useCollaborationStore();
      if (collabStore.activeSessionId) {
        throw new Error("لا يمكنك أرشفة بيانات زميل، يجب إنهاء الجلسة أولاً.");
      }
      if (!dateToSave) throw new Error("Date is required for archiving.");

      this.isLoading = true;
      try {
        const authStore = useAuthStore();
        const archiveStore = useArchiveStore();
        if (!authStore.isAuthenticated) throw new Error('يجب تسجيل الدخول أولاً');
        
        const validRows = this.rows.filter(r => r.shop || r.code || (parseFloat(r.amount) > 0) || (parseFloat(r.collector) > 0));
        if (validRows.length === 0) return { success: false, message: 'لا توجد بيانات صالحة للأرشفة' };
        
        const cleanRows = safeDeepClone(validRows).map(row => {
          const amount = parseFloat(row.amount) || 0;
          const extra = parseFloat(row.extra) || 0;
          const collector = parseFloat(row.collector) || 0;
          const net = collector - (amount + extra);
          return { shop: row.shop || '', code: row.code || '', amount, extra, collector, net };
        });
        
        const localKey = `${archiveStore.DB_PREFIX}${dateToSave}`;
        const dbPayload = {
          user_id: authStore.user.id,
          archive_date: dateToSave,
          data: cleanRows,
        };
        
        const overdueStores = validRows
          .map(row => ({ ...row, net: (parseFloat(row.collector) || 0) - ((parseFloat(row.amount) || 0) + (parseFloat(row.extra) || 0)) }))
          .filter(row => row.net !== 0)
          .map(row => ({ shop: row.shop, code: row.code, net: row.net }));
          
        await Promise.all([
          localforage.setItem(localKey, cleanRows),
          overdueStores.length > 0
            ? localforage.setItem('overdue_stores', overdueStores)
            : localforage.removeItem('overdue_stores')
        ]);
        
        await archiveStore.loadAvailableDates(false);
        this._performCloudSync(dbPayload);
        
        return { success: true, message: 'تم الحفظ على الهاتف بنجاح، وتتم المزامنة سحابياً 💾' };
      } catch (error) {
        logger.error('💥 Archive Error:', error);
        return { success: false, message: error.message || 'فشل في الأرشفة' };
      } finally {
        this.isLoading = false;
      }
    },

    async _performCloudSync(dbPayload) {
      const archiveStore = useArchiveStore();
      if (!navigator.onLine) {
        await addToSyncQueue({ type: 'daily_archive', payload: dbPayload });
        return 'queued';
      }
      const { error } = await apiInterceptor(
        api.archive.saveDailyArchive(dbPayload.user_id, dbPayload.archive_date, dbPayload.data)
      );

      if (error) {
        await addToSyncQueue({ type: 'daily_archive', payload: dbPayload });
        return 'queued';
      } else {
        await archiveStore.loadAvailableDates();
        return 'synced';
      }
    },

    parseRawDataToRows(rawData) {
      if (!rawData) return [];
      return rawData.split('\n').map((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.includes("المسلسل")) return null;
        const parts = trimmedLine.split("\t");
        if (parts.length < 2) return null;
        let shopName = parts[1].trim();
        let code = parts[2] ? parts[2].trim() : "";
        const match = shopName.match(/(.+?):\s*(\d+)/);
        if (match) {
          shopName = match[1].trim();
          code = match[2].trim();
        }
        const transferAmount = parseFloat(parts[3]?.replace(/,/g, '') || 0);
        if (transferAmount === 0) return null;
        return {
          id: Date.now() + index,
          serial: index + 1,
          shop: shopName,
          code: code,
          amount: transferAmount,
          extra: null, collector: null, net: 0 - transferAmount,
          isImported: true, hasOverdue: false, hasOverpayment: false
        };
      }).filter(Boolean);
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

    addRowWithData(newRowData) {
      if (!newRowData || !newRowData.code) return;
      if (this.rows.length === 0 || (this.rows.length === 1 && !this.rows[0].code && !this.rows[0].shop)) {
        this.rows = [];
      }
      this.rows.push({
        id: Date.now() + Math.random(),
        shop: newRowData.shop || '',
        code: newRowData.code || '',
        amount: newRowData.amount || null,
        extra: null, collector: null, net: 0,
        isImported: true, hasOverdue: false, hasOverpayment: false
      });
    },

    async addRow() {
      this.rows.push({
        id: Date.now() + Math.random(),
        serial: this.rows.length + 1,
        shop: '', code: '', amount: '', extra: '', collector: '', net: 0,
        isImported: false, hasOverdue: false, hasOverpayment: false
      });
      await this.saveRowsToStorage();
    },

    setMasterLimit(limit) {
      this.masterLimit = parseFloat(limit) || 0;
      localStorage.setItem('masterLimit', this.masterLimit.toString());
      this.saveRowsToStorage();
    },

    loadMasterLimit() {
      const limit = localStorage.getItem('masterLimit');
      this.masterLimit = limit !== null ? parseFloat(limit) : 100000;
    },

    setExtraLimit(limit) {
      this.extraLimit = parseFloat(limit) || 0;
      localStorage.setItem('extraLimit', this.extraLimit.toString());
      this.saveRowsToStorage();
    },

    loadExtraLimit() {
      const limit = localStorage.getItem('extraLimit');
      if (limit) this.extraLimit = parseFloat(limit);
    },

    setCurrentBalance(balance) {
      this.currentBalance = parseFloat(balance) || 0;
      localStorage.setItem('currentBalance', this.currentBalance.toString());
      this.saveRowsToStorage();
    },

    formatNumber(num) {
      return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num || 0);
    },

    sortRowsByItineraryProfile(shopsOrder) {
      if (!shopsOrder || shopsOrder.length === 0) return;
      const orderMap = new Map(shopsOrder.map((code, index) => [String(code), index]));
      this.rows.sort((a, b) => {
        const orderA = orderMap.has(String(a.code)) ? orderMap.get(String(a.code)) : Infinity;
        const orderB = orderMap.has(String(b.code)) ? orderMap.get(String(b.code)) : Infinity;
        return orderA - orderB;
      });
      this.saveRowsToStorage();
    }
  }
});