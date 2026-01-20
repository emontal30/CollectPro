import { defineStore } from 'pinia';
import { useAuthStore } from './auth';
import { useArchiveStore } from './archiveStore';
import { useCollaborationStore } from './collaborationStore';
import { useItineraryStore } from './itineraryStore';
import { addToSyncQueue } from '@/services/archiveSyncQueue';

import { safeDeepClone, setLocalStorageCache, getLocalStorageCache, removeFromAllCaches } from '@/services/cacheManager';
import { apiInterceptor } from '@/services/apiInterceptor';
import api from '@/services/api';
import logger from '@/utils/logger.js';
import localforage from 'localforage';
import { supabase } from '@/supabase';
import { TimeService } from '@/utils/time';

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
    sharedLastUpdated: null,
    isSharedLoading: false,

    // General
    currentDate: new Date().toISOString().split('T')[0],
    error: null,
    searchQuery: '',
    realtimeChannel: null, // For shared session
    ownRealtimeChannel: null, // For my own session (Admin sync)
    autoSyncInterval: null, // For periodic auto-sync of shared sessions
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
        await this.loadMasterLimit(); // From localStorage
        await this.loadExtraLimit(); // From localStorage
        const savedBalance = await getLocalStorageCache('currentBalance');
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

        // Start listening for Admin overrides or other sync events
        this.initOwnRealtimeSubscription();

        // Initial Cloud Sync (in case we missed updates while offline)
        if (navigator.onLine) {
          this.syncFromCloud().catch(err => {
            logger.warn('Initial cloud sync failed:', err);
          });
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

    // New: Fetch latest state from cloud
    async syncFromCloud() {
      const authStore = useAuthStore();
      if (!authStore.user) return;
      const userId = authStore.user.id;

      const { data, error } = await supabase
        .from('live_harvest')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        // Check if cloud is newer than local? 
        // For cooperation, we assume Cloud is the "Meeting Point".
        // But purely local work might be newer if offline? 
        // If we are initializing, we just loaded from Local.
        // Let's assume Cloud wins if it has content, OR we check timestamps if we had them.
        // Since we don't track local-only timestamp reliably, we'll assume Cloud is Master for Collaboration.
        // BUT be careful not to overwrite Unsynced Local work.
        // "syncToCloud" is called on every save. So if I was offline, I have unsynced work.
        // If I come online, "syncFromCloud" runs.
        // Ideally, we should syncToCloud pending changes first?
        // Since we don't have a sophisticated conflict resolution, and the User didn't ask for "Offline Sync Conflict Resolution",
        // I will prioritizing NOT overwriting if I have local data?
        // Actually, for "Live Cooperation", checking Cloud is better.
        // Let's just update if differ.

        // Optimization: If rows are empty locally but exist in cloud, definitely take cloud.
        const localEmpty = !this.hasData;

        if (localEmpty || (data.updated_at && new Date(data.updated_at) > new Date(Date.now() - 60000))) {
          // If cloud data is very recent (last minute) or local is empty, take it.
          // This is a heuristic.
          this.rows = data.rows || [];
          this.masterLimit = parseFloat(data.master_limit) || 0;
          this.extraLimit = parseFloat(data.extra_limit) || 0;
          this.currentBalance = parseFloat(data.current_balance) || 0;
          logger.info('☁️ Applied Initial Cloud Data');

          // Fix: Clone before saving to avoid DataCloneError with Proxies
          const rowsToSave = safeDeepClone(this.rows);
          await localforage.setItem(HARVEST_ROWS_KEY, rowsToSave);
        }
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
      this.isCloudSyncing = true;

      try {
        const payload = {
          // No user_id in payload for update, or just for reference, but RLS relies on the match
          rows: this.sharedRows,
          master_limit: this.sharedMasterLimit,
          extra_limit: this.sharedExtraLimit,
          current_balance: this.sharedCurrentBalance,
          last_updated_by: (await supabase.auth.getUser()).data.user?.id,
          updated_at: new Date()
        };

        logger.info(`💾 Syncing shared data for target: ${targetUserId} as Editor...`);

        // Use UPDATE instead of UPSERT
        // Collaborators have specific UPDATE policies, but rarely INSERT policies for other users' data.
        const { error } = await supabase
          .from('live_harvest')
          .update(payload)
          .eq('user_id', targetUserId);

        if (error) {
          logger.error('❌ Failed to update shared data (RLS or Network):', error);
          throw error;
        }

        logger.info('✅ Shared data synced successfully.');

      } catch (error) {
        console.error('Failed to update shared data:', error.message);
        // We might want to notify the user via a persistent error state in the store
        // but for now, we rely on the logger.
      } finally {
        this.isCloudSyncing = false;
      }
    },

    async switchToUserSession(userId) {
      // CRITICAL: This function now only affects the SHARED part of the state.

      // Clear existing realtime channel
      if (this.realtimeChannel) {
        await supabase.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
      }

      // Clear existing auto-sync interval
      if (this.autoSyncInterval) {
        clearInterval(this.autoSyncInterval);
        this.autoSyncInterval = null;
      }

      if (!userId) {
        this.sharedRows = [];
        this.sharedMasterLimit = 0;
        this.sharedExtraLimit = 0;
        this.sharedCurrentBalance = 0;
        return;
      }

      // Function to fetch shared data
      const fetchSharedData = async () => {
        try {
          const { data, error } = await supabase
            .from('live_harvest')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') throw error;

          if (data) {
            this.sharedRows = data.rows || [];
            this.sharedMasterLimit = parseFloat(data.master_limit) || 0;
            this.sharedExtraLimit = parseFloat(data.extra_limit) || 0;
            this.sharedCurrentBalance = parseFloat(data.current_balance) || 0;
            this.sharedLastUpdated = data.updated_at || null;
          } else {
            // If no data exists for the user, reset the shared state.
            this.sharedRows = [];
            this.sharedMasterLimit = 0;
            this.sharedExtraLimit = 0;
            this.sharedCurrentBalance = 0;
            this.sharedLastUpdated = null;
          }
        } catch (err) {
          logger.error('Failed to fetch shared data:', err);
        }
      };

      this.isSharedLoading = true;
      try {
        // Initial fetch
        await fetchSharedData();

        // Setup realtime subscription
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
                this.sharedLastUpdated = newData.updated_at || new Date().toISOString();
                logger.info('📡 Realtime update received for shared session');
              }
            }
          )
          .subscribe();

        // Setup periodic auto-sync every 30 seconds
        this.autoSyncInterval = setInterval(async () => {
          logger.info('🔄 Auto-syncing shared session data...');
          await fetchSharedData();
        }, 30000); // 30 seconds

        logger.info('✅ Shared session initialized with realtime + auto-sync');

      } catch (err) {
        logger.error('Failed to switch to user session:', err);
        // On failure, clear the shared state, don't touch local data.
        this.sharedRows = [];
        this.sharedMasterLimit = 0;
        this.sharedExtraLimit = 0;
        this.sharedCurrentBalance = 0;
        this.sharedLastUpdated = null;
      } finally {
        this.isSharedLoading = false;
      }
    },

    // --- Bidirectional Sync for Owner ---
    async initOwnRealtimeSubscription() {
      const auth = useAuthStore();
      if (!auth.user) return;

      const userId = auth.user.id;

      if (this.ownRealtimeChannel) {
        supabase.removeChannel(this.ownRealtimeChannel);
      }

      this.ownRealtimeChannel = supabase
        .channel(`my-harvest-sync-${userId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'live_harvest', filter: `user_id=eq.${userId}` },
          (payload) => {
            const newData = payload.new;
            if (!newData) return;

            // CRITICAL: Check who updated it.
            // If I updated it (last_updated_by == my_id), ignore it to avoid loops/jitter.
            if (newData.last_updated_by === userId) return;

            // If someone else (e.g. Admin) updated it, apply changes to LOCAL state.
            this.rows = newData.rows || [];
            this.masterLimit = parseFloat(newData.master_limit) || 0;
            this.extraLimit = parseFloat(newData.extra_limit) || 0;
            this.currentBalance = parseFloat(newData.current_balance) || 0;

            // We should also persist to local storage to keep offline capability in sync
            this.saveRowsToStorage();

            logger.info('Received update from Admin/Collaborator - synced automatically');
          }
        )
        .subscribe();
    },

    // دالة جديدة: مزامنة إجبارية فورية مع السحابة
    async forceSyncToCloud(targetUserId) {
      if (!targetUserId) return;

      logger.info('Force syncing local data to cloud...');

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

        logger.info('Force sync completed successfully');
      } catch (error) {
        logger.error('Force sync to cloud failed:', error.message);
      }
    },

    /**
     * حفظ المتأخرات مع تاريخ الأرشيف
     * @param {Array} overdueItems - المتأخرات
     * @param {String} archiveDate - تاريخ الأرشيف
     */
    async _saveOverdueWithArchiveDate(overdueItems, archiveDate) {
      // ✅ حذف البيانات القديمة أولاً (كلا النظامين)
      await Promise.all([
        localforage.removeItem('overdue_stores'),          // النظام القديم
        localforage.removeItem('overdue_stores_metadata')  // النظام الجديد
      ]);

      logger.info('🗑️ Cleared old overdue data locally (both formats)');

      // ✅ حفظ البيانات الجديدة
      const metadata = {
        archive_date: archiveDate,
        created_at: new Date().toISOString(),
        synced_to_cloud: false,
        items: overdueItems
      };

      await localforage.setItem('overdue_stores_metadata', metadata);
      logger.info(`💾 Saved ${overdueItems.length} overdue items for archive date: ${archiveDate}`);
    },

    /**
     * الحصول على آخر تاريخ أرشيف
     * @returns {String|null} آخر تاريخ أرشيف أو null
     */
    async _getLatestArchiveDate() {
      const archiveStore = useArchiveStore();

      // جلب التواريخ المتاحة إذا لم تكن محملة
      if (archiveStore.availableDates.length === 0) {
        await archiveStore.loadAvailableDates();
      }

      // آخر تاريخ هو الأول في القائمة (مرتبة تنازلياً)
      const latestDate = archiveStore.availableDates[0]?.value || null;

      logger.info(`📅 Latest archive date: ${latestDate || 'none'}`);
      return latestDate;
    },

    // دالة خاصة لمزامنة المتأخرات سحابياً (حذف القديم وإضافة الجديد)
    async syncOverdueStoresToCloud(overdueItems, archiveDate, skipQueueOnError = false) {
      const authStore = useAuthStore();

      if (!authStore.user) {
        logger.warn('⚠️ Cannot sync overdue: No authenticated user');
        return;
      }

      if (!navigator.onLine) {
        logger.warn('⚠️ Cannot sync overdue: Offline');
        if (!skipQueueOnError) {
          await addToSyncQueue({
            type: 'sync_overdue_stores',
            payload: { items: overdueItems, archive_date: archiveDate },
            timestamp: Date.now()
          });
        }
        return;
      }

      try {
        const userId = authStore.user.id;

        // 1. Delete all existing pending overdue stores for this user
        const { error: deleteError } = await supabase
          .from('pending_overdue_stores')
          .delete()
          .eq('user_id', userId);

        if (deleteError) throw deleteError;

        logger.info('🗑️ Deleted all old overdue stores from cloud');

        // 2. If we have new items, insert them
        if (overdueItems && overdueItems.length > 0) {
          const records = overdueItems.map(item => ({
            user_id: userId,
            shop: item.shop,
            code: item.code,
            net: item.net,
            archive_date: archiveDate  // ← إضافة التاريخ
          }));

          const { error: insertError } = await supabase
            .from('pending_overdue_stores')
            .insert(records);

          if (insertError) throw insertError;

          logger.info(`☁️ Synced ${overdueItems.length} overdue items to cloud with date: ${archiveDate}`);
        } else {
          logger.info('☁️ No overdue items to sync (all cleared)');
        }

      } catch (err) {
        logger.error('❌ Failed to sync overdue stores to cloud:', err);

        // في حالة الفشل، إضافة للطابور إذا لم يطلب تخطي ذلك
        if (!skipQueueOnError) {
          await addToSyncQueue({
            type: 'sync_overdue_stores',
            payload: { items: overdueItems, archive_date: archiveDate },
            timestamp: Date.now()
          });
        }

        throw err; // Re-throw to be caught by caller if needed
      }
    },

    /**
     * جلب المتأخرات - منطق مبسط بناءً على مطابقة تاريخ الأرشيف
     */
    async fetchOverdueStores() {
      const authStore = useAuthStore();

      // ✅ الخطوة 1: الحصول على آخر تاريخ أرشيف
      const latestArchiveDate = await this._getLatestArchiveDate();

      if (!latestArchiveDate) {
        logger.info('📭 No archives found, no overdue to fetch');
        return [];
      }

      logger.info(`📅 Latest archive date: ${latestArchiveDate}`);

      // ✅ الخطوة 2: الحصول على المتأخرات المحلية
      const localMetadata = await localforage.getItem('overdue_stores_metadata');
      const localDate = localMetadata?.archive_date || null;
      const localItems = localMetadata?.items || [];

      logger.info(`📍 Local overdue date: ${localDate || 'none'}`);

      // ✅ الخطوة 3: المقارنة البسيطة
      if (localDate === latestArchiveDate) {
        // ✅ التاريخ مطابق - إرجاع المحلي
        logger.info('✅ Local overdue matches latest archive date - using local');

        // التحقق من المزامنة في الخلفية
        if (!localMetadata.synced_to_cloud && navigator.onLine && authStore.user) {
          this.syncOverdueStoresToCloud(localItems, localDate).catch(err => {
            logger.warn('Background sync failed:', err);
          });
        }

        return localItems;
      }

      // ✅ الخطوة 4: التاريخ غير مطابق أو لا يوجد محلي - جلب من السحابة
      logger.info('🔄 Local date does not match or missing - fetching from cloud');

      if (!navigator.onLine || !authStore.user) {
        logger.warn('⚠️ Offline and local date mismatch - returning local (may be outdated)');
        return localItems;
      }

      try {
        const { data: cloudItems, error } = await supabase
          .from('pending_overdue_stores')
          .select('shop, code, net, archive_date')
          .eq('user_id', authStore.user.id)
          .eq('archive_date', latestArchiveDate);

        if (error) throw error;

        if (cloudItems && cloudItems.length > 0) {
          // حفظ محلياً
          await this._saveOverdueWithArchiveDate(cloudItems, latestArchiveDate);

          logger.info(`📥 Fetched ${cloudItems.length} overdue items from cloud`);
          return cloudItems;
        } else {
          // لا توجد متأخرات في السحابة لهذا التاريخ
          logger.info('📭 No overdue items in cloud for this date');

          // حذف المحلي القديم
          await localforage.removeItem('overdue_stores_metadata');

          return [];
        }

      } catch (err) {
        logger.error('❌ Failed to fetch from cloud:', err);
        // في حالة الخطأ، إرجاع المحلي
        return localItems;
      }
    },

    async applyOverdueStores(storesToApply) {
      if (!storesToApply || storesToApply.length === 0) return { addedCount: 0, duplicatesCount: 0 };

      let addedCount = 0;
      let duplicatesCount = 0;

      storesToApply.forEach(overdueStore => {
        const existingRow = this.rows.find(r => r.code && r.code.toString() === overdueStore.code.toString());

        // Count as duplicate for reporting if it already exists
        if (existingRow) {
          duplicatesCount++;
        }

        const overdueAmount = overdueStore.net * -1;

        if (existingRow) {
          // Accumulate the amount (e.g. 1000 + 1000 = 2000)
          existingRow.extra = (parseFloat(existingRow.extra) || 0) + overdueAmount;
          if (overdueStore.net < 0) existingRow.hasOverdue = true;
          else existingRow.hasOverpayment = true;

          existingRow.isOverdueApplied = true; // Mark as applied (Persistent)
          addedCount++;
        } else {
          // Add new row logic...
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
            isOverdueApplied: true // Mark as applied (Persistent)
          });
          addedCount++;
        }
      });

      const lastRow = this.rows[this.rows.length - 1];
      if (lastRow && (lastRow.shop || lastRow.code || lastRow.amount || lastRow.extra)) {
        this.addRow();
      }

      await this.saveRowsToStorage();
      return { addedCount, duplicatesCount };
    },

    async clearOverdueStores() {
      // 1. Clear both old and new local storage keys
      await localforage.removeItem('overdue_stores');
      await localforage.removeItem('overdue_stores_metadata');

      const authStore = useAuthStore();
      if (authStore.user && navigator.onLine) {
        try {
          await supabase
            .from('pending_overdue_stores')
            .delete()
            .eq('user_id', authStore.user.id);
        } catch (err) {
          logger.error('Error clearing cloud overdue stores:', err);
        }
      }
    },

    async deleteOverdueStores(codes = []) {
      if (!Array.isArray(codes) || codes.length === 0) return;
      try {
        // Support both old format (array) and new format (metadata object)
        const metadata = await localforage.getItem('overdue_stores_metadata');
        let currentItems = [];

        if (metadata && metadata.items) {
          currentItems = metadata.items;
        } else {
          // Fallback to old key for one last time
          currentItems = (await localforage.getItem('overdue_stores')) || [];
        }

        const filtered = currentItems.filter(s => !codes.includes(String(s.code)));

        // Update both if they exist, but primarily the new metadata format
        if (metadata) {
          metadata.items = filtered;
          await localforage.setItem('overdue_stores_metadata', metadata);
        } else if (currentItems.length > 0) {
          // If we only have the old format, we don't migrate here (fetch will handle it), just update old key
          if (filtered.length > 0) await localforage.setItem('overdue_stores', filtered);
          else await localforage.removeItem('overdue_stores');
        }

        // Cloud Delete
        const authStore = useAuthStore();
        if (authStore.user && navigator.onLine) {
          await supabase
            .from('pending_overdue_stores')
            .delete()
            .eq('user_id', authStore.user.id)
            .in('code', codes.map(String));
        }

      } catch (err) {
        logger.error('Error deleting overdue stores:', err);
      }
    },

    async clearAll() {
      await this.resetTable();
      this.searchQuery = '';
      this.currentBalance = 0;
      this.extraLimit = 0;
      this.currentBalance = 0;
      this.extraLimit = 0;
      await removeFromAllCaches('currentBalance');
      await removeFromAllCaches('extraLimit');
      await localforage.removeItem(HARVEST_ROWS_KEY);
      this.isModified = false;
    },

    async clearFields() {
      await this.clearAll();
    },

    async getAccurateDate() {
      return await TimeService.getCairoDate();
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

        // ✅ التغيير: حفظ مع تاريخ الأرشيف باستخدام النظام الجديد
        await Promise.all([
          localforage.setItem(localKey, cleanRows),
          overdueStores.length > 0
            ? this._saveOverdueWithArchiveDate(overdueStores, dateToSave)
            : Promise.all([
              localforage.removeItem('overdue_stores'),          // حذف النظام القديم
              localforage.removeItem('overdue_stores_metadata')  // حذف النظام الجديد
            ])
        ]);

        // ✅ التغيير: المزامنة بدون انتظار (Fire and Forget)
        // لا نريد أن تعطل مزامنة المتأخرات عملية الأرشفة الأساسية
        (async () => {
          try {
            if (navigator.onLine) {
              await this.syncOverdueStoresToCloud(overdueStores, dateToSave);

              // تحديث حالة المزامنة
              const metadata = await localforage.getItem('overdue_stores_metadata');
              if (metadata) {
                metadata.synced_to_cloud = true;
                await localforage.setItem('overdue_stores_metadata', metadata);
              }
              logger.info('✅ Overdue synced successfully in background');
            } else {
              await addToSyncQueue({
                type: 'sync_overdue_stores',
                payload: { items: overdueStores, archive_date: dateToSave },
                timestamp: Date.now()
              });
              logger.info(`📌 Overdue queued for sync (offline) - Date: ${dateToSave}`);
            }
          } catch (err) {
            logger.warn('⚠️ Background overdue sync failed, adding to queue:', err);
            await addToSyncQueue({
              type: 'sync_overdue_stores',
              payload: { items: overdueStores, archive_date: dateToSave },
              timestamp: Date.now()
            });
          }
        })();

        await archiveStore.loadAvailableDates(false);
        this._performCloudSync(dbPayload);

        try {
          const itineraryStore = useItineraryStore();
          await itineraryStore.syncFromDashboard(cleanRows);
        } catch (syncError) {
          logger.error('Failed to sync with itinerary after archiving:', syncError);
          // Do not block the main operation, just log the error
        }

        return { success: true, message: 'تم الحفظ على الهاتف بنجاح، وتتم المزامنة سحابياً 💾' };
      } catch (error) {
        logger.error('💥 Archive Error:', error);
        return { success: false, message: error.message || 'فشل في الأرشفة' };
      } finally {
        this.isLoading = false;
      }
    },

    async _performCloudSync(dbPayload) {
      // دائماً نستخدم الطابور لضمان عدم تعليق الواجهة وحفظ البيانات
      // سيقوم الطابور بمعالجة الطلب في الخلفية فوراً إذا كان هناك إنترنت
      await addToSyncQueue({ type: 'daily_archive', payload: dbPayload });
      return 'queued';
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
      const newData = await getLocalStorageCache("harvestData");
      if (newData) {
        const newRows = this.parseRawDataToRows(newData);
        if (newRows.length > 0) {
          this.rows = newRows;
          await this.addRow();
          await removeFromAllCaches("harvestData");
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

    async setMasterLimit(limit) {
      this.masterLimit = parseFloat(limit) || 0;
      await setLocalStorageCache('masterLimit', this.masterLimit.toString());
      this.saveRowsToStorage();
    },

    async loadMasterLimit() {
      const limit = await getLocalStorageCache('masterLimit');
      this.masterLimit = limit !== null ? parseFloat(limit) : 100000;
    },

    async setExtraLimit(limit) {
      this.extraLimit = parseFloat(limit) || 0;
      await setLocalStorageCache('extraLimit', this.extraLimit.toString());
      this.saveRowsToStorage();
    },

    async loadExtraLimit() {
      const limit = await getLocalStorageCache('extraLimit');
      if (limit) this.extraLimit = parseFloat(limit);
    },

    async setCurrentBalance(balance) {
      this.currentBalance = parseFloat(balance) || 0;
      await setLocalStorageCache('currentBalance', this.currentBalance.toString());
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