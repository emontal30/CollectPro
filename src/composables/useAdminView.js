
import { ref, computed, onMounted, onUnmounted, onActivated, watch, inject } from 'vue';
import { useRouter, onBeforeRouteUpdate } from 'vue-router';
import { useAdminStore } from '@/stores/adminStore';
import { useItineraryStore } from '@/stores/itineraryStore';
import { useAuthStore } from '@/stores/auth';
import { TimeService } from '@/utils/time';
import { exportAndShareTable } from '@/utils/exportUtils';
import logger from '@/utils/logger';

export function useAdminView() {
    const store = useAdminStore();
    const itineraryStore = useItineraryStore();
    const authStore = useAuthStore();
    const { confirm, addNotification } = inject('notifications');

    // Super Admin Check
    const isSuperAdmin = computed(() => {
        return authStore.user?.email === 'emontal.33@gmail.com';
    });

    const superAdminEmailInput = ref('');

    const adminStats = {
        totalUsers: { label: 'إجمالي المستخدمين', icon: 'fas fa-users', unit: '' },
        activeUsers: { label: 'مستخدمون فعالون', icon: 'fas fa-user-check', unit: '' },
        pendingRequests: { label: 'طلبات قيد المراجعة', icon: 'fas fa-clock', unit: '' },
        activeSubscriptions: { label: 'الاشتراكات النشطة', icon: 'fas fa-check-circle', unit: '' },
        totalRevenue: { label: 'إجمالي الإيرادات', icon: 'fas fa-money-bill-wave', unit: 'ج.م' },
        appErrors: { label: 'الأخطاء', icon: 'fas fa-bug', unit: '' },
        locations: { label: 'مواقع العملاء', icon: 'fas fa-map-marker-alt', unit: '' },
    };

    const selectedUsers = ref([]);
    const bulkDays = ref(null);
    const showDetailsModal = ref(false);
    const selectedSub = ref(null);
    const showSupportModal = ref(false);
    const selectedSupportUser = ref(null);
    const selectedError = ref(null);
    const showLocationsModal = ref(false);
    const allLocations = ref([]);
    const isLoadingLocations = ref(false);
    const selectedLocationIds = ref([]);
    const showScrollTop = ref(false);

    const selectedUserErrors = computed(() => {
        if (!selectedSupportUser.value) return [];
        return store.appErrors.filter(e => e.user_id === selectedSupportUser.value.id);
    });

    const locationsWithCoords = computed(() => {
        return allLocations.value.filter(loc => loc.latitude && loc.longitude);
    });

    const locationsStats = computed(() => {
        return {
            total: allLocations.value.length,
            withCoords: locationsWithCoords.value.length
        };
    });

    const isAllLocationsSelected = computed(() => {
        return allLocations.value.length > 0 && selectedLocationIds.value.length === allLocations.value.length;
    });

    const toggleSelectAllLocations = () => {
        if (isAllLocationsSelected.value) {
            selectedLocationIds.value = [];
        } else {
            selectedLocationIds.value = allLocations.value.map(loc => loc.id);
        }
    };

    const errorStats = computed(() => {
        return {
            total: store.appErrors.length,
            resolved: store.appErrors.filter(e => e.is_resolved).length,
            unresolved: store.appErrors.filter(e => !e.is_resolved).length
        };
    });

    const openSupportModal = (user, error = null) => {
        selectedSupportUser.value = user;
        selectedError.value = error;
        showSupportModal.value = true;
    };

    const showSubscriptionDetails = (sub) => {
        selectedSub.value = sub;
        showDetailsModal.value = true;
    };

    const handleScroll = () => {
        showScrollTop.value = window.scrollY > 300;
    };

    const scrollToTop = () => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    };

    const closeDropdown = (e) => {
        if (!e.target.closest('.dropdown-wrapper')) {
            // Logic if needed
        }
    };

    const refreshLocations = async () => {
        try {
            isLoadingLocations.value = true;
            const locations = await itineraryStore.adminFetchLocations();
            allLocations.value = locations || [];
            selectedLocationIds.value = [];
            logger.info(`✅ Loaded ${allLocations.value.length} customer locations`);
        } catch (err) {
            logger.error('❌ Failed to load customer locations:', err);
            allLocations.value = [];
            addNotification('فشل تحميل مواقع العملاء', 'error');
        } finally {
            isLoadingLocations.value = false;
        }
    };

    const openLocationsModal = async () => {
        showLocationsModal.value = true;
        if (allLocations.value.length === 0) {
            await refreshLocations();
        }
    };

    const handleStatClick = (key) => {
        const sectionMap = {
            'pendingRequests': 'pending-requests-section',
            'appErrors': 'app-errors-section',
            'locations': 'locations-modal'
        };

        if (key === 'locations') {
            openLocationsModal();
            return;
        }

        const sectionId = sectionMap[key];
        if (sectionId) {
            const sectionElement = document.getElementById(sectionId);
            if (sectionElement) {
                sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                sectionElement.classList.add('highlight-section');
                setTimeout(() => sectionElement.classList.remove('highlight-section'), 2000);
            }
        }
    };

    const handleActiveUsersPeriodChange = () => store.fetchStats(false);

    const copyToClipboard = async (text, label = 'النص') => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            addNotification(`تم نسخ ${label} بنجاح`, 'success');
        } catch (err) {
            logger.error('Failed to copy text:', err);
            addNotification('فشل نسخ النص', 'error');
        }
    };

    const filteredUsers = computed(() => {
        if (!store.filters.usersSearch) return store.usersList;
        const q = store.filters.usersSearch.toLowerCase();
        return store.usersList.filter(u =>
            (u.user_code?.toLowerCase().includes(q)) ||
            (u.full_name?.toLowerCase().includes(q)) ||
            (u.email?.toLowerCase().includes(q))
        );
    });

    const isAllSelected = computed(() => {
        return filteredUsers.value.length > 0 && selectedUsers.value.length === filteredUsers.value.length;
    });

    const toggleSelectAll = () => {
        selectedUsers.value = isAllSelected.value ? [] : filteredUsers.value.map(u => u.id);
    };

    const toggleBulkSign = () => {
        if (bulkDays.value) bulkDays.value *= -1;
    };

    const toggleUserSign = (user) => {
        if (user.manualDays) user.manualDays *= -1;
        else user.manualDays = -1;
    };

    const handleBulkActivate = async () => {
        if (!bulkDays.value || isNaN(bulkDays.value)) {
            return addNotification('يرجى إدخال عدد أيام صحيح', 'error');
        }
        const result = await confirm({
            title: 'تأكيد التفعيل الجماعي',
            text: `هل أنت متأكد من تفعيل اشتراك لمدة ${bulkDays.value} يوم لعدد ${selectedUsers.value.length} مستخدم؟`,
            icon: 'question'
        });
        if (result.isConfirmed) {
            let successCount = 0;
            for (const userId of selectedUsers.value) {
                try {
                    await store.activateManualSubscription(userId, bulkDays.value, false, true, true);
                    successCount++;
                } catch (e) {
                    console.error('Bulk activation failed for user:', userId, e);
                }
            }
            selectedUsers.value = [];
            bulkDays.value = null;
            addNotification(`تم تفعيل الاشتراك لـ ${successCount} مستخدم.`, 'success');
            await store.loadDashboardData(true);
        }
    };

    const handleToggleEnforcement = async (event) => {
        const newVal = event.target.checked;
        const result = await confirm({
            title: newVal ? 'تفعيل وضع الحماية' : 'إيقاف وضع الحماية',
            text: newVal
                ? 'هل أنت متأكد؟ سيتم منع جميع المستخدمين غير المشتركين من العمل على التطبيق فوراً.'
                : 'هل أنت متأكد؟ سيتم السماح لجميع المستخدمين بالعمل على التطبيق مجاناً.',
            icon: newVal ? 'warning' : 'info',
            confirmButtonText: newVal ? 'تفعيل القفل 🔒' : 'فتح التطبيق 🔓',
            confirmButtonColor: newVal ? 'var(--danger)' : 'var(--primary)'
        });
        if (result.isConfirmed) await store.toggleSubscriptionEnforcement(newVal);
        else event.target.checked = !newVal;
    };

    const calculateRemainingDays = (endDate, status = 'active', updatedAt = null) => {
        if (status === 'cancelled' && updatedAt) {
            const end = new Date(endDate);
            const pausedAt = new Date(updatedAt);
            const diffTime = end - pausedAt;
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        return TimeService.calculateDaysRemaining(endDate, store.serverTimeOffset);
    };

    const getRemainingDaysColor = (endDate) => {
        const days = calculateRemainingDays(endDate);
        if (days <= 3) return '#ef4444';
        if (days <= 7) return '#f59e0b';
        return 'inherit';
    };

    const initAdminData = async (force = false) => {
        if (!authStore.isAdmin) return;
        try {
            await store.loadDashboardData(force);
            await refreshLocations();
        } catch (err) {
            logger.error('AdminView: Failed to load data', err);
        }
    };

    const deleteSelectedLocations = async () => {
        if (selectedLocationIds.value.length === 0) {
            addNotification('يرجى تحديد عملاء للحذف', 'warning');
            return;
        }

        const locationIds = selectedLocationIds.value;
        const count = locationIds.length;

        const confirmed = await confirm({
            title: 'تحذير: هذا الإجراء لا يمكن التراجع عنه',
            text: `هل أنت متأكد من حذف ${count} عميل؟`,
            icon: 'warning'
        });

        if (!confirmed?.isConfirmed) return;

        try {
            isLoadingLocations.value = true;
            await itineraryStore.deleteCustomerLocations(locationIds);
            allLocations.value = allLocations.value.filter(loc => !locationIds.includes(loc.id));
            selectedLocationIds.value = [];
            addNotification(`تم حذف ${count} عميل بنجاح`, 'success');
        } catch (err) {
            logger.error('Error deleting locations:', err);
            addNotification('فشل حذف العملاء', 'error');
        } finally {
            isLoadingLocations.value = false;
        }
    };

    const exportLocations = async (type) => {
        const fileName = `User_Locations_${new Date().toISOString().split('T')[0]}`;
        await exportAndShareTable('locations-table-container', fileName);
    };

    onMounted(() => {
        initAdminData(true);
        window.addEventListener('click', closeDropdown);
        window.addEventListener('scroll', handleScroll);
    });

    onActivated(() => {
        initAdminData(true);
    });

    onUnmounted(() => {
        window.removeEventListener('click', closeDropdown);
        window.removeEventListener('scroll', handleScroll);
    });

    onBeforeRouteUpdate((to, from, next) => {
        initAdminData(true);
        next();
    });

    watch(() => authStore.isAdmin, (newVal) => {
        if (newVal) initAdminData(true);
    });

    return {
        store,
        itineraryStore,
        authStore,
        adminStats,
        selectedUsers,
        bulkDays,
        showDetailsModal,
        selectedSub,
        showSupportModal,
        selectedSupportUser,
        selectedError,
        showLocationsModal,
        allLocations,
        isLoadingLocations,
        selectedLocationIds,
        showScrollTop,
        selectedUserErrors,
        locationsWithCoords,
        locationsStats,
        isAllLocationsSelected,
        errorStats,
        openSupportModal,
        showSubscriptionDetails,
        handleScroll,
        scrollToTop,
        handleStatClick,
        handleActiveUsersPeriodChange,
        copyToClipboard,
        filteredUsers,
        isAllSelected,
        toggleSelectAll,
        toggleBulkSign,
        toggleUserSign,
        handleBulkActivate,
        handleToggleEnforcement,
        calculateRemainingDays,
        getRemainingDaysColor,
        refreshLocations,
        openLocationsModal,
        deleteSelectedLocations,
        exportLocations,
        toggleSelectAllLocations,
        isSuperAdmin,
        superAdminEmailInput
    };
}
