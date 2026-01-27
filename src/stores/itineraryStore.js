import { withTimeout } from '@/utils/promiseUtils';
import { defineStore } from 'pinia';
import { ref, computed, toRaw } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useNotifications } from '@/composables/useNotifications';
import { supabase } from '@/supabase';
import logger from '@/utils/logger.js';
import localforage from 'localforage';

export const useItineraryStore = defineStore('itinerary', () => {
  const routes = ref([]);
  const ignoredRoutes = ref([]);
  const profiles = ref([]);
  const isLoading = ref(false);
  const lastFetchTime = ref(0);
  const pendingQueue = ref([]);

  // State from ItineraryView
  const activeTab = ref('list');
  const selectedIds = ref([]);
  const sortBalanceDir = ref(null);
  const searchQuery = ref('');
  const showModal = ref(false);
  const showIgnoredModal = ref(false);
  const showProfilesModal = ref(false);
  const profileNames = ref({ 1: 'خط سير 1', 2: 'خط سير 2', 3: 'خط سير 3' });
  const zoom = ref(13);
  const center = ref([30.0444, 31.2357]);
  const editingRoute = ref(null);
  const coordsInput = ref('');
  const draggedIndex = ref(null);

  const { addNotification, confirm } = useNotifications();
  const authStore = useAuthStore();

  const BASE_PREFIX = 'itinerary_data_';
  const STORAGE_KEY = computed(() => {
    const userId = authStore.user?.id;
    return userId ? `u_${userId}_${BASE_PREFIX}routes` : `${BASE_PREFIX}routes`;
  });
  const QUEUE_KEY = computed(() => `${STORAGE_KEY.value}_queue`);
  const PROFILE_STORAGE_KEY = computed(() => {
    const userId = authStore.user?.id;
    return userId ? `u_${userId}_itinerary_profiles` : `itinerary_profiles`;
  });

  const safeSaveLocal = async (key, val) => {
    try {
      const rawData = JSON.parse(JSON.stringify(val));
      await localforage.setItem(key, rawData);
    } catch (err) {
      logger.error(`Error saving to localforage (${key}):`, err);
    }
  };

  // Ensure route arrays are unique by shop_code and keep the most-relevant record
  function normalizeRoutes(arr) {
    if (!arr || !Array.isArray(arr)) return [];
    const map = new Map();
    for (const r of arr) {
      const code = String(r.shop_code ?? '').trim();
      if (!code) continue;
      if (!map.has(code)) {
        map.set(code, { ...r });
        continue;
      }
      const existing = map.get(code);
      const existingTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
      const newTime = new Date(r.updated_at || r.created_at || 0).getTime();
      // Prefer the record with the most recent timestamp; if equal prefer the non-temp id
      if (newTime > existingTime) map.set(code, { ...r });
      else if (newTime === existingTime) {
        if (String(existing.id).startsWith('temp_') && !String(r.id).startsWith('temp_')) map.set(code, { ...r });
      }
    }
    const out = Array.from(map.values());
    out.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    out.forEach((r, i) => { r.orderInput = r.orderInput ?? i + 1; });
    return out;
  }

  // Computed Properties from ItineraryView
  const displayedRoutes = computed(() => {
    const q = (searchQuery.value || '').trim().toLowerCase();
    if (!q) return routes.value;
    return routes.value.filter(r => {
      const name = (r.shop_name ?? '').toString().toLowerCase();
      const code = (r.shop_code ?? '').toString().toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  });

  const totalBalance = computed(() => {
    return displayedRoutes.value.reduce((sum, r) => sum + (parseFloat(r.current_balance) || 0), 0);
  });

  const approxTotalBalance = computed(() => Math.floor((totalBalance.value || 0) / 1000) * 1000);

  const isAllSelected = computed(() => displayedRoutes.value.length > 0 && selectedIds.value.length === displayedRoutes.value.length);

  const routesWithCoords = computed(() => {
    return routes.value
      .map((r, i) => ({ ...r, originalIndex: i }))
      .filter(r => r.latitude && r.longitude);
  });

  const polylineCoords = computed(() => routesWithCoords.value.map(r => [r.latitude, r.longitude]));


  async function fetchRoutes(force = false) {
    if (!authStore.user) return;

    // 1. Load Local First (Fast)
    const localData = await localforage.getItem(STORAGE_KEY.value);
    if (localData && Array.isArray(localData)) {
      // Normalize to remove local duplicates if any
      const normalized = normalizeRoutes(localData);
      routes.value = normalized;
      isLoading.value = false;
    }

    // 2. Fetch/Sync Cloud (Background)
    if (!navigator.onLine) return;

    try {
      const { data: cloudRoutes, error } = await withTimeout(
        (signal) => supabase
          .from('client_routes')
          .select('*')
          .eq('user_id', authStore.user.id)
          .abortSignal(signal),
        20000,
        'Fetch routes timed out'
      );

      if (error) throw error;

      if (cloudRoutes && cloudRoutes.length > 0) {
        // ... existing merge logic ...
        // Merge Cloud & Local
        // We assume Cloud has the "truth" for persistence, but Local might have unsynced newer edits.
        // normalizeRoutes logic uses 'updated_at' to pick winner.
        const currentLocal = routes.value || [];
        const combined = [...currentLocal, ...cloudRoutes];

        const merged = normalizeRoutes(combined);

        // Update state
        routes.value = merged;

        // Save back to local to keep them in sync
        await safeSaveLocal(STORAGE_KEY.value, merged);
      }
    } catch (err) {
      if (err.message && err.message.includes('timed out')) {
        logger.info('Background fetch routes timed out (slow network), using local data.');
      } else {
        logger.error('Error fetching cloud routes:', err);
      }
    }

    // Fetch profiles as well
    fetchProfiles();
  }

  async function refreshData() {
    console.log('🔄 Refresh button clicked - starting refresh...');

    // Check if online
    if (!navigator.onLine) {
      addNotification('لا يوجد اتصال بالإنترنت ⚠️', 'warning');
      console.log('⚠️ Offline - cannot refresh');
      return;
    }

    const startTime = Date.now();
    isLoading.value = true;

    try {
      // Add minimum delay so user can see the spinner (1.5 seconds)
      const minDelay = new Promise(resolve => setTimeout(resolve, 0));
      const fetchPromise = fetchRoutes(true);

      await Promise.all([minDelay, fetchPromise]);

      console.log('✅ Refresh completed successfully');
      addNotification('تم تحديث البيانات من الخادم 🔄', 'success');
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      addNotification('فشل التحديث', 'error');
    } finally {
      isLoading.value = false;
      console.log('🏁 Refresh process ended');
    }
  }

  async function syncFromDashboard(dashboardRows) {
    if (!authStore.user || !dashboardRows || dashboardRows.length === 0) return;

    try {
      const timestamp = new Date().toISOString();
      const currentRoutesMap = new Map(routes.value.map(r => [String(r.shop_code).trim(), r]));

      const routesToUpsert = [];

      dashboardRows.forEach(row => {
        if (!row.code) return;
        const codeStr = String(row.code).trim();
        const balance = parseFloat(row.balance || row.amount || 0);
        const shopName = row.name || row.shop || '';

        let routeEntry;

        if (currentRoutesMap.has(codeStr)) {
          const existing = currentRoutesMap.get(codeStr);
          // Update existing local fields
          existing.current_balance = balance;
          if (shopName) existing.shop_name = shopName;
          existing.updated_at = timestamp;
          routeEntry = existing;
        } else {
          // New Route
          const newRoute = {
            id: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, // Temp ID until DB sync
            user_id: authStore.user.id,
            shop_code: codeStr,
            shop_name: shopName,
            current_balance: balance,
            latitude: null, longitude: null,
            sort_order: routes.value.length + 1,
            is_ignored: false,
            created_at: timestamp,
            updated_at: timestamp
          };
          currentRoutesMap.set(codeStr, newRoute);
          routeEntry = newRoute;
        }

        // Prepare for Cloud Upsert
        routesToUpsert.push({
          user_id: authStore.user.id,
          shop_code: routeEntry.shop_code,
          shop_name: routeEntry.shop_name,
          current_balance: routeEntry.current_balance,
          // We must include sort_order and other fields to ensure record is complete
          sort_order: routeEntry.sort_order,
          is_ignored: routeEntry.is_ignored,
          updated_at: timestamp,
          // Only send lat/lng if they exist (don't overwrite with null if DB has them, 
          // but since we merged DB first in fetchRoutes, local should have them if they exist)
          latitude: routeEntry.latitude,
          longitude: routeEntry.longitude,
          location_updated_at: routeEntry.location_updated_at
        });
      });

      // 1. Update Local
      routes.value = normalizeRoutes(Array.from(currentRoutesMap.values()).sort((a, b) => a.sort_order - b.sort_order));
      await safeSaveLocal(STORAGE_KEY.value, routes.value);

      // Removed redundant notification regarding local save

      // 2. Update Cloud (Fire and Forget or Await?)
      if (navigator.onLine && routesToUpsert.length > 0) {
        // Upsert in chunks
        const chunkSize = 50;
        for (let i = 0; i < routesToUpsert.length; i += chunkSize) {
          const chunk = routesToUpsert.slice(i, i + chunkSize);
          const { error } = await supabase.from('client_routes').upsert(chunk, { onConflict: 'user_id, shop_code' });
          if (error) {
            logger.error('Sync Error (Chunk):', error);
            throw error;
          }
        }
        // Removed redundant notification regarding cloud sync
      }

    } catch (err) {
      logger.error('Sync Error:', err);
      addNotification('تم الحفظ محلياً لكن فشلت المزامنة', 'warning');
    }
  }

  async function deleteRoutes(routeIds) {
    if (!routeIds.length) return;
    routes.value = routes.value.filter(r => !routeIds.includes(r.id));
    await safeSaveLocal(STORAGE_KEY.value, routes.value);
    selectedIds.value = [];
    addNotification('تم الحذف نهائياً 🗑️', 'success');
  }

  async function emptyTrash() {
    if (!ignoredRoutes.value.length) return;
    // For local-only, if we ignored them, they are just in ignoredRoutes array.
    // We haven't implemented local persistence for 'ignoredRoutes' explicitly in the original code 
    // (it fetched from DB). We should clear valid ignored routes.
    // BUT since we are switching to fully local, 'ignoredRoutes' needs to be persisted locally too if we want trash bin to work.
    // For now, adhering to "Remove cloud sync", we just clear the in-memory/local trash.
    ignoredRoutes.value = [];
    await safeSaveLocal(`${STORAGE_KEY.value}_ignored`, []); // Ensure we clear reserved storage if we use it
    addNotification('تم إفراغ السلة بنجاح', 'success');
  }

  // Helper to persist ignored list locally since we can't fetch it from DB anymore
  async function _saveIgnored() {
    await safeSaveLocal(`${STORAGE_KEY.value}_ignored`, ignoredRoutes.value);
  }

  async function fetchProfiles() {
    try {
      const local = await localforage.getItem(PROFILE_STORAGE_KEY.value);
      if (local && Array.isArray(local)) {
        profiles.value = local;
        local.forEach(p => {
          if (p.slot_number) profileNames.value[p.slot_number] = p.profile_name;
        });
      }
    } catch (err) { logger.error('Error reading local profiles:', err); }

    // Keep Profile Sync
    if (!authStore.user || !navigator.onLine) return;
    try {
      const { data } = await supabase.from('route_profiles').select('*').eq('user_id', authStore.user.id).order('slot_number');
      if (data) {
        profiles.value = data;
        data.forEach(p => {
          if (p.slot_number) profileNames.value[p.slot_number] = p.profile_name;
        });
        await safeSaveLocal(PROFILE_STORAGE_KEY.value, profiles.value);
      }
    } catch (err) { logger.error(err); }
  }

  async function saveProfile(slotNumber, name) {
    const result = await confirm({ title: 'حفظ القالب', text: `هل تريد حفظ الترتيب الحالي في "${name}"؟` });
    if (!result?.isConfirmed) return;

    const codes = routes.value.map(r => r.shop_code);
    const payload = { user_id: authStore.user.id, slot_number: slotNumber, profile_name: name, shops_order: codes, updated_at: new Date() };

    // Local save
    try {
      const idx = profiles.value.findIndex(p => p.slot_number === slotNumber);
      if (idx !== -1) profiles.value[idx] = { ...profiles.value[idx], ...payload };
      else profiles.value.push(payload);
      await safeSaveLocal(PROFILE_STORAGE_KEY.value, profiles.value);
    } catch (err) { logger.error('Error saving profile locally:', err); }

    // Cloud Sync (Preserved)
    if (!authStore.user || !navigator.onLine) {
      await addToQueue({ type: 'profile_upsert', data: payload });
      addNotification('تم حفظ القالب محلياً وسيتم المزامنة لاحقاً', 'info');
      return;
    }

    try {
      await supabase.from('route_profiles').upsert(payload, { onConflict: 'user_id, slot_number' });
      addNotification('تم حفظ القالب', 'success');
    } catch (err) {
      await addToQueue({ type: 'profile_upsert', data: payload });
      addNotification('حدث خطأ أثناء الحفظ على الخادم، سيتم المحاولة لاحقاً', 'warning');
    }
  }

  async function deleteProfile(slotNumber) {
    if (!isSlotSaved(slotNumber)) return;
    const result = await confirm({ title: 'حذف القالب', text: 'سيتم حذف هذا القالب محلياً فقط.' });
    if (!result?.isConfirmed) return;

    try {
      profiles.value = profiles.value.filter(p => p.slot_number !== slotNumber);
      await safeSaveLocal(PROFILE_STORAGE_KEY.value, profiles.value);

      // إضافة إلى قائمة المحذوفات المحلية للمزامنة لاحقاً (اختياري)
      // await addToQueue({ type: 'profile_delete', data: { user_id: authStore.user?.id, slot_number: slotNumber } });

      addNotification('تم حذف القالب محلياً', 'success');
    } catch (err) {
      logger.error('Error deleting profile:', err);
      addNotification('فشل حذف القالب', 'error');
    }
  }

  async function applyProfile(slotNumber) {
    const result = await confirm({ title: 'تطبيق القالب', text: 'سيتم إعادة ترتيب القائمة الحالية حسب القالب المحفوظ. متابعة؟' });
    if (!result?.isConfirmed) return;

    const profile = profiles.value.find(p => p.slot_number === slotNumber);
    if (!profile?.shops_order) return;
    const orderMap = new Map();
    profile.shops_order.forEach((c, i) => orderMap.set(String(c), i));
    const sorted = [...routes.value].sort((a, b) => {
      const oA = orderMap.has(String(a.shop_code)) ? orderMap.get(String(a.shop_code)) : 999999;
      const oB = orderMap.has(String(b.shop_code)) ? orderMap.get(String(b.shop_code)) : 999999;
      return oA - oB;
    });
    await reorderRoutes(sorted);
    showProfilesModal.value = false;
    addNotification('تم تطبيق القالب', 'success');
  }

  async function ignoreRoutes(routeIds) {
    if (!routeIds.length) return;
    const result = await confirm({
      title: 'نقل للسلة',
      text: `هل تريد نقل ${routeIds.length} عميل إلى سلة المحذوفات؟`,
      icon: 'warning',
      confirmButtonText: 'نعم، نقل',
      confirmButtonColor: '#f39c12'
    });
    if (!result.isConfirmed) return;

    // Move to ignored list locally
    const moved = [];
    routes.value = routes.value.filter(r => {
      if (routeIds.includes(r.id)) {
        moved.push({ ...r, is_ignored: true });
        return false;
      }
      return true;
    });

    ignoredRoutes.value = [...ignoredRoutes.value, ...moved];

    await safeSaveLocal(STORAGE_KEY.value, routes.value);
    await _saveIgnored();

    selectedIds.value = [];
    addNotification('تم النقل للسلة محلياً', 'info');
  }

  async function fetchIgnoredList() {
    // Load from local storage instead of DB
    const localIgnored = await localforage.getItem(`${STORAGE_KEY.value}_ignored`);
    ignoredRoutes.value = localIgnored || [];
  }

  async function restoreRoute(routeId) {
    const idx = ignoredRoutes.value.findIndex(r => r.id === routeId);
    if (idx === -1) return;

    const [restored] = ignoredRoutes.value.splice(idx, 1);
    restored.is_ignored = false;

    routes.value.push(restored);
    routes.value.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    await safeSaveLocal(STORAGE_KEY.value, routes.value);
    await _saveIgnored();

    addNotification('تمت الاستعادة محلياً', 'success');
  }

  async function addRoute(routeData) {
    if (!routeData.shop_code || !authStore.user) return;
    const exists = routes.value.some(r => String(r.shop_code) === String(routeData.shop_code));
    if (exists) return;

    const newRoute = {
      ...routeData,
      id: `loc_${Date.now()}`,
      user_id: authStore.user.id,
      sort_order: routes.value.length + 1,
      is_ignored: false
    };

    routes.value.push(newRoute);
    await safeSaveLocal(STORAGE_KEY.value, routes.value);
  }

  async function reorderRoutes(newSortedRoutes) {
    routes.value = newSortedRoutes.map((r, i) => ({ ...r, sort_order: i + 1, orderInput: i + 1 }));
    await safeSaveLocal(STORAGE_KEY.value, routes.value);
    // No cloud sync
  }

  async function updateLocation(routeId, lat, lng) {
    const idx = routes.value.findIndex(r => r.id === routeId);
    if (idx !== -1) {
      const timestamp = new Date().toISOString();
      const route = routes.value[idx];

      // Update Local State
      route.latitude = lat;
      route.longitude = lng;
      route.location_updated_at = timestamp;
      route.updated_at = timestamp;

      await safeSaveLocal(STORAGE_KEY.value, routes.value);

      if (editingRoute.value && editingRoute.value.id === routeId) {
        editingRoute.value.latitude = lat;
        editingRoute.value.longitude = lng;
        editingRoute.value.location_updated_at = timestamp;
      }

      // Update Cloud
      if (authStore.user && navigator.onLine) {
        try {
          await supabase.from('client_routes').upsert({
            user_id: authStore.user.id,
            shop_code: route.shop_code,
            latitude: lat,
            longitude: lng,
            location_updated_at: timestamp,
            updated_at: timestamp
          }, { onConflict: 'user_id, shop_code' });
        } catch (err) {
          logger.error('Failed to update location on cloud', err);
        }
      }
    }
  }

  // Removed refreshIdsKeepingBalances as IDs are now local

  async function addToQueue(a) {
    // Only queue profiles
    if (['profile_upsert', 'profile_delete'].includes(a.type)) {
      pendingQueue.value.push(a);
      await safeSaveLocal(QUEUE_KEY.value, pendingQueue.value);
    }
  }

  async function processQueue() {
    if (!pendingQueue.value.length) return;
    const rem = [];
    for (const item of pendingQueue.value) {
      try {
        if (item.type === 'profile_upsert') {
          await supabase.from('route_profiles').upsert(item.data, { onConflict: 'user_id, slot_number' });
        } else if (item.type === 'profile_delete') {
          if (item.data && item.data.user_id) {
            await supabase.from('route_profiles').delete().eq('user_id', item.data.user_id).eq('slot_number', item.data.slot_number);
          }
        }
      } catch (e) { rem.push(item); }
    }
    pendingQueue.value = rem;
    await safeSaveLocal(QUEUE_KEY.value, rem);
  }
  function initNetworkListener() { window.addEventListener('online', () => { processQueue(); fetchProfiles(); }); }

  async function captureClientLocation(routeId, silent = false) {
    if (!navigator.geolocation) {
      addNotification('المتصفح لا يدعم تحديد الموقع', 'error');
      return;
    }

    if (!silent) {
      addNotification('جاري تحديد الموقع، يرجى الانتظار...', 'info');
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        await updateLocation(routeId, lat, lng);
        // After updating, also update the input field in the modal
        coordsInput.value = `${lat}, ${lng}`;
        if (!silent) {
          addNotification('تم حفظ الموقع بنجاح 📍', 'success');
        }
      },
      (error) => {
        // Log error regardless of silent mode, but suppress UI if desired? 
        // User asked to remove the message after writing. That usually implies success messages.
        // Errors should probably still be shown or logged. 
        // If silent is true, we might still want to show errors if it fails?
        // Let's assume silent means silent success, but errors might be important.
        // However, if it's auto-capture, maybe errors are annoying too.
        // I will keep errors for now or log them only?
        // User said "I don't want the message to appear".
        // If GPS is disabled, showing error every time they type is bad.

        let msg = 'فشل تحديد الموقع';
        const errorDetails = `Code: ${error.code}, Message: ${error.message}`;

        if (error.code === 1) msg = 'يجب السماح بالوصول للموقع من إعدادات المتصفح (Permission Denied)';
        else if (error.code === 2) msg = 'الموقع غير متاح حالياً (Position Unavailable)';
        else if (error.code === 3) msg = 'انتهت مهلة الانتظار (Timeout)، حاول في مكان مفتوح';

        if (!silent) {
          addNotification(msg, 'error');
        }
        logger.error(`📍 GPS Error: ${errorDetails}`);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }

  /* --- Admin Helper --- */
  async function adminFetchLocations() {
    // Only admins should call this
    try {
      const { data, error } = await supabase.rpc('get_client_locations_admin');

      if (error) throw error;
      return data || [];
    } catch (err) {
      logger.error('Admin Fetch Locations Error:', err);
      return [];
    }
  }

  async function deleteCustomerLocations(locationIds) {
    // Delete multiple customer locations by ID
    if (!locationIds || locationIds.length === 0) {
      throw new Error('No locations to delete');
    }

    try {
      logger.info(`🗑️ Deleting ${locationIds.length} customer locations...`);

      const { error } = await supabase
        .from('client_routes')
        .delete()
        .in('id', locationIds);

      if (error) throw error;

      logger.info(`✅ Successfully deleted ${locationIds.length} locations`);
      return true;
    } catch (err) {
      logger.error('❌ Error deleting customer locations:', err);
      throw new Error(`فشل حذف المواقع: ${err.message}`);
    }
  }

  // --- View Methods ---

  const toggleSelectAll = (e) => {
    selectedIds.value = e.target.checked ? displayedRoutes.value.map(r => r.id) : [];
  };

  async function deleteRoutesFromCloud(shopCodes) {
    if (!authStore.user || !shopCodes.length) return;
    if (!navigator.onLine) {
      addNotification('لا يوجد اتصال لحذف البيانات سحابياً', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('client_routes')
        .delete()
        .eq('user_id', authStore.user.id)
        .in('shop_code', shopCodes);

      if (error) throw error;
      logger.info(`Deleted ${shopCodes.length} routes from cloud successfully.`);
    } catch (err) {
      logger.error('Cloud delete failed:', err);
      addNotification('فشل الحذف السحابي', 'error');
      throw err;
    }
  }

  const confirmPermanentDelete = async () => {
    if (!selectedIds.value.length) return;

    // Admin Confirmation Logic
    if (authStore.isAdmin) {
      const result = await confirm({
        title: 'خيارات الحذف (أدمن)',
        text: `لقد حددت ${selectedIds.value.length} عنصر. اختر نوع الحذف:`,
        icon: 'warning',
        confirmButtonText: 'تنفيذ الحذف',
        confirmButtonColor: '#d33',
        input: 'radio',
        inputOptions: {
          'local': 'حذف محلي فقط (من هذا الجهاز)',
          'cloud': 'حذف سحابي فقط (من قاعدة البيانات)',
          'both': 'حذف من الجهتين (محلي + سحابي)'
        },
        inputValue: 'local', // default
        inputValidator: (value) => {
          if (!value) {
            return 'يجب اختيار نوع الحذف!';
          }
        }
      });

      if (result.isConfirmed) {
        const deleteType = result.value;
        const routesToDelete = routes.value.filter(r => selectedIds.value.includes(r.id));
        const shopCodes = routesToDelete.map(r => r.shop_code).filter(c => c);

        // 1. Cloud Delete
        if (deleteType === 'cloud' || deleteType === 'both') {
          if (shopCodes.length > 0) {
            try {
              await deleteRoutesFromCloud(shopCodes);
              if (deleteType === 'cloud') addNotification('تم الحذف من السحابة بنجاح', 'success');
            } catch (e) { return; } // Stop if cloud delete fails
          }
        }

        // 2. Local Delete
        if (deleteType === 'local' || deleteType === 'both') {
          await deleteRoutes(selectedIds.value);
        } else if (deleteType === 'cloud') {
          // If cloud only, we just clear selection to indicate done, but keep local data
          selectedIds.value = [];
        }
      }
      return;
    }

    // Regular User Logic (Local Only)
    const result = await confirm({
      title: 'حذف نهائي',
      text: `هل أنت متأكد من حذف ${selectedIds.value.length} عنصر؟ لا يمكن التراجع عن هذا الإجراء.`,
      icon: 'warning',
      confirmButtonText: 'نعم، حذف نهائي',
      confirmButtonColor: '#d33'
    });
    if (result.isConfirmed) {
      await deleteRoutes(selectedIds.value);
    }
  };

  const isSlotSaved = (slot) => profiles.value.some(p => p.slot_number === slot);

  const openIgnoredModal = () => {
    showIgnoredModal.value = true;
    fetchIgnoredList();
  };

  const reorderRoutesByInput = async () => {
    const sorted = [...routes.value].sort((a, b) => (a.orderInput || 0) - (b.orderInput || 0));
    await reorderRoutes(sorted);
  };

  const onDragStart = (e, index) => {
    draggedIndex.value = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.dropEffect = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const onDragEnter = (e, index) => {
    // Optional
  };

  const onDragEnd = (e) => {
    draggedIndex.value = null;
  };

  const onDrop = async (e, droppedIndex) => {
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (fromIndex === droppedIndex) return;

    // Move item in array
    const itemToMove = routes.value[fromIndex];
    const newRoutes = [...routes.value];
    newRoutes.splice(fromIndex, 1);
    newRoutes.splice(droppedIndex, 0, itemToMove);

    await reorderRoutes(newRoutes);
  };

  const toggleSortByBalance = () => {
    if (sortBalanceDir.value === null) sortBalanceDir.value = 'asc';
    else if (sortBalanceDir.value === 'asc') sortBalanceDir.value = 'desc';
    else sortBalanceDir.value = null;

    if (sortBalanceDir.value) {
      routes.value.sort((a, b) => {
        const balA = parseFloat(a.current_balance) || 0;
        const balB = parseFloat(b.current_balance) || 0;
        return sortBalanceDir.value === 'asc' ? balA - balB : balB - balA;
      });
    } else {
      // Reset to default sort (sort_order)
      routes.value.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }
  };

  const getBalanceClass = (val) => {
    const v = parseFloat(val);
    if (!v && v !== 0) return 'text-muted';
    if (v < 500) return 'text-danger';
    if (v <= 1000) return 'text-warning';
    return 'text-success';
  };

  const goToLocation = (route) => {
    if (route.latitude && route.longitude) {
      center.value = [route.latitude, route.longitude];
      zoom.value = 18;
      activeTab.value = 'map';
    }
  };

  const openLocationModal = (route) => {
    editingRoute.value = { ...route }; // Clone to avoid direct mutation
    coordsInput.value = route.latitude && route.longitude ? `${route.latitude}, ${route.longitude}` : '';
    showModal.value = true;
  };

  const closeModal = () => {
    showModal.value = false;
    editingRoute.value = null;
    coordsInput.value = '';
  };

  const copyCoords = () => {
    if (coordsInput.value) {
      navigator.clipboard.writeText(coordsInput.value);
      addNotification('تم نسخ الإحداثيات', 'success');
    }
  };

  const useGPS = () => {
    if (editingRoute.value) {
      captureClientLocation(editingRoute.value.id);
    }
  };

  const clearCoords = () => {
    coordsInput.value = '';
    if (editingRoute.value) {
      editingRoute.value.latitude = null;
      editingRoute.value.longitude = null;
    }
  };

  const saveLocation = async () => {
    if (!editingRoute.value) return;
    if (!coordsInput.value) {
      await updateLocation(editingRoute.value.id, null, null);
      addNotification('تم حذف الموقع', 'info');
      closeModal();
      return;
    }

    const parts = coordsInput.value.split(',').map(s => s.trim());
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        await updateLocation(editingRoute.value.id, lat, lng);
        addNotification('تم تحديث الموقع', 'success');
        closeModal();
      } else {
        addNotification('تنسيق غير صحيح', 'error');
      }
    } else {
      addNotification('تنسيق غير صحيح. الصيغة: lat, lng', 'error');
    }
  };

  return {
    routes, ignoredRoutes, profiles, isLoading,
    activeTab, selectedIds, sortBalanceDir, searchQuery, showModal, showIgnoredModal, showProfilesModal,
    profileNames, zoom, center, editingRoute, coordsInput, draggedIndex,

    displayedRoutes, totalBalance, approxTotalBalance, isAllSelected, routesWithCoords, polylineCoords,

    fetchRoutes, syncFromDashboard, ignoreRoutes, fetchIgnoredList, restoreRoute,
    deleteRoutes, emptyTrash, addRoute, reorderRoutes, updateLocation, initNetworkListener,
    fetchProfiles, saveProfile, applyProfile, deleteProfile,
    captureClientLocation,

    // View methods
    toggleSelectAll, confirmPermanentDelete, isSlotSaved, openIgnoredModal,
    reorderRoutesByInput, onDragStart, onDragEnter, onDragEnd, onDrop,
    toggleSortByBalance, getBalanceClass, goToLocation, openLocationModal,
    closeModal, copyCoords, useGPS, clearCoords, saveLocation,
    adminFetchLocations, deleteCustomerLocations, refreshData,
  };
});