import { ref, computed, onMounted, onActivated, watch, inject, onBeforeUnmount, nextTick } from 'vue';
import { useHarvestStore } from '@/stores/harvest';
import { useArchiveStore } from '@/stores/archiveStore';
import { useItineraryStore } from '@/stores/itineraryStore';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useColumnVisibility } from '@/composables/useColumnVisibility.js';
import { formatInputNumber, getNetClass, getNetIcon } from '@/utils/formatters.js';
import { exportAndShareTable } from '@/utils/exportUtils.js';
import { handleMoneyInput } from '@/utils/validators.js';
import api from '@/services/api';
import logger from '@/utils/logger.js';
import localforage from 'localforage';

export function useHarvest(props) {
  // --- Stores & Injections ---
  const store = useHarvestStore();
  const archiveStore = useArchiveStore();
  const itineraryStore = useItineraryStore();
  const collabStore = useCollaborationStore();
  const { confirm, addNotification } = inject('notifications');

  // --- Column Visibility ---
  const harvestColumns = [
    { key: 'shop', label: '🏪 المحل' },
    { key: 'code', label: '🔢 الكود' },
    { key: 'amount', label: '💵 مبلغ التحويل' },
    { key: 'extra', label: '📌 اخرى' }
  ];
  const { showSettings, isVisible, apply, load: loadColumns } = useColumnVisibility(harvestColumns, 'columns.visibility.harvest');

  // --- Local State ---
  const searchQueryLocal = ref('');
  const showCustomTooltip = ref(false);
  const customTooltipText = ref('');
  const tooltipTargetElement = ref(null);
  const customTooltipRef = ref(null);
  const currentDate = ref(new Date().toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric' }));
  const currentDay = ref(new Date().toLocaleDateString("ar-EG", { weekday: 'long' }));
  const showProfileDropdown = ref(false);
  const isArchiving = ref(false);
  const isMissingModalOpen = ref(false);
  const missingCenters = ref([]);
  const isOverdueModalOpen = ref(false);
  const overdueStores = ref([]);
  const selectedOverdueStores = ref([]);
  const overdueDate = ref(null); // ← إضافة

  // --- Loading State Management ---
  const isLoadingDismissed = ref(false);
  const showDismissLoading = ref(false);
  let loadingTimer = null;

  // --- Extra Details Modal State ---
  const isExtraDetailsModalOpen = ref(false);
  const activeExtraRowIndex = ref(null);
  const activeExtraRowData = ref(null);

  // --- Context-Aware Computed Properties (The Bridge) ---

  const isLoading = computed(() => {
    if (isLoadingDismissed.value) return false;

    let loading = false;
    if (props.isSharedView) {
      if (collabStore.isRemoteArchiveMode) loading = collabStore.isLoading;
      else loading = (store.isSharedLoading && (!store.sharedRows || store.sharedRows.length === 0));
    } else {
      loading = store.isLoading;
    }
    return loading;
  });

  // Watch loading state to handle timeout
  watch(isLoading, (newVal) => {
    if (newVal) {
      // Start timer
      if (loadingTimer) clearTimeout(loadingTimer);
      loadingTimer = setTimeout(() => {
        if (isLoading.value) showDismissLoading.value = true;
      }, 5000); // Show dismiss button after 5 seconds
    } else {
      // Reset
      if (loadingTimer) clearTimeout(loadingTimer);
      showDismissLoading.value = false;
      isLoadingDismissed.value = false;
    }
  });

  const forceDismissLoading = () => {
    isLoadingDismissed.value = true;
    showDismissLoading.value = false;
    addNotification('تم إخفاء شاشة التحميل يدوياً', 'warning');
  };

  const isReadOnly = computed(() => {
    if (props.isSharedView) {
      // 0. Remote Archive mode is always read-only
      if (collabStore.isRemoteArchiveMode) return true;

      // 1. Admin always has write access
      if (collabStore.sessionType === 'admin') return false;

      // 2. Local collaborator check
      const collabSession = collabStore.collaborators.find(c => c.userId === collabStore.activeSessionId);

      // If we are in "collab" mode but no record found (unlikely but safe), treat as viewer
      if (!collabSession) return true;

      return collabSession.role === 'viewer';
    }
    return false; // Local view is never read-only
  });

  const displayRows = computed({
    get() {
      if (props.isSharedView && collabStore.isRemoteArchiveMode) {
        return collabStore.remoteArchiveRows;
      }
      return props.isSharedView ? store.sharedRows : store.rows;
    },
    set(value) {
      if (props.isSharedView) {
        if (!collabStore.isRemoteArchiveMode) {
          store.sharedRows = value;
        }
      } else {
        store.rows = value;
      }
    }
  });

  const displayTotals = computed(() => {
    if (props.isSharedView && collabStore.isRemoteArchiveMode) {
      return collabStore.remoteArchiveRows.reduce((acc, row) => {
        acc.amount += parseFloat(row.amount) || 0;
        acc.extra += parseFloat(row.extra) || 0;
        acc.collector += parseFloat(row.collector) || 0;
        return acc;
      }, { amount: 0, extra: 0, collector: 0 });
    }
    return props.isSharedView ? store.sharedTotals : store.totals;
  });

  const displayMasterLimit = computed({
    get: () => {
      if (props.isSharedView && collabStore.isRemoteArchiveMode) return 0;
      return props.isSharedView ? store.sharedMasterLimit : store.masterLimit;
    },
    set: (val) => {
      if (props.isSharedView) {
        if (!collabStore.isRemoteArchiveMode) store.sharedMasterLimit = val;
      }
      else store.setMasterLimit(val)
    }
  });

  const displayExtraLimit = computed({
    get: () => {
      if (props.isSharedView && collabStore.isRemoteArchiveMode) return 0;
      return props.isSharedView ? store.sharedExtraLimit : store.extraLimit;
    },
    set: (val) => {
      if (props.isSharedView) {
        if (!collabStore.isRemoteArchiveMode) store.sharedExtraLimit = val;
      }
      else store.setExtraLimit(val)
    }
  });

  const displayCurrentBalance = computed({
    get: () => {
      if (props.isSharedView && collabStore.isRemoteArchiveMode) return 0;
      return props.isSharedView ? store.sharedCurrentBalance : store.currentBalance;
    },
    set: (val) => {
      if (props.isSharedView) {
        if (!collabStore.isRemoteArchiveMode) store.sharedCurrentBalance = val;
      }
      else store.setCurrentBalance(val)
    }
  });

  const displayFilteredRows = computed(() => {
    const data = displayRows.value || [];
    const query = searchQueryLocal.value?.toLowerCase().trim();
    if (!query) return data;
    return data.filter(row =>
      (row.shop && row.shop.toLowerCase().includes(query)) ||
      (row.code && row.code.toString().toLowerCase().includes(query))
    );
  });

  const filteredTotals = computed(() => {
    return displayFilteredRows.value.reduce((acc, row) => {
      acc.amount += parseFloat(row.amount) || 0;
      acc.extra += parseFloat(row.extra) || 0;
      acc.collector += parseFloat(row.collector) || 0;
      return acc;
    }, { amount: 0, extra: 0, collector: 0 });
  });

  const savedItineraryProfiles = computed(() =>
    itineraryStore.profiles.filter(p => p.shops_order && p.shops_order.length > 0)
  );

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
  const allOverdueSelected = computed({
    get: () => overdueStores.value.length > 0 && selectedOverdueStores.value.length === overdueStores.value.length,
    set: (value) => { selectedOverdueStores.value = value ? [...overdueStores.value] : []; }
  });

  const displayResetStatus = computed(() => {
    // Hidden in archive mode as we don't have enough data
    if (props.isSharedView && collabStore.isRemoteArchiveMode) return { val: 0, text: 'بيانات مؤرشفة', color: '#94a3b8' };

    const totalCollected = displayTotals.value.collector || 0;
    const resetVal = (displayCurrentBalance.value || 0) - ((displayMasterLimit.value || 0) + (displayExtraLimit.value || 0));
    const combinedValue = totalCollected + resetVal;

    if (combinedValue === 0) return { val: combinedValue, text: 'تم التحصيل بنجاح ✅', color: '#10b981' };
    if (combinedValue < 0) return { val: combinedValue, text: 'عجز 🔴', color: '#ef4444' };
    return { val: combinedValue, text: 'زيادة 🔵', color: '#3b82f6' };
  });

  const displayResetAmount = computed(() => {
    if (props.isSharedView && collabStore.isRemoteArchiveMode) return 0;
    return (displayCurrentBalance.value || 0) - ((displayMasterLimit.value || 0) + (displayExtraLimit.value || 0));
  });


  // --- Methods ---

  let saveDebounceTimer = null;
  const saveData = (immediate = false) => {
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);

    const performSave = () => {
      if (props.isSharedView) {
        if (collabStore.isRemoteArchiveMode) return;
        if (collabStore.activeSessionId) {
          store.updateSharedData(collabStore.activeSessionId);
        }
      } else {
        store.saveRowsToStorage();
      }
    };

    if (immediate) {
      performSave();
    } else {
      saveDebounceTimer = setTimeout(performSave, 1000); // 1-second debounce
    }
  };

  const exitSession = () => {
    collabStore.setActiveSession(null, null);
    store.switchToUserSession(null); // Clears shared data
    addNotification('تمت العودة إلى تحصيلاتك الخاصة', 'success');
  };

  const showOverdueModal = async () => {
    overdueStores.value = await store.fetchOverdueStores();

    // ← الحصول على التاريخ من metadata
    const metadata = await localforage.getItem('overdue_stores_metadata');
    overdueDate.value = metadata?.archive_date || null;

    selectedOverdueStores.value = [];
    isOverdueModalOpen.value = true;
  };

  const applyOverdue = async () => {
    if (selectedOverdueStores.value.length === 0) return addNotification('لم يتم تحديد أي متاجر', 'warning');

    // Check for duplicates where overdue was ALREADY applied
    const appliedOverdueCodes = new Set(
      store.rows
        .filter(r => r.isOverdueApplied && r.code)
        .map(r => String(r.code).trim())
    );
    const duplicates = selectedOverdueStores.value.filter(s => appliedOverdueCodes.has(String(s.code).trim()));

    if (duplicates.length > 0) {
      const { isConfirmed } = await confirm({
        title: 'تنبيه: محلات مكررة',
        text: `هناك ${duplicates.length} محل/محلات مضافة بالفعل في القائمة. هل تريد إضافة المبالغ مرة أخرى؟`,
        icon: 'warning',
        confirmButtonText: 'نعم، أضف المكرر',
        cancelButtonText: 'إلغاء',
        showCancelButton: true
      });

      if (!isConfirmed) return;
    }

    const { addedCount, duplicatesCount } = await store.applyOverdueStores(selectedOverdueStores.value);
    isOverdueModalOpen.value = false;

    if (duplicatesCount > 0) {
      addNotification(`تمت إضافة ${addedCount} عنصر (بما في ذلك الحالات المكررة)`, 'success');
    } else {
      addNotification('تمت إضافة المديونيات بنجاح!', 'success');
    }
  };

  const deleteSelectedOverdue = async () => {
    if (selectedOverdueStores.value.length === 0) return addNotification('لم يتم تحديد أي عناصر للحذف', 'warning');
    const { isConfirmed } = await confirm({
      title: 'حذف المديونيات المحددة',
      text: `هل تريد حذف ${selectedOverdueStores.value.length} عنصر/عناصر من المديونيات المتأخرة نهائياً؟ لا يمكن التراجع.`,
      icon: 'warning',
      confirmButtonText: 'نعم، احذف',
      confirmButtonColor: '#e74c3c'
    });

    if (!isConfirmed) return;

    try {
      const codes = selectedOverdueStores.value.map(s => String(s.code));
      await store.deleteOverdueStores(codes);
      // refresh list in modal
      overdueStores.value = await store.fetchOverdueStores();
      selectedOverdueStores.value = [];
      addNotification('تم حذف العناصر المحددة من المتأخرات', 'success');
    } catch (err) {
      logger.error('Failed to delete selected overdue items', err);
      addNotification('فشل حذف بعض العناصر', 'error');
    }
  };

  const restoreLatestOverdue = async () => {
    const { isConfirmed } = await confirm({
      title: 'استعادة المتأخرات من الأرشيف',
      text: 'سيتم حذف جميع المتأخرات الحالية واستعادة آخر متأخرات من الأرشيف. هل تريد المتابعة؟',
      icon: 'warning',
      confirmButtonText: 'نعم، استعادة',
      confirmButtonColor: '#10b981',
      showCancelButton: true
    });

    if (!isConfirmed) return;

    try {
      const result = await store.restoreLatestOverdueFromArchive();

      if (result.success) {
        // تحديث القائمة في النافذة
        overdueStores.value = result.items;
        overdueDate.value = result.archiveDate;
        selectedOverdueStores.value = [];
        addNotification(result.message, 'success');
      } else {
        addNotification(result.message, 'error');
      }
    } catch (err) {
      logger.error('Failed to restore overdue from archive', err);
      addNotification('حدث خطأ أثناء استعادة المتأخرات', 'error');
    }
  };

  const showMissingCenters = () => {
    const currentCodes = new Set(displayRows.value.map(r => String(r.code).trim()));
    missingCenters.value = itineraryStore.routes.filter(route => !currentCodes.has(String(route.shop_code).trim()));
    isMissingModalOpen.value = true;
  };

  const toggleProfileDropdown = () => {
    if (savedItineraryProfiles.value.length === 0) return addNotification('لا توجد قوالب خط سير محفوظة للعرض.', 'warning');
    showProfileDropdown.value = !showProfileDropdown.value;
  };

  const applyItineraryProfile = (profile) => {
    store.sortRowsByItineraryProfile(profile.shops_order); // This only sorts local `rows`
    showProfileDropdown.value = false;
    addNotification(`تم الترتيب حسب قالب "${profile.profile_name}"`, 'success');
  };

  const handleSearchInput = (e) => { searchQueryLocal.value = e.target.value; };
  const clearSearch = () => { searchQueryLocal.value = ''; };

  const syncWithCounterStore = () => {
    try {
      const totalCollected = displayTotals.value?.collector || 0;
      localStorage.setItem('totalCollected', totalCollected.toString());
      window.dispatchEvent(new CustomEvent('harvestDataUpdated', { detail: { totalCollected } }));
    } catch (error) {
      logger.error('Sync error:', error);
    }
  };

  const checkAndAddEmptyRow = (index) => {
    if (searchQueryLocal.value || props.isSharedView) return;
    if (index === displayRows.value.length - 1) store.addRow();
  };

  const updateField = (row, index, field, value, syncCounter = false) => {
    row[field] = value;
    saveData(false); // Use debounced save
    if (!props.isSharedView) checkAndAddEmptyRow(index);
    if (syncCounter) syncWithCounterStore();
  };

  const updateShop = (row, index, e) => { updateField(row, index, 'shop', e.target.value); hideTooltip(); };
  const findRouteByCode = (code) => {
    if (!code) return null;
    const codeStr = String(code).trim();
    return itineraryStore.routes.find(r => String(r.shop_code).trim() === codeStr) || null;
  };

  const updateCode = (row, index, e) => {
    const newCode = e.target.value;
    updateField(row, index, 'code', newCode);

    // Attempt to auto-fill shop name from itinerary routes when a code is entered
    try {
      const route = findRouteByCode(newCode);
      if (route && route.shop_name) {
        // Only overwrite empty shop or if the user didn't manually type a different shop
        if (!row.shop || row.shop.trim() === '') {
          row.shop = route.shop_name;
        }
      }
    } catch (err) {
      // Non-fatal: log and continue
      logger.error('Auto-fill from itinerary failed:', err);
    }
  };
  const updateAmount = (row, index, e) => handleMoneyInput(e, (val) => updateField(row, index, 'amount', val ? parseFloat(val) : null), { fieldName: 'مبلغ التحويل', maxLimit: 9999 });
  const updateExtra = (row, index, e) => handleMoneyInput(e, (val) => {
    if (val === '-') {
      row.extra = '-';
    } else {
      const newValue = (val !== '' && val !== null && !isNaN(parseFloat(val))) ? parseFloat(val) : null;
      // Clear details if the main value is cleared
      if (newValue === null) {
        row.extraDetails = [];
      }
      row.isOverdueApplied = false; // Allow re-application of overdue if manually edited
      updateField(row, index, 'extra', newValue);
    }
  }, { allowNegative: true, fieldName: 'المبلغ الإضافي', maxLimit: 9999 });

  // Debounce storage for location captures
  const locationCaptureDebounce = {};

  const updateCollector = (row, index, e) => {
    const prevCollector = parseFloat(row.collector) || 0;
    const amountVal = parseFloat(row.amount) || 0;
    const extraVal = parseFloat(row.extra) || 0;
    const collectorMaxLimit = amountVal + extraVal + 2999;

    handleMoneyInput(e, async (val) => {
      const newCollector = val ? parseFloat(val) : null;
      updateField(row, index, 'collector', newCollector, true);

      // Trigger Location Capture on ANY valid input
      // Use debounce to avoid spamming while typing
      if (newCollector && newCollector !== prevCollector) {
        const code = row.code;
        if (code) {
          const route = findRouteByCode(code);
          // Only capture if we have a valid route to attach to
          if (route && route.id) {
            const key = route.id;
            if (locationCaptureDebounce[key]) clearTimeout(locationCaptureDebounce[key]);

            locationCaptureDebounce[key] = setTimeout(() => {
              itineraryStore.captureClientLocation(route.id, true); // Silent mode
              delete locationCaptureDebounce[key];
            }, 3000); // Wait 3 seconds after typing stops
          }
        }
      }
    }, { fieldName: 'مبلغ المحصل', maxLimit: collectorMaxLimit });

    hideTooltip();
  };

  const updateSummaryField = (e, storeKey, fieldLabel) => {
    const maxLimit = 499999;
    handleMoneyInput(e, (val) => {
      const numVal = parseFloat(val) || 0;
      if (storeKey === 'masterLimit') displayMasterLimit.value = numVal;
      else if (storeKey === 'extraLimit') displayExtraLimit.value = numVal;
      else if (storeKey === 'currentBalance') displayCurrentBalance.value = numVal;
      saveData(false);
    }, { fieldName: fieldLabel, maxLimit: storeKey !== 'currentBalance' ? maxLimit : undefined });
  };

  const toggleSign = (row, field) => {
    const currentVal = row[field];
    row[field] = (!currentVal || currentVal === '') ? '-' : (currentVal === '-') ? null : parseFloat(String(currentVal).replace(/,/g, '')) * -1;
    saveData();
    if (field === 'collector') syncWithCounterStore();
  };

  const openExtraDetailsModal = (row, index) => {
    hideTooltip();
    activeExtraRowIndex.value = index;
    // Ensure we pass a clean copy of the row data
    activeExtraRowData.value = {
      id: row.id,
      shop: row.shop,
      code: row.code,
      amount: row.amount,
      extra: row.extra,
      // If extraDetails exists, pass it. If not, but there is an 'extra' value, create a virtual detail for migration
      extraDetails: row.extraDetails ? JSON.parse(JSON.stringify(row.extraDetails)) : []
    };
    isExtraDetailsModalOpen.value = true;
  };

  const closeExtraDetailsModal = () => {
    isExtraDetailsModalOpen.value = false;
    activeExtraRowIndex.value = null;
    activeExtraRowData.value = null;
  };

  const saveExtraDetails = ({ total, details }) => {
    if (activeExtraRowIndex.value === null) return;

    // Update the actual row in the store
    const row = displayRows.value[activeExtraRowIndex.value];
    if (row) {
      row.extra = total; // Update the main cell value
      row.extraDetails = details; // Save the detailed breakdown
      saveData(); // Persist
    }
    closeExtraDetailsModal();
  };

  const confirmClearAll = async () => {
    if ((await confirm({ title: 'مسح الكل', text: 'تأكيد؟' })).isConfirmed) {
      store.clearAll();
      searchQueryLocal.value = '';
      addNotification('تم المسح', 'info');
    }
  };

  const PENDING_ARCHIVE_KEY = 'pending_archive_action';

  const archiveToday = () => {
    if (props.isSharedView) return;

    // وضع علامات لإخفاء splash وإظهار شاشة المزامنة
    sessionStorage.setItem('skip_splash', 'true');
    sessionStorage.setItem('show_sync_loader', 'true');

    // تفعيل حالة التحميل
    isArchiving.value = true;

    // حفظ العملية المطلوبة
    localStorage.setItem(PENDING_ARCHIVE_KEY, 'true');

    // reload فوراً
    window.location.reload();
  };

  const executePendingArchive = async () => {
    const pendingArchive = localStorage.getItem(PENDING_ARCHIVE_KEY);
    if (!pendingArchive) return;

    // إزالة العلامة
    localStorage.removeItem(PENDING_ARCHIVE_KEY);

    // التأكد من عدم وجود جلسة مشتركة نشطة، وإن وجدت نقوم بإنهائها
    if (collabStore.activeSessionId) {
      logger.info('Closing active shared session before archiving...');
      collabStore.endSession();
      // ننتظر قليلاً للتأكد من تحديث الحالة
      await new Promise(r => setTimeout(r, 100));
    }

    isArchiving.value = true;
    try {
      await archiveStore.loadAvailableDates(false);
      const dateToSave = await store.getAccurateDate();
      const exists = archiveStore.dateExists(dateToSave);
      const { isConfirmed } = await confirm({
        title: exists ? 'تنبيه: الأرشيف موجود' : 'تأكيد الأرشفة',
        text: exists ? `يوجد أرشيف محفوظ بالفعل بتاريخ "${dateToSave}". هل تريد استبداله؟` : 'هل أنت متأكد أنك تريد أرشفة بيانات اليوم؟',
        confirmButtonText: exists ? 'نعم، استبدال' : 'نعم، أرشفة',
        icon: exists ? 'warning' : 'question'
      });

      if (!isConfirmed) {
        addNotification('تم إلغاء الأرشفة.', 'info');
        isArchiving.value = false;
        return;
      }

      const res = await store.archiveTodayData(dateToSave);
      if (res.success) {
        addNotification(res.message, 'success');
        api.user.trackUserAction('archive_today');
        store.clearAll();
        searchQueryLocal.value = '';
      } else {
        addNotification(res.message, 'error');
      }
    } catch (error) {
      logger.error('Unhandled error during archive process:', error);
      addNotification('حدث خطأ غير متوقع.', 'error');
    } finally {
      isArchiving.value = false;
    }
  };

  const handleExport = async () => {
    const fileName = `تحصيلات_${currentDate.value.replace(/\//g, '-')}`;
    const result = await exportAndShareTable('harvest-table-container', fileName);
    addNotification(result.message, result.success ? 'success' : 'error');
  };

  const handleSummaryExport = async () => {
    const fileName = `ملخص_بيان_${currentDate.value.replace(/\//g, '-')}`;
    const result = await exportAndShareTable('summary', fileName, { backgroundColor: 'var(--surface-bg)' });
    addNotification(result.message, result.success ? 'success' : 'error');
  };

  const customTooltipContext = ref(null);

  const showTooltip = (element, text, context = null) => {
    if (!element || !text) return;
    if (showCustomTooltip.value && tooltipTargetElement.value === element) {
      if (JSON.stringify(customTooltipContext.value) === JSON.stringify(context)) {
        return hideTooltip();
      }
    }
    customTooltipText.value = text;
    customTooltipContext.value = context;
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
  const hideTooltip = () => {
    showCustomTooltip.value = false;
    customTooltipContext.value = null;
  };

  const handleOutsideClick = (e) => {
    const isTooltipTrigger = e.target.closest('input[id^="shop-"], input[id^="extra-"], input[id^="collector-"], .readonly-field');
    const isTooltipSelf = e.target.closest('.custom-tooltip');
    if (!isTooltipTrigger && !isTooltipSelf) hideTooltip();
  };

  // Guard لمنع التنفيذ المتزامن
  let isInitializing = false;

  const initializeHarvestData = async () => {
    if (isInitializing) {
      logger.debug('⏳ Harvest: Already initializing, skipping duplicate call');
      return;
    }

    isInitializing = true;
    try {
      if (!props.isSharedView) {
        store.initialize();
        store.loadDataFromStorage();
        itineraryStore.fetchProfiles();
        itineraryStore.fetchRoutes();
      }
      loadColumns();
      syncWithCounterStore();
      searchQueryLocal.value = store.searchQuery || '';
    } catch (err) {
      logger.error('HarvestView: Failed to initialize', err);
    } finally {
      isInitializing = false;
    }
  };

  // Lifecycle Hooks
  onMounted(() => {
    initializeHarvestData();
    executePendingArchive(); // تنفيذ عملية الأرشفة المعلقة بعد reload

    // ⚡ Performance: إزالة شاشة المزامنة فقط إذا كانت موجودة
    if (sessionStorage.getItem('show_sync_loader')) {
      setTimeout(() => {
        const syncLoader = document.getElementById('sync-loader-overlay');
        if (syncLoader && syncLoader.parentNode) {
          syncLoader.parentNode.removeChild(syncLoader);
        }
        // إزالة الـ styles أيضاً
        const styles = document.querySelectorAll('style');
        styles.forEach(style => {
          if (style.innerHTML.includes('sync-loader-overlay')) {
            style.parentNode.removeChild(style);
          }
        });
        sessionStorage.removeItem('show_sync_loader');
      }, 50);
    }

    window.addEventListener('focus', syncWithCounterStore);
    document.addEventListener('click', handleOutsideClick);
  });

  onActivated(() => {
    initializeHarvestData();
  });

  onBeforeUnmount(() => {
    store.searchQuery = searchQueryLocal.value;
    window.removeEventListener('focus', syncWithCounterStore);
    document.removeEventListener('click', handleOutsideClick);
  });

  watch(() => collabStore.activeSessionId, (newId, oldId) => {
    if (props.isSharedView && newId !== oldId) {
      store.switchToUserSession(newId);
    }
  }, { immediate: true });


  return {
    store, collabStore,
    showSettings, isVisible, apply, harvestColumns,
    searchQueryLocal, showCustomTooltip, customTooltipText, customTooltipRef, currentDay, currentDate,
    showProfileDropdown, isArchiving, isMissingModalOpen, missingCenters, isOverdueModalOpen, overdueStores,
    selectedOverdueStores, allOverdueSelected,

    // Bridge computed properties
    isLoading,
    showDismissLoading,
    forceDismissLoading,
    isReadOnly,
    displayRows,
    displayTotals,
    displayMasterLimit,
    displayExtraLimit,
    displayCurrentBalance,
    displayFilteredRows,
    displayResetStatus,
    displayResetAmount,

    savedItineraryProfiles,
    filteredTotals, // for summary display
    filteredTotalNetValue,
    getFilteredTotalNetClass,
    getFilteredTotalNetIcon,
    calculateNet, getRowNetStatus, getRowNetIcon,
    // Add overdueTotal
    overdueTotal: computed(() => overdueStores.value.reduce((sum, item) => sum + (parseFloat(item.net) || 0), 0)),

    exitSession, showMissingCenters, showOverdueModal, applyOverdue, deleteSelectedOverdue, restoreLatestOverdue, toggleProfileDropdown,
    applyItineraryProfile, handleSearchInput, clearSearch, updateShop, updateCode,
    updateAmount, updateExtra, updateCollector, updateSummaryField, toggleSign,
    confirmClearAll, archiveToday, handleExport, handleSummaryExport, showTooltip, formatInputNumber, customTooltipContext,
    // Extra Details Modal
    isExtraDetailsModalOpen, activeExtraRowData, openExtraDetailsModal, closeExtraDetailsModal, saveExtraDetails,
    // Overdue date
    overdueDate
  };
}