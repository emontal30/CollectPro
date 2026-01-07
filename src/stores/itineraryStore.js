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
    const now = Date.now();
    
    const localData = await localforage.getItem(STORAGE_KEY.value);
    if (localData) routes.value = localData.map((r, index) => ({ ...r, orderInput: r.orderInput ?? index + 1 }));


    const shouldFetchCloud = force || (now - lastFetchTime.value > 10 * 60 * 1000);

    if (shouldFetchCloud && navigator.onLine) {
      isLoading.value = true;
      try {
        if (pendingQueue.value.length > 0) await processQueue();

        const { data, error } = await supabase
          .from('client_routes')
          .select('*')
          .eq('user_id', authStore.user.id)
          .eq('is_ignored', false)
          .order('sort_order');

        if (error) throw error;

        if (data) {
          const localMap = new Map((localData || []).map(r => [r.shop_code, r]));
          const merged = data.map((serverRoute, index) => {
            const localRoute = localMap.get(serverRoute.shop_code);
            return {
              ...serverRoute,
              current_balance: localRoute?.current_balance || 0,
              latitude: serverRoute.latitude || localRoute?.latitude || null,
              longitude: serverRoute.longitude || localRoute?.longitude || null,
              orderInput: serverRoute.orderInput ?? index + 1
            };
          });
          
          routes.value = merged;
          await safeSaveLocal(STORAGE_KEY.value, merged);
          lastFetchTime.value = now;
        }
      } catch (err) {
        logger.error('❌ Fetch Error:', err);
      } finally {
        isLoading.value = false;
      }
    }
    fetchProfiles();
  }

  async function syncFromDashboard(dashboardRows) {
    if (!authStore.user || !dashboardRows || dashboardRows.length === 0) return;

    try {
      const newRoutesToSync = []; 
      const timestamp = new Date().toISOString();
      
      const currentRoutesMap = new Map(routes.value.map(r => [String(r.shop_code).trim(), r]));
      
      dashboardRows.forEach(row => {
        if (!row.code) return;
        const codeStr = String(row.code).trim();
        const balance = parseFloat(row.balance || row.amount || 0); 
        const shopName = row.name || row.shop || '';
        
        if (currentRoutesMap.has(codeStr)) {
          const existing = currentRoutesMap.get(codeStr);
          existing.current_balance = balance; 
          if(shopName) existing.shop_name = shopName;
          existing.updated_at = timestamp;
        } else {
          const newRoute = {
            id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            user_id: authStore.user.id,
            shop_code: codeStr,
            shop_name: shopName,
            current_balance: balance,
            latitude: null, longitude: null,
            sort_order: routes.value.length + newRoutesToSync.length + 1,
            is_ignored: false,
            created_at: timestamp,
            updated_at: timestamp
          };
          
          currentRoutesMap.set(codeStr, newRoute);
          newRoutesToSync.push({
            user_id: authStore.user.id,
            shop_code: codeStr,
            shop_name: shopName,
            sort_order: newRoute.sort_order,
            is_ignored: false
          });
        }
      });

      routes.value = Array.from(currentRoutesMap.values()).sort((a, b) => a.sort_order - b.sort_order);
      await safeSaveLocal(STORAGE_KEY.value, routes.value);

      if (newRoutesToSync.length > 0) {
        await addToQueue({ type: 'batch_add', data: newRoutesToSync });
        // Trigger queue processing in the background without waiting for it
        setTimeout(() => processQueue(), 100);
      }
      addNotification({ message: 'تم تحديث البيانات محلياً، وجاري المزامنة في الخلفية ✅', type: 'success' });
    } catch (err) {
      logger.error('Sync Error:', err);
      addNotification({ message: 'حدث خطأ أثناء المزامنة المحلية', type: 'error' });
    }
  }

  async function deleteRoutes(routeIds) {
    if (!routeIds.length) return;
    routes.value = routes.value.filter(r => !routeIds.includes(r.id));
    await safeSaveLocal(STORAGE_KEY.value, routes.value);
    selectedIds.value = [];
    if (navigator.onLine) {
        const realIds = routeIds.filter(id => !String(id).startsWith('temp_'));
        if (realIds.length) await supabase.from('client_routes').delete().in('id', realIds);
    } else {
        await addToQueue({ type: 'delete', ids: routeIds });
    }
    addNotification({ message: 'تم الحذف نهائياً 🗑️', type: 'success' });
  }

  async function emptyTrash() {
    if (!ignoredRoutes.value.length) return;
    const result = await confirm({
        title: 'إفراغ السلة',
        text: 'هل أنت متأكد من حذف جميع العناصر الموجودة في السلة نهائياً؟',
        icon: 'warning',
        confirmButtonText: 'نعم، إفراغ الكل',
        confirmButtonColor: '#e74c3c'
    });

    if (!result.isConfirmed) return;

    const ids = ignoredRoutes.value.map(r => r.id);
    if (navigator.onLine) {
        await supabase.from('client_routes').delete().in('id', ids);
    } else {
        await addToQueue({ type: 'delete', ids: ids });
    }
    ignoredRoutes.value = [];
    addNotification({ message: 'تم إفراغ السلة بنجاح', type: 'success' });
  }

  async function fetchProfiles() {
      try {
        const local = await localforage.getItem(PROFILE_STORAGE_KEY.value);
        if (local && Array.isArray(local)) {
          profiles.value = local;
          // Update profile names from local storage
          local.forEach(p => {
            if (p.slot_number) profileNames.value[p.slot_number] = p.profile_name;
          });
        }
      } catch (err) { logger.error('Error reading local profiles:', err); }

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

      try {
        const idx = profiles.value.findIndex(p => p.slot_number === slotNumber);
        if (idx !== -1) profiles.value[idx] = { ...profiles.value[idx], ...payload };
        else profiles.value.push(payload);
        await safeSaveLocal(PROFILE_STORAGE_KEY.value, profiles.value);
      } catch (err) { logger.error('Error saving profile locally:', err); }

      if (!authStore.user || !navigator.onLine) {
        await addToQueue({ type: 'profile_upsert', data: payload });
        addNotification({ message: 'تم حفظ القالب محلياً وسيتم المزامنة لاحقاً', type: 'info' });
        return;
      }

      try {
        await supabase.from('route_profiles').upsert(payload, { onConflict: 'user_id, slot_number' });
        addNotification({ message: 'تم حفظ القالب', type: 'success' });
      } catch (err) {
        logger.error('Profile save error:', err);
        await addToQueue({ type: 'profile_upsert', data: payload });
        addNotification({ message: 'حدث خطأ أثناء الحفظ على الخادم، سيتم المحاولة لاحقاً', type: 'warning' });
      }
  }

  async function deleteProfile(slotNumber) {
    if (!isSlotSaved(slotNumber)) return;
    const result = await confirm({ title: 'حذف القالب', text: 'هل تريد حذف هذا القالب محلياً ومن الخادم (إن وُجد)؟' });
    if (!result?.isConfirmed) return;

    try {
        profiles.value = profiles.value.filter(p => p.slot_number !== slotNumber);
        await safeSaveLocal(PROFILE_STORAGE_KEY.value, profiles.value);

        if (authStore.user && navigator.onLine) {
            await supabase.from('route_profiles').delete().eq('user_id', authStore.user.id).eq('slot_number', slotNumber);
        } else {
            await addToQueue({ type: 'profile_delete', data: { user_id: authStore.user?.id, slot_number: slotNumber } });
        }
        addNotification({ message: 'تم حذف القالب', type: 'success' });
    } catch (err) {
        logger.error('Error deleting profile:', err);
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
      addNotification({ message: 'تم تطبيق القالب', type: 'success' });
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

    routes.value = routes.value.filter(r => !routeIds.includes(r.id));
    await safeSaveLocal(STORAGE_KEY.value, routes.value);
    selectedIds.value = [];
    if (navigator.onLine) {
        const realIds = routeIds.filter(id => !String(id).startsWith('temp_'));
        if (realIds.length) await supabase.from('client_routes').update({ is_ignored: true }).in('id', realIds);
    } else { await addToQueue({ type: 'ignore', ids: routeIds }); }
    addNotification({ message: 'تم النقل للسلة', type: 'info' });
  }

  async function fetchIgnoredList() {
    if (!navigator.onLine) return;
    isLoading.value = true;
    try {
        const { data } = await supabase.from('client_routes').select('*').eq('user_id', authStore.user.id).eq('is_ignored', true);
        ignoredRoutes.value = data || [];
    } catch(e) { console.error(e); } finally { isLoading.value = false; }
  }

  async function restoreRoute(routeId) {
      if (!navigator.onLine) return;
      await supabase.from('client_routes').update({ is_ignored: false }).eq('id', routeId);
      ignoredRoutes.value = ignoredRoutes.value.filter(r => r.id !== routeId);
      await fetchRoutes(true);
      addNotification({ message: 'تمت الاستعادة', type: 'success' });
  }

  async function addRoute(routeData) {
    if (!routeData.shop_code || !authStore.user) return;
    const exists = routes.value.some(r => String(r.shop_code) === String(routeData.shop_code));
    if (exists) return; 
    const newRoute = { ...routeData, id: `temp_${Date.now()}`, user_id: authStore.user.id, sort_order: routes.value.length + 1, is_ignored: false };
    routes.value.push(newRoute);
    await safeSaveLocal(STORAGE_KEY.value, routes.value);
    if (navigator.onLine) {
      try {
        const { data } = await supabase.from('client_routes').upsert(newRoute, { onConflict: 'user_id, shop_code' }).select().single();
        if (data) {
              const idx = routes.value.findIndex(r => r.shop_code === newRoute.shop_code);
              if (idx !== -1) { routes.value[idx] = { ...data, current_balance: newRoute.current_balance }; await safeSaveLocal(STORAGE_KEY.value, routes.value); }
        }
      } catch (e) { await addToQueue({ type: 'add', data: newRoute }); }
    } else { await addToQueue({ type: 'add', data: newRoute }); }
  }

  async function reorderRoutes(newSortedRoutes) {
       const updates = newSortedRoutes.map((route, index) => ({ id: route.id, user_id: authStore.user.id, shop_code: route.shop_code, sort_order: index + 1 }));
       routes.value = newSortedRoutes.map((r, i) => ({ ...r, sort_order: i + 1, orderInput: i + 1 }));
       await safeSaveLocal(STORAGE_KEY.value, routes.value);
       if (navigator.onLine) await supabase.from('client_routes').upsert(updates, { onConflict: 'user_id, shop_code' });
       else await addToQueue({ type: 'batch_order', data: updates });
  }

  async function updateLocation(routeId, lat, lng) {
      const idx = routes.value.findIndex(r => r.id === routeId);
      if(idx !== -1) {
          const timestamp = new Date().toISOString();
          routes.value[idx].latitude = lat;
          routes.value[idx].longitude = lng;
          routes.value[idx].location_updated_at = timestamp;
          
          await safeSaveLocal(STORAGE_KEY.value, routes.value);
          
          const payload = { latitude: lat, longitude: lng, location_updated_at: timestamp };

          if(navigator.onLine && !String(routeId).startsWith('temp_')) {
            await supabase.from('client_routes').update(payload).eq('id', routeId);
          } else {
             await addToQueue({ type: 'update_loc', id: routeId, ...payload });
          }
          
          // Update editingRoute if it's the one being changed
          if(editingRoute.value && editingRoute.value.id === routeId) {
            editingRoute.value.latitude = lat;
            editingRoute.value.longitude = lng;
            editingRoute.value.location_updated_at = timestamp;
          }
      }
  }

  async function captureClientLocation(routeId) {
    if (!navigator.geolocation) {
        addNotification({ message: 'المتصفح لا يدعم تحديد الموقع', type: 'error' });
        return;
    }
    
    addNotification({ message: 'جاري تحديد الموقع، يرجى الانتظار...', type: 'info' });

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            await updateLocation(routeId, lat, lng);
            // After updating, also update the input field in the modal
            coordsInput.value = `${lat}, ${lng}`;
            addNotification({ message: 'تم حفظ الموقع بنجاح 📍', type: 'success' });
        },
        (error) => {
            let msg = 'فشل تحديد الموقع';
            if (error.code === 1) msg = 'يجب السماح بالوصول للموقع من إعدادات المتصفح';
            else if (error.code === 3) msg = 'انتهت مهلة الانتظار، حاول في مكان مفتوح';
            
            addNotification({ message: msg, type: 'error' });
            logger.error('GPS Error:', error);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }

  // --- Methods from ItineraryView ---

    const toggleSelectAll = (e) => {
        selectedIds.value = e.target.checked ? displayedRoutes.value.map(r => r.id) : [];
    };

    const confirmPermanentDelete = async () => {
        const result = await confirm({
            title: 'تأكيد الحذف النهائي',
            text: `أنت على وشك حذف ${selectedIds.value.length} عميل نهائياً. لا يمكن التراجع!`,
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'نعم، احذف نهائياً',
            confirmButtonColor: '#e74c3c',
            cancelButtonText: 'إلغاء'
        });

        if (result.isConfirmed) {
            await deleteRoutes(selectedIds.value);
        }
    };
    
    const isSlotSaved = (slot) => profiles.value && profiles.value.some(p => p.slot_number === slot);

    const openIgnoredModal = () => {
        showIgnoredModal.value = true;
        fetchIgnoredList();
    };

    const reorderRoutesByInput = () => {
        const orderInputs = routes.value.map(r => r.orderInput);
        const uniqueInputs = new Set(orderInputs);

        if (orderInputs.length !== uniqueInputs.size) {
            addNotification({ message: 'عذراً، يوجد أرقام مكررة في عمود الترتيب.', type: 'error' });
            return;
        }

        const newRoutes = [...routes.value].sort((a, b) => a.orderInput - b.orderInput);
        reorderRoutes(newRoutes);
        addNotification({ message: 'تم تحديث ترتيب خط السير بنجاح.', type: 'success' });
    };

    const onDragStart = (e, index) => { draggedIndex.value = index; e.dataTransfer.setData('index', index); };
    const onDragEnter = (e) => { if (e.preventDefault) e.preventDefault(); };
    const onDragEnd = () => { draggedIndex.value = null; };

    const onDrop = (e, dropIndex) => {
        const startIndex = e.dataTransfer.getData('index');
        if (startIndex === null || startIndex == dropIndex) return;
        const newRoutes = [...routes.value];
        const [item] = newRoutes.splice(startIndex, 1);
        newRoutes.splice(dropIndex, 0, item);

        newRoutes.forEach((route, index) => { route.orderInput = index + 1; });
        reorderRoutes(newRoutes);
    };

    const toggleSortByBalance = async () => {
        if (sortBalanceDir.value === null) sortBalanceDir.value = 'asc';
        else if (sortBalanceDir.value === 'asc') sortBalanceDir.value = 'desc';
        else sortBalanceDir.value = null;

        if (sortBalanceDir.value === null) {
            const restored = [...routes.value].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            await reorderRoutes(restored);
            addNotification({ message: 'تمت إعادة الترتيب الافتراضي', type: 'info' });
            return;
        }

        const sorted = [...routes.value].sort((a, b) => {
            const va = parseFloat(a.current_balance) || 0;
            const vb = parseFloat(b.current_balance) || 0;
            return sortBalanceDir.value === 'asc' ? va - vb : vb - va;
        });

        await reorderRoutes(sorted);
        addNotification({ message: `تم الترتيب حسب الرصيد (${sortBalanceDir.value === 'asc' ? 'تصاعدي' : 'تنازلي'})`, type: 'success' });
    };

    const getBalanceClass = (val) => {
        const n = Number(val) || 0;
        if (n < 500) return 'balance-low';
        if (n >= 500 && n < 1000) return 'balance-medium';
        return 'balance-high';
    };

    const goToLocation = (route) => {
        activeTab.value = 'map';
        setTimeout(() => {
            center.value = [route.latitude, route.longitude];
            zoom.value = 16;
            // Invalidate map size for leaflet
            window.dispatchEvent(new Event('resize'));
        }, 100);
    };

    const openLocationModal = (route) => {
        editingRoute.value = route;
        coordsInput.value = route.latitude ? `${route.latitude}, ${route.longitude}` : '';
        showModal.value = true;
    };
    
    const closeModal = () => { showModal.value = false; };

    const copyCoords = async () => {
        const text = coordsInput.value || (editingRoute.value?.latitude ? `${editingRoute.value.latitude}, ${editingRoute.value.longitude}` : '');
        if (!text) { addNotification({ message: 'لا توجد إحداثيات للنسخ', type: 'warning' }); return; }
        try {
            await navigator.clipboard.writeText(text);
            addNotification({ message: 'تم نسخ الإحداثيات', type: 'success' });
        } catch (err) {
            addNotification({ message: 'فشل النسخ', type: 'error' });
        }
    };

    const useGPS = async () => {
        if (!editingRoute.value?.id) { addNotification({ message: 'خطأ: لا يوجد مسار محدد', type: 'error' }); return; }
        await captureClientLocation(editingRoute.value.id);
    };

    const clearCoords = () => { coordsInput.value = ''; };

    const saveLocation = async () => {
        const [lat, lng] = coordsInput.value.split(',').map(n => parseFloat(n.trim()));
        if (!isNaN(lat) && !isNaN(lng) && editingRoute.value?.id) {
            await updateLocation(editingRoute.value.id, lat, lng);
            closeModal();
        } else {
            addNotification({ message: 'صيغة غير صحيحة', type: 'warning' });
        }
    };


  async function refreshIdsKeepingBalances() {
      const { data } = await supabase.from('client_routes').select('id, shop_code').eq('user_id', authStore.user.id);
      if(data) {
          const idMap = new Map(data.map(i => [i.shop_code, i.id]));
          routes.value.forEach(r => { if(idMap.has(r.shop_code)) r.id = idMap.get(r.shop_code); });
          await safeSaveLocal(STORAGE_KEY.value, routes.value);
      }
  }
  async function addToQueue(a) { 
    pendingQueue.value.push(a); 
    await safeSaveLocal(QUEUE_KEY.value, pendingQueue.value); 
  }
  async function processQueue() {
      if (!pendingQueue.value.length) return;
      const rem = [];
      for (const item of pendingQueue.value) {
          try {
              if (item.type === 'batch_add') {
                const { error } = await supabase.from('client_routes').upsert(item.data, { onConflict: 'user_id, shop_code' });
                if (error) throw error;
                await refreshIdsKeepingBalances();
              } else if (item.type === 'batch_order') {
                await supabase.from('client_routes').upsert(item.data, { onConflict: 'user_id, shop_code' });
              } else if (item.type === 'add') {
                await supabase.from('client_routes').insert(item.data);
              } else if (item.type === 'ignore') {
                await supabase.from('client_routes').update({ is_ignored: true }).in('id', item.ids);
              } else if (item.type === 'delete') {
                await supabase.from('client_routes').delete().in('id', item.ids);
              } else if (item.type === 'update_loc') {
                if(!String(item.id).startsWith('temp_')) {
                  await supabase.from('client_routes').update({ latitude: item.lat, longitude: item.lng }).eq('id', item.id);
                }
              } else if (item.type === 'profile_upsert') {
                await supabase.from('route_profiles').upsert(item.data, { onConflict: 'user_id, slot_number' });
              } else if (item.type === 'profile_delete') {
                if(item.data && item.data.user_id) {
                  await supabase.from('route_profiles').delete().eq('user_id', item.data.user_id).eq('slot_number', item.data.slot_number);
                }
              }
          } catch(e) { rem.push(item); }
      }
      pendingQueue.value = rem; 
      await safeSaveLocal(QUEUE_KEY.value, rem);
  }
  function initNetworkListener() { window.addEventListener('online', () => { processQueue(); fetchRoutes(true); }); }

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
  };
});