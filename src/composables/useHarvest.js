import { ref, computed, onMounted, onActivated, watch, inject, onBeforeUnmount, onDeactivated, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useHarvestStore } from '@/stores/harvest';
import { useArchiveStore } from '@/stores/archiveStore';
import { useItineraryStore } from '@/stores/itineraryStore';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useColumnVisibility } from '@/composables/useColumnVisibility.js';
import { formatInputNumber, getNetClass, getNetIcon } from '@/utils/formatters.js';
import { exportAndShareTable } from '@/utils/exportUtils.js';
import { handleMoneyInput } from '@/utils/validators.js';
import logger from '@/utils/logger.js';

export function useHarvest(props) {
  // --- Definitions ---
  const store = useHarvestStore();
  const archiveStore = useArchiveStore();
  const itineraryStore = useItineraryStore();
  const collabStore = useCollaborationStore();
  const route = useRoute();
  const { confirm, addNotification } = inject('notifications');

  // --- Columns ---
  const harvestColumns = [
    { key: 'shop', label: '🏪 المحل' },
    { key: 'code', label: '🔢 الكود' },
    { key: 'amount', label: '💵 مبلغ التحويل' },
    { key: 'extra', label: '📌 اخرى' }
  ];
  const { showSettings, isVisible, apply, load: loadColumns } = useColumnVisibility(harvestColumns, 'columns.visibility.harvest');

  // --- State ---
  const searchQueryLocal = ref('');
  const showCustomTooltip = ref(false);
  const customTooltipText = ref('');
  const tooltipTargetElement = ref(null);
  const customTooltipRef = ref(null);
  const currentDate = ref(new Date().toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric' }));
  const currentDay = ref(new Date().toLocaleDateString("ar-EG", { weekday: 'long' }));
  const showProfileDropdown = ref(false);
  const isArchiving = ref(false);

  // Modal Missing Centers State
  const isMissingModalOpen = ref(false);
  const missingCenters = ref([]);

  // Overdue Modal State
  const isOverdueModalOpen = ref(false);
  const overdueStores = ref([]);
  const selectedOverdueStores = ref([]);

  // --- Computed ---
  const isReadOnly = computed(() => {
    if (!props.isSharedView && !collabStore.activeSessionId) return false;
    if (props.isSharedView) return true; // Public share is always read-only
    const collabSession = collabStore.collaborators.find(c => c.userId === collabStore.activeSessionId);
    return collabSession && collabSession.role === 'viewer';
  });

  const allOverdueSelected = computed({
    get: () => overdueStores.value.length > 0 && selectedOverdueStores.value.length === overdueStores.value.length,
    set: (value) => {
      selectedOverdueStores.value = value ? [...overdueStores.value] : [];
    }
  });

  const localFilteredRows = computed(() => {
    const data = store.rows || [];
    const query = searchQueryLocal.value?.toLowerCase().trim();
    if (!query) return data;
    return data.filter(row =>
      (row.shop && row.shop.toLowerCase().includes(query)) ||
      (row.code && row.code.toString().toLowerCase().includes(query))
    );
  });

  const savedItineraryProfiles = computed(() => {
    return itineraryStore.profiles.filter(p => p.shops_order && p.shops_order.length > 0);
  });

  const filteredTotals = computed(() => {
    return localFilteredRows.value.reduce((acc, row) => {
      acc.amount += parseFloat(row.amount) || 0;
      acc.extra += parseFloat(row.extra) || 0;
      acc.collector += parseFloat(row.collector) || 0;
      return acc;
    }, { amount: 0, extra: 0, collector: 0 });
  });

  const calculateNet = (row) => {
    const collector = parseFloat(row.collector) || 0;
    const amount = parseFloat(row.amount) || 0;
    const extra = parseFloat(row.extra) || 0;
    return collector - (amount + extra);
  };

  const filteredTotalNetValue = computed(() => {
    const totals = filteredTotals.value;
    return totals.collector - (totals.amount + totals.extra);
  });

  const getRowNetStatus = (row) => getNetClass(calculateNet(row));
  const getRowNetIcon = (row) => getNetIcon(calculateNet(row));
  const getFilteredTotalNetClass = computed(() => getNetClass(filteredTotalNetValue.value));
  const getFilteredTotalNetIcon = computed(() => getNetIcon(filteredTotalNetValue.value));

  // --- Logic Methods ---
  const exitSession = () => {
    collabStore.setActiveSession(null, null);
    store.switchToUserSession(null);
    addNotification('تمت العودة إلى تحصيلاتك الخاصة', 'success');
  };

  const showOverdueModal = async () => {
    overdueStores.value = await store.fetchOverdueStores();
    selectedOverdueStores.value = [];
    isOverdueModalOpen.value = true;
  };

  const applyOverdue = async () => {
    if (selectedOverdueStores.value.length === 0) {
      addNotification('لم يتم تحديد أي متاجر', 'warning');
      return;
    }
    await store.applyOverdueStores(selectedOverdueStores.value);
    isOverdueModalOpen.value = false;
    addNotification('تمت إضافة المديونيات بنجاح!', 'success');
  };

  const showMissingCenters = () => {
    const currentCodes = new Set(store.rows.map(r => String(r.code).trim()));
    missingCenters.value = itineraryStore.routes.filter(route => {
      return !currentCodes.has(String(route.shop_code).trim());
    });
    isMissingModalOpen.value = true;
  };

  const toggleProfileDropdown = () => {
    if (savedItineraryProfiles.value.length === 0) {
      addNotification('لا توجد قوالب خط سير محفوظة للعرض.', 'warning');
      return;
    }
    showProfileDropdown.value = !showProfileDropdown.value;
  };

  const applyItineraryProfile = (profile) => {
    store.sortRowsByItineraryProfile(profile.shops_order);
    showProfileDropdown.value = false;
    addNotification(`تم الترتيب حسب قالب "${profile.profile_name}"`, 'success');
  };

  const showTooltip = (element, text) => {
    if (!element || !text) return;
    if (showCustomTooltip.value && tooltipTargetElement.value === element) {
      hideTooltip();
      return;
    }
    customTooltipText.value = text;
    tooltipTargetElement.value = element;
    showCustomTooltip.value = true;
    nextTick(() => {
      if (customTooltipRef.value) {
        const rect = element.getBoundingClientRect();
        const tooltip = customTooltipRef.value;
        tooltip.style.top = `${rect.top - 8}px`;
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.transform = 'translate(-50%, -100%)';
      }
    });
  };
  const hideTooltip = () => { showCustomTooltip.value = false; };

  const handleSearchInput = (e) => { searchQueryLocal.value = e.target.value; };
  const clearSearch = () => { searchQueryLocal.value = ''; };

  const syncWithCounterStore = () => {
    try {
      const totalCollected = store.totals?.collector || 0;
      localStorage.setItem('totalCollected', totalCollected.toString());
      window.dispatchEvent(new CustomEvent('harvestDataUpdated', { detail: { totalCollected } }));
    } catch (error) {
      logger.error('Sync error:', error);
    }
  };

  const checkAndAddEmptyRow = (index) => {
    if (searchQueryLocal.value) return;
    if (index === store.rows.length - 1) store.addRow();
  };

  const updateField = (row, index, field, value, syncCounter = false) => {
    row[field] = value;
    store.saveRowsToStorage();
    checkAndAddEmptyRow(index);
    if (syncCounter) syncWithCounterStore();
  };

  const updateShop = (row, index, e) => { updateField(row, index, 'shop', e.target.value); hideTooltip(); };
  const updateCode = (row, index, e) => updateField(row, index, 'code', e.target.value);
  const updateAmount = (row, index, e) => handleMoneyInput(e, (val) => updateField(row, index, 'amount', val ? parseFloat(val) : null), { fieldName: 'مبلغ التحويل', maxLimit: 9999 });
  const updateExtra = (row, index, e) => handleMoneyInput(e, (val) => {
    if (val === '-') row.extra = '-';
    else updateField(row, index, 'extra', (val !== '' && val !== null && !isNaN(parseFloat(val))) ? parseFloat(val) : null);
  }, { allowNegative: true, fieldName: 'المبلغ الإضافي', maxLimit: 9999 });

  const updateCollector = async (row, index, e) => {
    const amountVal = parseFloat(row.amount) || 0;
    const collectorMaxLimit = amountVal + 2999;

    handleMoneyInput(e, (val) => {
      updateField(row, index, 'collector', val ? parseFloat(val) : null, true);
      if (val && row.code) {
        const existingRoute = itineraryStore.routes.find(r => String(r.shop_code) === String(row.code));
        const handlePositionSuccess = (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (existingRoute) {
            if (itineraryStore.updateLocation) {
              itineraryStore.updateLocation(existingRoute.id, lat, lng);
            }
          } else {
            itineraryStore.addRoute({
              shop_code: row.code.toString(),
              shop_name: row.shop,
              latitude: lat,
              longitude: lng
            });
          }
        };
        const handlePositionError = (err) => {
          console.warn("GPS failed:", err.message);
          if (!existingRoute) {
            itineraryStore.addRoute({
              shop_code: row.code.toString(),
              shop_name: row.shop,
              latitude: null, longitude: null
            });
          }
        };
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            handlePositionSuccess,
            (err) => {
              console.warn("High Accuracy GPS failed, trying Low Accuracy...");
              navigator.geolocation.getCurrentPosition(
                handlePositionSuccess,
                handlePositionError,
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
              );
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
          );
        } else {
          handlePositionError({ message: "Geolocation not supported" });
        }
      }
    }, { fieldName: 'مبلغ المحصل', maxLimit: collectorMaxLimit });
    hideTooltip();
  };

  const updateSummaryField = (e, storeKey, fieldLabel) => {
    const maxLimit = 499999;
    handleMoneyInput(e, (val) => {
      const numVal = parseFloat(val) || 0;
      if (storeKey === 'masterLimit') store.setMasterLimit(numVal);
      else if (storeKey === 'extraLimit') store.setExtraLimit(numVal);
      else if (storeKey === 'currentBalance') store.setCurrentBalance(numVal);
    }, { fieldName: fieldLabel, maxLimit: storeKey !== 'currentBalance' ? maxLimit : undefined });
  };

  const toggleSign = (row, field) => {
    const currentVal = row[field];
    if (!currentVal || currentVal === '') row[field] = '-';
    else if (currentVal === '-') row[field] = null;
    else row[field] = parseFloat(String(currentVal).replace(/,/g, '')) * -1;
    store.saveRowsToStorage();
    if (field === 'collector') syncWithCounterStore();
  };

  const confirmClearAll = async () => {
    if ((await confirm({ title: 'مسح الكل', text: 'تأكيد؟' })).isConfirmed) {
      store.clearAll();
      searchQueryLocal.value = '';
      addNotification('تم المسح', 'info');
    }
  };

  const archiveToday = async () => {
    isArchiving.value = true;
    try {
      // Load local dates quickly to check for existence without blocking UI
      await archiveStore.loadAvailableDates(false);
      
      // Fetch date once from the store
      const dateToSave = await store.getAccurateDate();
      const exists = archiveStore.dateExists(dateToSave);
      
      let confirmationMessage = {
        title: 'تأكيد الأرشفة',
        text: 'هل أنت متأكد أنك تريد أرشفة بيانات اليوم؟',
        confirmButtonText: 'نعم، أرشفة'
      };

      if (exists) {
        confirmationMessage = {
          title: 'تنبيه: الأرشيف موجود',
          text: `يوجد أرشيف محفوظ بالفعل بتاريخ "${dateToSave}". هل تريد استبداله بالبيانات الحالية؟`,
          confirmButtonText: 'نعم، استبدال',
          icon: 'warning'
        };
      }
      
      const { isConfirmed } = await confirm(confirmationMessage);
      
      if (!isConfirmed) {
        addNotification('تم إلغاء الأرشفة.', 'info');
        return;
      }
      
      // Pass the fetched date to the store action
      const res = await store.archiveTodayData(dateToSave);
      
      if (res.success) {
        addNotification(res.message, 'success');
        store.clearAll();
        searchQueryLocal.value = '';
      } else {
        addNotification(res.message, 'error');
      }
    } catch (error) {
      logger.error('Unhandled error during archive process:', error);
      addNotification('حدث خطأ غير متوقع أثناء محاولة الأرشفة.', 'error');
    } finally {
      isArchiving.value = false;
    }
  };

  const handleExport = async () => {
    const fileName = searchQueryLocal.value ? `تحصيلات_بحث_${searchQueryLocal.value}` : `تحصيلات_${currentDate.value.replace(/\//g, '-')}`;
    const result = await exportAndShareTable('harvest-table-container', fileName);
    if (result.success) addNotification(result.message, 'success');
    else addNotification(result.message, 'error');
  };

  const handleSummaryExport = async () => {
    const fileName = `ملخص_بيان_${currentDate.value.replace(/\//g, '-')}`;
    const result = await exportAndShareTable('summary', fileName, { backgroundColor: 'var(--surface-bg)' });
    if (result.success) addNotification(result.message, 'success');
    else addNotification(result.message, 'error');
  };

  const handleOutsideClick = (e) => {
    const target = e.target;
    // This logic is a bit brittle. A better way would be to check if the click was inside the dropdown.
    // For now, this is what was in the original component.
    const isTooltipTrigger = target.matches('input[id^="shop-"], input[id^="extra-"], input[id^="collector-"]') || target.classList.contains('readonly-field');
    if (!isTooltipTrigger) hideTooltip();
  };

  // Lifecycle
  onMounted(() => {
    store.initialize?.();
    loadColumns();
    store.loadDataFromStorage();
    syncWithCounterStore();
    searchQueryLocal.value = store.searchQuery || '';
    itineraryStore.fetchProfiles();
    itineraryStore.fetchRoutes();
    window.addEventListener('focus', syncWithCounterStore);
    document.addEventListener('click', handleOutsideClick);
  });

  onActivated(() => {
    store.initialize?.();
    searchQueryLocal.value = store.searchQuery || '';
    itineraryStore.fetchProfiles();
  });

  onBeforeUnmount(() => {
    store.searchQuery = searchQueryLocal.value;
    window.removeEventListener('focus', syncWithCounterStore);
    document.removeEventListener('click', handleOutsideClick);
  });

  onDeactivated(() => {
    store.searchQuery = searchQueryLocal.value;
  });

  watch(() => route.name, (newName) => {
    if (newName === 'Harvest') store.initialize?.();
  });

  return {
    // Props
    isSharedView: props.isSharedView,
    // Stores
    store,
    collabStore,
    // Column Visibility
    showSettings,
    isVisible,
    apply,
    harvestColumns,
    // State
    searchQueryLocal,
    showCustomTooltip,
    customTooltipText,
    customTooltipRef,
    currentDay,
    currentDate,
    showProfileDropdown,
    isArchiving,
    isMissingModalOpen,
    missingCenters,
    isOverdueModalOpen,
    overdueStores,
    selectedOverdueStores,
    // Computed
    isReadOnly,
    allOverdueSelected,
    localFilteredRows,
    savedItineraryProfiles,
    filteredTotals,
    filteredTotalNetValue,
    getFilteredTotalNetClass,
    getFilteredTotalNetIcon,
    // Methods
    calculateNet,
    getRowNetStatus,
    getRowNetIcon,
    exitSession,
    showMissingCenters,
    showOverdueModal,
    applyOverdue,
    toggleProfileDropdown,
    applyItineraryProfile,
    handleSearchInput,
    clearSearch,
    updateShop,
    updateCode,
    updateAmount,
    updateExtra,
    updateCollector,
    updateSummaryField,
    toggleSign,
    confirmClearAll,
    archiveToday,
    handleExport,
    handleSummaryExport,
    showTooltip,
    formatInputNumber,
  };
}
