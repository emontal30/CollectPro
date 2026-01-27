import { ref, computed, onMounted, onBeforeUnmount, nextTick, inject, watch } from 'vue';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useHarvestStore } from '@/stores/harvest';
import { useAuthStore } from '@/stores/auth';

export function useShareHarvestView() {
    const collabStore = useCollaborationStore();
    const harvestStore = useHarvestStore();
    const authStore = useAuthStore();
    const { addNotification, confirm } = inject('notifications');

    // Computed
    const isAdmin = computed(() => authStore.isAdmin);

    // State
    const savedTab = localStorage.getItem('share_harvest_active_tab');
    const defaultTab = isAdmin.value ? 'admin' : 'manage';
    const activeTab = ref(savedTab || defaultTab);

    // Guard: If non-admin has 'admin' tab saved, reset to default
    if (activeTab.value === 'admin' && !isAdmin.value) {
        activeTab.value = 'manage';
    }

    // Watch for tab changes to persist
    watch(activeTab, (newTab) => {
        localStorage.setItem('share_harvest_active_tab', newTab);
    });
    const newCollabCode = ref('');
    const adminTargetUid = ref('');
    const selectedRole = ref('editor'); // Default role
    const isSyncLoading = ref(false);
    const isArchiveLoading = ref(false);
    const isLoading = ref(false); // keep for other generic uses if any
    const selectedCollaboratorId = ref(null);

    // Rename State
    const isEditingName = ref(false);
    const showHistoryManager = ref(false);
    const tempName = ref('');
    const nameInput = ref(null);
    const selectedArchiveDate = ref(null);

    const activeCollaboratorName = computed(() => {
        if (collabStore.activeSessionName) return collabStore.activeSessionName;

        // Fallback for admin modes: check if we have a selected remote user
        if (collabStore.selectedRemoteUserId) {
            const fromHistory = collabStore.adminHistory.find(h => h.userId === collabStore.selectedRemoteUserId);
            if (fromHistory) return fromHistory.name;
        }

        return 'المستخدم';
    });

    const activeCollaboratorCode = computed(() => {
        if (collabStore.activeSessionCode) return collabStore.activeSessionCode;

        if (collabStore.selectedRemoteUserId) {
            const fromHistory = collabStore.adminHistory.find(h => h.userId === collabStore.selectedRemoteUserId);
            if (fromHistory) return fromHistory.code;
        }

        return '';
    });

    const lastUpdatedText = computed(() => {
        if (!harvestStore.sharedLastUpdated) return '';
        const date = new Date(harvestStore.sharedLastUpdated);

        // التاريخ: 27/01/2026
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();

        // الوقت: 10:30 م
        const time = date.toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        return `${year}-${month}-${day} | ${time}`;
    });

    const manageableCollaborators = computed(() => {
        return collabStore.collaborators.filter(c => c.isOwner);
    });

    const shouldShowTable = computed(() => {
        if (collabStore.isRemoteArchiveMode) {
            return activeTab.value === 'admin';
        }
        if (!collabStore.activeSessionId) return false;

        if (activeTab.value === 'admin') {
            return collabStore.sessionType === 'admin';
        }
        if (activeTab.value === 'manage') {
            return collabStore.sessionType === 'collab';
        }
        return false;
    });

    // Lifecycle
    onMounted(async () => {
        await collabStore.fetchCollaborators();
        await collabStore.fetchIncomingRequests();

        // تفعيل الاستماع اللحظي للدعوات والقبول
        collabStore.subscribeToRequests();

        // استعادة الجلسة النشطة إذا وجدت
        if (collabStore.activeSessionId) {
            selectedCollaboratorId.value = collabStore.activeSessionId;
        }
    });

    onBeforeUnmount(() => {
        collabStore.unsubscribeFromRequests();
    });

    // Methods

    // X. Admin Open Logic
    const handleAdminOpen = async (knownUserId = null) => {
        // Guard against Vue auto-passing PointerEvent if called directly from template
        const actualUserId = typeof knownUserId === 'string' ? knownUserId : null;

        if (!adminTargetUid.value) return;
        isSyncLoading.value = true;
        selectedArchiveDate.value = null; // ريست التاريخ عند الدخول في وضع المزامنة
        try {
            // تحديد وضع المزامنة كوضع نشط
            collabStore.setAdminViewMode('sync');

            await collabStore.adminOpenUser(adminTargetUid.value.trim(), actualUserId);
            selectedCollaboratorId.value = collabStore.activeSessionId; // Might be null if multiple matches, but adminOpenUser handles single match
            addNotification('تم الدخول للحساب بنجاح (وضع المزامنه الاجباريه نشط ) ⚡', 'success');

            // Switch to the shared view if not already there
            if (collabStore.activeSessionId) {
                await harvestStore.switchToUserSession(collabStore.activeSessionId);
                // Trigger a Pulse Request to force the user to sync their latest local state
                collabStore.broadcastPulseRequest(collabStore.activeSessionId);
            }
        } catch (err) {
            addNotification(err.message || 'فشل الدخول كأدمن', 'error');
        } finally {
            isSyncLoading.value = false;
        }
    };

    // 1. Send Invite
    const sendInvite = async () => {
        if (!newCollabCode.value) return;
        isLoading.value = true;
        try {
            // Regular invitation path
            await collabStore.sendInvite(newCollabCode.value, selectedRole.value);
            addNotification('تم إرسال الدعوة بنجاح. في انتظار قبول الطرف الآخر...', 'success');

            newCollabCode.value = '';
            selectedRole.value = 'editor'; // Reset to default
        } catch (err) {
            addNotification(err.message || 'فشل العملية', 'error');
        } finally {
            isLoading.value = false;
        }
    };

    // 2. Respond to Invite
    const handleRespond = async (reqId, status, customRole = null) => {
        try {
            // Visual feedback: Find request and mark as processing/accepted locally first
            const req = collabStore.incomingRequests.find(r => r.id === reqId);
            if (req && status === 'accepted') {
                req.isAccepted = true; // Trigger UI change
            }

            // Short delay to let user see the "Activated" state if accepted
            if (status === 'accepted') {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            await collabStore.respondToInvite(reqId, status, customRole);
            const msg = status === 'accepted' ? 'تم قبول الدعوة بنجاح ✅' : 'تم رفض الدعوة';

            // Only show toast if rejected, because accepted has visual UI feedback now
            if (status !== 'accepted') {
                addNotification(msg, 'info');
            }
        } catch (err) {
            console.error('Error responding to invitation:', err);
            const errorMsg = err.message || 'حدث خطأ أثناء معالجة الطلب';
            addNotification(errorMsg, 'error');

            // Revert local state on error
            const req = collabStore.incomingRequests.find(r => r.id === reqId);
            if (req) req.isAccepted = false;
        }
    };

    const handleClearAllInvites = async () => {
        const result = await confirm({
            title: 'تنظيف كافة الدعوات',
            text: 'هل أنت متأكد من حذف كافة الدعوات الواردة المعلقة؟',
            icon: 'warning',
            confirmButtonText: 'نعم، تنظيف الكل',
            confirmButtonColor: '#d33'
        });

        if (result.isConfirmed) {
            await collabStore.clearAllIncomingInvites();
        }
    };

    // 3. Select Collaborator
    const handleCollaboratorChange = async () => {
        if (!selectedCollaboratorId.value) {
            closeSession();
            return;
        }

        if (selectedCollaboratorId.value) {
            const collab = collabStore.collaborators.find(c => c.userId === selectedCollaboratorId.value);
            if (collab) {
                collabStore.setActiveSession(collab.userId, collab.displayName, 'collab', collab.userCode);
                // Load data
                await harvestStore.switchToUserSession(collab.userId);
            }
        }
    };

    // 4. Close Session
    const closeSession = () => {
        collabStore.setActiveSession(null, null);
        collabStore.exitRemoteArchiveMode(); // Also exit archive if active
        selectedCollaboratorId.value = null;
        selectedArchiveDate.value = null;
    };

    const handleEnterKey = async () => {
        if (!adminTargetUid.value) return;
        if (collabStore.adminViewMode === 'sync') {
            await handleAdminOpen();
        } else {
            await handleViewArchive();
        }
    };

    const quickOpenFromHistory = async (item) => {
        adminTargetUid.value = item.code;

        if (collabStore.adminViewMode === 'sync') {
            await handleAdminOpen(item.userId);
        } else if (collabStore.adminViewMode === 'archive') {
            await handleViewArchive(item.userId);
        }
    };

    const editHistoryItem = (item) => {
        const newName = prompt('أدخل الاسم الجديد:', item.name);
        if (newName !== null && newName.trim()) {
            collabStore.updateAdminHistoryName(item.userId, newName.trim());
            addNotification('تم تحديث الاسم في السجل', 'success');
        }
    };

    const deleteHistoryItem = async (userId) => {
        const result = await confirm({
            title: 'حذف من السجل',
            text: 'هل أنت متأكد من حذف هذا المستخدم من سجل المشاهدة؟',
            icon: 'warning',
            confirmButtonText: 'نعم، حذف',
            confirmButtonColor: '#d33'
        });

        if (result.isConfirmed) {
            collabStore.removeFromAdminHistory(userId);
            addNotification('تم الحذف من السجل', 'info');
        }
    };

    // X. Admin Additional Methods
    const handleHistorySelect = async (event) => {
        const userId = event.target.value;
        if (!userId) return;

        const selected = collabStore.adminHistory.find(h => h.userId === userId);
        if (selected) {
            adminTargetUid.value = selected.code;

            if (collabStore.adminViewMode === 'sync') {
                await handleAdminOpen(selected.userId);
            } else if (collabStore.adminViewMode === 'archive') {
                await handleViewArchive(selected.userId);
            }
        }
    };

    const handleViewArchive = async (knownUserId = null) => {
        // Guard against Vue auto-passing PointerEvent if called directly from template
        const actualUserId = typeof knownUserId === 'string' ? knownUserId : null;

        if (!adminTargetUid.value) return;
        isArchiveLoading.value = true;
        selectedArchiveDate.value = null; // ريست التاريخ لاختيار تاريخ جديد للمستخدم
        try {
            // تحديد وضع الأرشيف كوضع نشط
            collabStore.setAdminViewMode('archive');
            collabStore.sessionType = 'admin';

            const dates = await collabStore.fetchRemoteArchiveDates(adminTargetUid.value.trim(), actualUserId);
            if (dates.length === 0) {
                addNotification('لا يوجد أرشيف متوفر لهذا المستخدم.', 'info');
            } else {
                addNotification('تم جلب تواريخ الأرشيف بنجاح 📅', 'success');
            }
        } catch (err) {
            addNotification(err.message || 'فشل جلب الأرشيف', 'error');
        } finally {
            isArchiveLoading.value = false;
        }
    };

    const handleDateSelect = async (event) => {
        const dateStr = event.target.value;
        if (!dateStr) return;

        isLoading.value = true;
        try {
            await collabStore.fetchRemoteArchiveData(dateStr);
            addNotification(`جاري عرض أرشيف تاريخ ${dateStr} (للقراءة فقط) 📖`, 'info');

            // Switch to shared view logic is implicit because collabStore.isRemoteArchiveMode will show container
            // and HarvestView uses remoteArchiveRows if mode is active.

        } catch (err) {
            addNotification(err.message || 'فشل تحميل بيانات الأرشيف', 'error');
        } finally {
            isLoading.value = false;
        }
    };

    // 5. Refresh Session
    const refreshSharedSession = async () => {
        if (collabStore.activeSessionId) {
            addNotification('جاري تحديث البيانات...', 'info');
            await harvestStore.switchToUserSession(collabStore.activeSessionId);
            addNotification('تم تحديث البيانات', 'success');
        }
    };

    // 5. Rename Logic
    const startEditingName = () => {
        const collab = collabStore.collaborators.find(c => c.userId === selectedCollaboratorId.value);
        if (collab) {
            tempName.value = collab.displayName;
            isEditingName.value = true;
            nextTick(() => {
                if (nameInput.value) nameInput.value.focus();
            });
        }
    };

    const saveName = () => {
        if (tempName.value.trim()) {
            collabStore.setAlias(selectedCollaboratorId.value, tempName.value.trim());
            collabStore.activeSessionName = tempName.value.trim();
            addNotification('تم تحديث الاسم', 'success');
        }
        isEditingName.value = false;
    };

    const cancelEditName = () => {
        isEditingName.value = false;
    };

    // 6. Revoke Logic
    const currentResultIsGhost = computed(() => {
        if (!selectedCollaboratorId.value) return false;
        const collab = collabStore.collaborators.find(c => c.userId === selectedCollaboratorId.value);
        return collab ? collab.isLocal : false;
    });

    const handleRevoke = async () => {
        if (!selectedCollaboratorId.value) return;

        const result = await confirm({
            title: 'إلغاء الصلاحية',
            text: 'هل أنت متأكد من إلغاء صلاحية هذا الزميل؟ سيتم منعه من الدخول لمشاركتك إلا بدعوة جديدة.',
            icon: 'warning',
            confirmButtonText: 'نعم، إلغاء الصلاحية',
            confirmButtonColor: '#d33'
        });

        if (!result.isConfirmed) return;

        isLoading.value = true;
        try {
            await collabStore.revokeInvite(selectedCollaboratorId.value);
            selectedCollaboratorId.value = null;
            addNotification('تم إلغاء الصلاحية بنجاح', 'success');
        } catch (err) {
            addNotification('حدث خطأ أثناء الحذف', 'error');
        } finally {
            isLoading.value = false;
        }
    };

    return {
        collabStore,
        harvestStore,
        authStore,
        isAdmin,
        activeTab,
        newCollabCode,
        adminTargetUid,
        selectedRole,
        isSyncLoading,
        isArchiveLoading,
        isLoading,
        selectedCollaboratorId,
        isEditingName,
        showHistoryManager,
        tempName,
        nameInput,
        selectedArchiveDate,
        activeCollaboratorName,
        activeCollaboratorCode,
        lastUpdatedText,
        handleAdminOpen,
        sendInvite,
        handleRespond,
        handleClearAllInvites,
        handleCollaboratorChange,
        closeSession,
        handleEnterKey,
        quickOpenFromHistory,
        editHistoryItem,
        deleteHistoryItem,
        handleHistorySelect,
        handleViewArchive,
        handleDateSelect,
        refreshSharedSession,
        startEditingName,
        saveName,
        cancelEditName,
        currentResultIsGhost,
        handleRevoke,
        shouldShowTable,
        manageableCollaborators
    };
}
