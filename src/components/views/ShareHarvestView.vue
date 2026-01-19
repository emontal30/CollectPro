<template>
  <div class="share-harvest-view">
    <PageHeader 
      title="مشاركة التحصيل" 
      subtitle="إدارة الفريق ومتابعة الجداول الحية"
      icon="users"
    />

    <div class="collab-controls card">
      <div class="controls-header">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'manage' }"
          @click="activeTab = 'manage'"
        >
          <i class="fas fa-tasks"></i> إدارة وعرض
        </button>
        <button 
          class="tab-btn relative" 
          :class="{ active: activeTab === 'invites' }"
          @click="activeTab = 'invites'"
        >
          <i class="fas fa-envelope"></i> الدعوات الواردة
          <span v-if="collabStore.incomingRequests.length > 0" class="badge-count">
            {{ collabStore.incomingRequests.length }}
          </span>
        </button>
      </div>

      <div class="card-body">
        
        <div v-show="activeTab === 'manage'" class="manage-tab animate-fade-in">
          
          <div class="control-row add-section">
            <div class="input-group">
              <select v-model="selectedRole" class="form-control role-select">
                <option value="editor">محرر (تعديل)</option>
                <option value="viewer">مشاهد (قراءة فقط)</option>
              </select>
              <input 
                v-model="newCollabCode" 
                type="text" 
                placeholder="كود الزميل (مثال: USER-123)" 
                class="form-control code-input"
              />
              <button class="btn btn-primary" @click="sendInvite" :disabled="!newCollabCode || isLoading">
                <i class="fas fa-paper-plane" v-if="!isLoading"></i>
                <i class="fas fa-spinner fa-spin" v-else></i>
                <span class="d-none-mobile">إرسال دعوة</span>
              </button>
            </div>
          </div>

          <hr class="separator" />

          <div class="control-row select-section">
            <div v-if="collabStore.collaborators.length === 0" class="text-muted">
              <i class="fas fa-info-circle"></i> لا يوجد زملاء في قائمتك. أرسل دعوة للبدء.
            </div>

            <div v-else class="selection-wrapper">
              <div class="select-box">
                <label>عرض جدول:</label>
                <select v-model="selectedCollaboratorId" class="form-control select-input" @change="handleCollaboratorChange">
                  <option :value="null" disabled>-- اختر زميلاً --</option>
                  <option v-for="collab in collabStore.collaborators" :key="collab.userId" :value="collab.userId">
                    {{ collab.displayName }} ({{ collab.role === 'editor' ? 'محرر' : 'مشاهد' }})
                  </option>
                </select>
                
                <button 
                  v-if="selectedCollaboratorId && !currentResultIsGhost" 
                  class="btn btn-danger btn-sm ml-2" 
                  @click="handleRevoke" 
                  title="إلغاء الصلاحية (حذف)"
                >
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>

              <div v-if="selectedCollaboratorId" class="rename-box">
                <div v-if="!isEditingName">
                  <button class="btn-icon" @click="startEditingName" title="تغيير الاسم المستعار">
                    <i class="fas fa-pen"></i>
                  </button>
                </div>
                <div v-else class="edit-group">
                  <input 
                    v-model="tempName" 
                    type="text" 
                    class="form-control sm-input" 
                    ref="nameInput"
                    @keyup.enter="saveName"
                    placeholder="اسم مستعار"
                  />
                  <button class="btn-icon text-success" @click="saveName"><i class="fas fa-check"></i></button>
                  <button class="btn-icon text-secondary" @click="cancelEditName"><i class="fas fa-times"></i></button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-show="activeTab === 'invites'" class="invites-tab animate-fade-in">
          <div v-if="collabStore.incomingRequests.length === 0" class="empty-state">
            <i class="fas fa-check-circle text-success mb-2"></i>
            <p>لا توجد دعوات معلقة حالياً.</p>
          </div>
          
          <div v-else class="invites-list">
            <div v-for="req in collabStore.incomingRequests" :key="req.id" class="invite-item">
              <div class="invite-info">
                <strong>{{ req.sender_profile?.full_name || 'مستخدم' }}</strong>
                <span class="text-muted text-sm">يدعوك لتكون ({{ req.role === 'editor' ? 'محرر' : 'مشاهد' }})</span>
              </div>
              <div class="invite-actions">
                <button @click="handleRespond(req.id, 'accepted')" class="btn btn-sm btn-success">
                  <i class="fas fa-check"></i> قبول
                </button>
                <button @click="handleRespond(req.id, 'rejected')" class="btn btn-sm btn-outline-danger">
                  <i class="fas fa-times"></i> رفض
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <div v-if="collabStore.activeSessionId" class="shared-harvest-container animate-slide-up">
      <div class="shared-header">
        <div class="header-info-group">
          <div class="badge-info">
            <i class="fas fa-eye pulse"></i>
            <span>جاري عرض: <strong>{{ activeCollaboratorName }}</strong></span>
          </div>
          <button 
            class="last-sync-badge clickable" 
            v-if="lastUpdatedText" 
            @click="refreshSharedSession" 
            title="اضغط للتحديث يدوياً"
            :disabled="harvestStore.isSharedLoading"
          >
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': harvestStore.isSharedLoading }"></i>
            <span>{{ lastUpdatedText }}</span>
          </button>
        </div>
        <button class="btn btn-danger btn-sm" @click="closeSession">
          <i class="fas fa-times"></i> إغلاق
        </button>
      </div>

      <HarvestView :isSharedView="true" />
    </div>

    <div v-else class="placeholder-container">
      <div class="placeholder-content">
        <i class="fas fa-table fa-3x text-muted opacity-50"></i>
        <p class="mt-3 text-muted">اختر زميلاً من القائمة أعلاه لعرض الجدول الخاص به هنا.</p>
      </div>
    </div>

    <!-- Footer container with Return to Harvests button (separate container) -->
    <div class="share-footer-container footer-sticky">
      <div class="buttons-row">
        <router-link to="/app/harvest" class="btn btn-dashboard btn-dashboard--home">
          <i class="fas fa-arrow-left"></i>
          <span>العودة للتحصيلات</span>
        </router-link>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, inject } from 'vue';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useHarvestStore } from '@/stores/harvest';
import { useAuthStore } from '@/stores/auth';
import HarvestView from './HarvestView.vue';
import PageHeader from '@/components/layout/PageHeader.vue';

const collabStore = useCollaborationStore();
const harvestStore = useHarvestStore(); // قد نحتاجه لأي عمليات تهيئة
const authStore = useAuthStore();
const { addNotification } = inject('notifications');

// Computed
const isAdmin = computed(() => authStore.isAdmin);

// State
const activeTab = ref('manage'); // manage | invites
const newCollabCode = ref('');
const selectedRole = ref('editor'); // Default role
const isLoading = ref(false);
const selectedCollaboratorId = ref(null);

// Rename State
const isEditingName = ref(false);
const tempName = ref('');
const nameInput = ref(null);

const activeCollaboratorName = computed(() => {
  return collabStore.activeSessionName || 'الزميل';
});

const lastUpdatedText = computed(() => {
  if (!harvestStore.sharedLastUpdated) return '';
  const date = new Date(harvestStore.sharedLastUpdated);
  
  // تنسيق اليوم والشهر (13/01)
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // تنسيق الوقت بالإنجليزية (10:30 PM)
  const time = date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  return `${day}/${month} | ${time}`;
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

// 1. Send Invite
const sendInvite = async () => {
  if (!newCollabCode.value) return;
  isLoading.value = true;
  try {
    // التعديل هنا: الدالة قد تعيد ID المستخدم إذا تم الدخول مباشرة (وضع الأدمن)
    const activeUserId = await collabStore.sendInvite(newCollabCode.value, selectedRole.value);

    if (activeUserId) {
      // إذا تم إرجاع ID (حالة الأدمن)، نحدث القائمة ونختاره فوراً
      selectedCollaboratorId.value = activeUserId;
      addNotification('تم الدخول للحساب بنجاح (وضع الأدمن - مزامنة إجبارية نشطة) ⚡', 'success');
    } else {
      // الحالة العادية
      addNotification('تم إرسال الدعوة بنجاح. في انتظار قبول الطرف الآخر...', 'success');
    }

    newCollabCode.value = '';
    selectedRole.value = 'editor'; // Reset to default
  } catch (err) {
    addNotification(err.message || 'فشل العملية', 'error');
  } finally {
    isLoading.value = false;
  }
};

// 2. Respond to Invite
const handleRespond = async (reqId, status) => {
  try {
    await collabStore.respondToInvite(reqId, status);
    const msg = status === 'accepted' ? 'تم قبول الدعوة بنجاح ✅' : 'تم رفض الدعوة';
    addNotification(msg, status === 'accepted' ? 'success' : 'info');
    // Note: fetchCollaborators is already called in respondToInvite with timeout protection
  } catch (err) {
    console.error('Error responding to invitation:', err);
    const errorMsg = err.message || 'حدث خطأ أثناء معالجة الطلب';
    addNotification(errorMsg, 'error');
  }
};

// 3. Select Collaborator
const handleCollaboratorChange = () => {
  if (selectedCollaboratorId.value) {
    const collab = collabStore.collaborators.find(c => c.userId === selectedCollaboratorId.value);
    if (collab) {
      collabStore.setActiveSession(collab.userId, collab.displayName);
    }
  }
};

// 4. Close Session
const closeSession = () => {
  collabStore.setActiveSession(null, null);
  selectedCollaboratorId.value = null;
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
        if(nameInput.value) nameInput.value.focus();
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
  
  if(!confirm('هل أنت متأكد من إلغاء صلاحية هذا الزميل؟ سيتم منعه من الدخول لمشاركتك إلا بدعوة جديدة.')) return;

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

</script>

<style scoped>
.share-harvest-view { padding-bottom: 50px; }

/* Controls Card */
.collab-controls {
  background: var(--surface-bg);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 20px;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.controls-header {
  display: flex;
  padding: 6px;
  background: var(--surface-bg);
  border-bottom: 1px solid transparent;
  justify-content: center;
  gap: 8px;
}

.tab-btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: none;
  color: var(--text-muted);
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.18s ease-in-out;
  font-size: 1rem;
  position: relative;
  border-bottom: 3px solid transparent;
  border-radius: 8px;
}

.tab-btn:not(.active):hover { color: var(--text-main); }
.tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); background: var(--bg-secondary); box-shadow: 0 6px 14px rgba(0,0,0,0.06); }

.badge-count {
  background: var(--danger);
  color: white;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 10px;
  margin-right: 5px;
}

.card-body { padding: 15px; }

/* Inputs & Forms */
.input-group { display: flex; gap: 8px; width: 100%; }
.form-control {
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  flex: 1;
}
.role-select { flex: 0 0 140px; } /* Fixed width for role select */
.code-input { flex: 2; }
.select-input { max-width: 100%; }

.separator { margin: 15px 0; border: 0; border-top: 1px solid var(--border-color); opacity: 0.5; }

/* Selection Section */
.selection-wrapper { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; }
.select-box { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 250px; }
.select-box label { font-weight: 600; white-space: nowrap; }

/* Rename Box */
.rename-box { display: flex; align-items: center; gap: 5px; }
.edit-group { display: flex; align-items: center; gap: 2px; }
.sm-input { padding: 6px; font-size: 0.9rem; width: 140px; }
.btn-icon { background: none; border: none; cursor: pointer; padding: 5px; font-size: 1rem; color: var(--text-muted); transition: 0.2s; }
.btn-icon:hover { color: var(--primary); background: var(--bg-secondary); border-radius: 4px; }
.text-success { color: var(--success) !important; }
.text-secondary { color: var(--text-muted) !important; }

/* Invites List */
.invites-list { display: flex; flex-direction: column; gap: 10px; }
.invite-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}
.invite-info { display: flex; flex-direction: column; }
.invite-actions { display: flex; gap: 5px; }
.empty-state { text-align: center; padding: 20px; color: var(--text-muted); }

/* Shared Header */
.shared-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding: 10px 15px;
  background: #e0f2fe;
  border-radius: 8px;
  color: #0369a1;
  border: 1px solid #bae6fd;
}
.header-info-group {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}
.last-sync-badge {
  background: rgba(255, 255, 255, 0.6);
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #0c4a6e;
  border: 1px solid rgba(255, 255, 255, 0.8);
  transition: all 0.2s ease;
}
.last-sync-badge.clickable:hover {
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}
.last-sync-badge.clickable:active {
  transform: translateY(0);
}
.last-sync-badge:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.badge-info { display: flex; align-items: center; gap: 8px; }
.pulse { animation: pulse 2s infinite; }

/* Animations & Responsive */
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
.animate-slide-up { animation: slideUp 0.3s ease-out; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }

/* Admin Mode Indicator */
.admin-indicator {
  margin-top: 10px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 6px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}
.admin-indicator i {
  font-size: 1rem;
  animation: pulse 2s infinite;
}

@media (max-width: 600px) {
  .selection-wrapper { flex-direction: column; align-items: stretch; }
  .select-box { width: 100%; }
  .rename-box { width: 100%; justify-content: flex-end; }
  .d-none-mobile { display: none; }
}

/* Footer button container to match dashboard/archive style */
.share-footer-container { margin-top: 18px; padding: 12px; }
.share-footer-container .buttons-row { display:flex; gap:12px; justify-content:center; width:100%; flex-wrap:nowrap; }
.share-footer-container .buttons-row > * { flex: 0 1 48%; min-width: 0; margin: 0; }

@media (max-width: 420px) {
  .share-footer-container .buttons-row > * { flex: 0 1 46%; }
}
</style>