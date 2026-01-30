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
          v-if="isAdmin" 
          class="tab-btn"
          :class="{ active: activeTab === 'admin' }"
          @click="activeTab = 'admin'"
        >
          <i class="fas fa-user-shield"></i> وضع الأدمن
        </button>
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
        <div v-show="activeTab === 'admin' && isAdmin" class="admin-tab animate-fade-in">
          <div class="control-row admin-section">
            <div class="admin-main-controls">
              <label class="amc-label">
                <i class="fas fa-user-shield"></i>
                أدخل كود المستخدم للمزامنه او عرض الارشيف
              </label>
              
              <div class="amc-input-wrapper">
                <input 
                  v-model="adminTargetUid" 
                  type="text" 
                  placeholder="أدخل كود المستخدم (مثال: EMP-cf2757)" 
                  class="amc-input"
                  @keyup.enter="handleEnterKey"
                />
              </div>
              
              <div class="amc-buttons">
                <button 
                  class="amc-btn amc-btn-sync" 
                  :class="{ 'active': collabStore.adminViewMode === 'sync' && (collabStore.activeSessionId || collabStore.isRemoteArchiveMode) }"
                  :disabled="!adminTargetUid || isSyncLoading" 
                  @click="handleAdminOpenWithRefresh()"
                >
                  <i v-if="!isSyncLoading" class="fas fa-bolt"></i>
                  <i v-else class="fas fa-spinner fa-spin"></i>
                  <span>مزامنة</span>
                </button>
                <button 
                  class="amc-btn amc-btn-archive" 
                  :class="{ 'active': collabStore.adminViewMode === 'archive' && (collabStore.activeSessionId || collabStore.isRemoteArchiveMode) }"
                  :disabled="!adminTargetUid || isArchiveLoading" 
                  @click="handleViewArchiveWithRefresh()"
                >
                  <i v-if="!isArchiveLoading" class="fas fa-history"></i>
                  <i v-else class="fas fa-spinner fa-spin"></i>
                  <span>الأرشيف</span>
                </button>
              </div>
            </div>

            <!-- مؤشر الوضع الحالي -->
            <div v-if="adminTargetUid" class="mode-indicator mb-3 animate-fade-in">
              <!-- إذا لم يتم الدخول بعد (لا توجد جلسة نشطة)، نعرض رسالة الاختيار -->
              <span v-if="!collabStore.activeSessionId && !collabStore.isRemoteArchiveMode" class="badge badge-prompt">
                <i class="fas fa-hand-pointer"></i> برجاء الاختيار بين وضع المزامنة أو وضع عرض الأرشيف
              </span>
              <!-- إذا كان في وضع المزامنة -->
              <span v-else-if="collabStore.adminViewMode === 'sync' && collabStore.activeSessionId" class="badge badge-sync">
                <i class="fas fa-bolt pulse"></i> وضع المزامنة الحية نشط
              </span>
              <!-- إذا كان في وضع الأرشيف -->
              <span v-else-if="collabStore.adminViewMode === 'archive' && collabStore.isRemoteArchiveMode" class="badge badge-archive">
                <i class="fas fa-history"></i> وضع عرض الأرشيف نشط
              </span>
            </div>

            <!-- السجل (History) - قائمة منسدلة سريعة + زر إدارة -->
            <div v-if="collabStore.adminHistory.length > 0" class="history-card-container mt-4">
              <div class="hcc-header">
                <div class="hcc-title-group">
                  <div class="hcc-icon">
                    <i class="fas fa-history"></i>
                  </div>
                  <h3 class="hcc-title">شوهد مؤخراً</h3>
                </div>
                <button class="hcc-manage-btn" @click="showHistoryManager = !showHistoryManager">
                  <i class="fas" :class="showHistoryManager ? 'fa-times' : 'fa-cog'"></i>
                  {{ showHistoryManager ? 'إغلاق' : 'إدارة' }}
                </button>
              </div>

              <!-- القائمة المنسدلة (الحل المطلوب) -->
              <select v-if="!showHistoryManager" class="hcc-select" @change="handleHistorySelect">
                <option value="">— اختر مستخدم من السجل —</option>
                <option v-for="item in collabStore.adminHistory" :key="item.userId" :value="item.userId">
                  👤 {{ item.name }} ({{ item.code }})
                </option>
              </select>
              
              <!-- واجهة الإدارة (تعديل/حذف) تظهر عند الطلب فقط -->
              <div v-if="showHistoryManager" class="hcc-manage-list animate-slide-up">
                <div v-for="item in collabStore.adminHistory" :key="item.userId" class="hcc-item">
                  <div class="hcc-item-info" @click="quickOpenFromHistory(item)">
                    <div class="hcc-item-avatar">
                      <i class="fas fa-user"></i>
                    </div>
                    <div class="hcc-item-details">
                      <span class="hcc-item-name">{{ item.name }}</span>
                      <span class="hcc-item-code">{{ item.code }}</span>
                    </div>
                  </div>
                  <div class="hcc-item-actions">
                    <button class="hcc-action-btn edit" title="تعديل الاسم" @click.stop="editHistoryItem(item)">
                      <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="hcc-action-btn delete" title="حذف من السجل" @click.stop="deleteHistoryItem(item.userId)">
                      <i class="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- قائمة تواريخ الأرشيف -->
            <div v-if="collabStore.remoteArchiveDates.length > 0 && collabStore.adminViewMode === 'archive'" class="archive-dates-card mt-3 animate-fade-in">
              <div class="adc-header">
                <div class="adc-icon">
                  <i class="fas fa-calendar-alt"></i>
                </div>
                <h3 class="adc-title">سجلات الأرشيف المتوفرة</h3>
              </div>
              
              <select v-model="selectedArchiveDate" class="adc-select" @change="handleDateSelect">
                <option :value="null">— اختر التاريخ للعرض —</option>
                <option v-for="date in collabStore.remoteArchiveDates" :key="date" :value="date">
                  📅 {{ date }}
                </option>
              </select>
            </div>
          </div>
        </div>

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
                placeholder="كود الزميل (مثال: EMP-cf2757)" 
                class="form-control code-input"
              />
              <button class="btn btn-primary" :disabled="!newCollabCode || isLoading" @click="sendInviteWithRefresh">
                <i v-if="!isLoading" class="fas fa-paper-plane"></i>
                <i v-else class="fas fa-spinner fa-spin"></i>
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
                  <option :value="null">-- اختر زميلاً (إيقاف المزامنة) --</option>
                  <option v-for="collab in manageableCollaborators" :key="collab.userId" :value="collab.userId">
                    {{ collab.displayName }} | {{ collab.userEmail }} | {{ collab.userCode }} ({{ collab.role === 'editor' ? 'محرر' : 'مشاهد' }})
                  </option>
                </select>
                
                <button 
                  v-if="selectedCollaboratorId && !currentResultIsGhost" 
                  class="btn btn-danger btn-sm ml-2" 
                  title="إلغاء الصلاحية (حذف)" 
                  @click="handleRevoke"
                >
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>

              <div v-if="selectedCollaboratorId" class="rename-box">
                <div v-if="!isEditingName">
                  <button class="btn-icon" title="تغيير الاسم المستعار" @click="startEditingName">
                    <i class="fas fa-pen"></i>
                  </button>
                </div>
                <div v-else class="edit-group">
                  <input 
                    ref="nameInput" 
                    v-model="tempName" 
                    type="text" 
                    class="form-control sm-input"
                    placeholder="اسم مستعار"
                    @keyup.enter="saveName"
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
            <div class="invites-controls mb-3 text-start">
              <button class="btn btn-outline-danger btn-sm" title="حذف كافة الدعوات المعلقة" @click="handleClearAllInvites">
                <i class="fas fa-trash-alt me-1"></i> تنظيف كافة الدعوات
              </button>
            </div>
            
            <div v-for="req in collabStore.incomingRequests" :key="req.id" class="invite-item">
              <div class="invite-header">
                <div class="invite-sender-info">
                  <i class="fas fa-user-circle invite-avatar"></i>
                  <div class="sender-details">
                    <strong class="sender-name">{{ req.sender_profile?.full_name || 'مستخدم' }}</strong>
                    <div class="sender-meta">
                      <span class="sender-code text-xs">{{ req.sender_code || '---' }}</span>
                      <span class="sender-email text-xs text-muted">{{ req.sender_email }}</span>
                    </div>
                  </div>
                </div>
                <div class="invite-role-selector">
                  <select 
                    v-model="req.selectedRole" 
                    class="role-select"
                    :title="`تحديد الدور: ${req.role === 'editor' ? 'محرر (تعديل)' : 'مشاهد (قراءة فقط)'}`"
                  >
                    <option value="editor">📝 محرر (تعديل)</option>
                    <option value="viewer">👁️ مشاهد (قراءة فقط)</option>
                  </select>
                </div>
              </div>
              
              <div class="invite-actions">
                <template v-if="req.isAccepted">
                  <div class="activation-badge text-success">
                    <i class="fas fa-check-circle fa-lg"></i>
                    <span class="ms-1 fw-bold">تم التفعيل ✅</span>
                  </div>
                </template>
                <template v-else>
                  <button 
                    class="btn btn-sm btn-success" 
                    :title="`قبول الدعوة كـ ${req.selectedRole === 'editor' ? 'محرر' : 'مشاهد'}`"
                    @click="handleRespond(req.id, 'accepted', req.selectedRole)"
                  >
                    <i class="fas fa-check"></i> قبول
                  </button>
                  <button class="btn btn-sm btn-outline-danger" title="حذف الدعوة ورفضها" @click="handleRespond(req.id, 'rejected')">
                    <i class="fas fa-trash-alt"></i> حذف / رفض
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <div v-if="shouldShowTable" class="shared-harvest-container animate-slide-up">
      <div class="shared-header" :class="{ 'archive-header': collabStore.isRemoteArchiveMode }">
        <div class="header-info-group">
          <div class="badge-info">
            <template v-if="collabStore.isRemoteArchiveMode">
              <div class="archive-header-content animate-fade-in">
                <div class="ah-main-info">
                  <i class="fas fa-history ah-icon-glow pulse-blue"></i>
                  <div class="ah-user-stack">
                    <span class="ah-name">{{ activeCollaboratorName }}</span>
                    <span class="ah-code">{{ activeCollaboratorCode }}</span>
                  </div>
                </div>
                
                <div class="ah-date-info">
                  <span class="ah-separator">|</span>
                  <div class="ah-date-stack">
                    <span class="ah-label">تاريخ الأرشيف</span>
                    <span class="ah-badge ah-badge-date" :class="{ 'waiting': !collabStore.selectedArchiveDate }">
                      {{ collabStore.selectedArchiveDate || 'بانتظار الاختيار...' }}
                    </span>
                  </div>
                </div>

                <div class="ah-status-info d-none-mobile">
                  <span class="ah-separator">|</span>
                  <div class="ah-date-stack">
                    <span class="ah-label">الوضع</span>
                    <span class="ah-badge ah-badge-readonly">للقراءة فقط 📖</span>
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="live-header-content animate-fade-in">
                <div class="lh-main-info">
                  <div class="lh-icon-wrapper pulse">
                    <i class="fas fa-eye"></i>
                  </div>
                  <div class="lh-user-stack">
                    <span class="lh-name">{{ activeCollaboratorName }}</span>
                    <span class="lh-code">{{ activeCollaboratorCode }}</span>
                  </div>
                </div>

                <div v-if="lastUpdatedText" class="lh-sync-info">
                  <span class="lh-separator">|</span>
                  <div class="lh-date-stack">
                    <span class="lh-label">آخر تحديث</span>
                    <div class="lh-badge-group">
                      <span class="lh-badge lh-badge-time">
                        <i class="far fa-clock"></i> {{ lastUpdatedText }}
                      </span>
                      <button 
                        class="lh-refresh-btn" 
                        title="تحديث البيانات" 
                        :disabled="harvestStore.isSharedLoading"
                        @click="refreshSharedSession"
                      >
                        <i class="fas fa-sync-alt" :class="{ 'fa-spin': harvestStore.isSharedLoading }"></i>
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="collabStore.sessionType === 'admin'" class="lh-status-info">
                  <span class="lh-separator">|</span>
                  <div class="lh-date-stack">
                    <span class="lh-label">الوضع</span>
                    <span class="lh-badge lh-badge-admin">أدمن صامت ⚡</span>
                  </div>
                </div>
              </div>
            </template>
          </div>
          

          </div>
        <button class="btn btn-danger btn-sm" @click="closeSession">
          <i class="fas fa-times"></i> إغلاق
        </button>
      </div>

      <HarvestView :is-shared-view="true" />
    </div>

    <div v-else-if="activeTab !== 'invites'" class="placeholder-container">
      <div class="placeholder-content">
        <i class="fas" :class="activeTab === 'admin' ? 'fa-user-shield' : 'fa-table'" style="font-size: 3rem; color: #cbd5e0; opacity: 0.5;"></i>
        <p v-if="activeTab === 'admin'" class="mt-3 text-muted">أدخل كود المستخدم أعلاه للبدء في المتابعة أو عرض الأرشيف.</p>
        <p v-else class="mt-3 text-muted">اختر زميلاً من القائمة أعلاه لعرض الجدول الخاص به هنا.</p>
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
import { useShareHarvestView } from '@/composables/useShareHarvestView';
import HarvestView from './HarvestView.vue';
import PageHeader from '@/components/layout/PageHeader.vue';

const {
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
  handleAdminOpenWithRefresh,
  sendInvite,
  sendInviteWithRefresh,
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
  handleViewArchiveWithRefresh,
  handleDateSelect,
  refreshSharedSession,
  startEditingName,
  saveName,
  cancelEditName,
  currentResultIsGhost,
  handleRevoke,
  shouldShowTable,
  manageableCollaborators
} = useShareHarvestView();
</script>

<style scoped>
@import url('@/assets/css/share_harvest_view.css');
</style>