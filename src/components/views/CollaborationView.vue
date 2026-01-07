<template>
  <div class="collaboration-view">
    <PageHeader 
      :title="title" 
      :icon="icon" 
      :subtitle="subtitle" 
    />

    <div class="tabs">
      <button 
        @click="activeTab = 'team'" 
        :class="{ 'active': activeTab === 'team' }"
      >
        <i class="fas fa-users"></i> فريقي
      </button>
      
      <button 
        @click="activeTab = 'invites'" 
        :class="{ 'active': activeTab === 'invites' }"
        class="relative"
      >
        <i class="fas fa-envelope"></i> الدعوات الواردة
        <span v-if="collabStore.incomingRequests.length" class="badge">
          {{ collabStore.incomingRequests.length }}
        </span>
      </button>
    </div>

    <div v-if="activeTab === 'team'" class="team-section animate-fade-in">
      <div class="card add-box">
        <h3 class="card-header">إضافة زميل جديد</h3>
        <div class="card-body">
          <div class="form-group">
            <input 
              v-model="inviteCode" 
              placeholder="أدخل كود الزميل (مثال: EMP-123)" 
              class="form-control"
            />
            <select v-model="inviteRole" class="form-select">
              <option value="editor">محرر</option>
              <option value="viewer">مشاهد</option>
            </select>
            <button 
              @click="handleSendInvite" 
              class="btn btn-primary" 
              :disabled="!inviteCode"
            >
              <i class="fas fa-paper-plane"></i> إرسال
            </button>
          </div>
        </div>
      </div>

      <div v-if="collabStore.collaborators.length === 0" class="empty-state">
        لا يوجد زملاء مضافين حالياً
      </div>
      
      <div v-else class="grid">
        <div 
          v-for="collab in collabStore.collaborators" 
          :key="collab.userId" 
          class="card collab-card"
        >
          <div class="collab-info">
            <div class="collab-name">{{ collab.name }}</div>
            <div class="collab-code">{{ collab.code }}</div>
          </div>
          <div class="collab-actions">
            <span class="badge" :class="collab.role === 'editor' ? 'badge-warning' : 'badge-info'">
              {{ collab.role === 'editor' ? 'محرر' : 'مشاهد' }}
            </span>
            <button @click="watchUser(collab)" class="btn btn-sm btn-outline-primary">
              <i class="fas fa-eye"></i> عرض التحصيل
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'invites'" class="invites-section animate-fade-in">
      <div v-if="collabStore.incomingRequests.length === 0" class="empty-state">
        لا توجد دعوات جديدة
      </div>
      <div v-else class="grid">
        <div 
          v-for="req in collabStore.incomingRequests" 
          :key="req.id" 
          class="card invite-card"
        >
          <p>
            <strong>{{ req.sender_profile?.full_name || 'مستخدم' }}</strong> يدعوك للمشاركة كـ 
            <span class="font-bold">{{ req.role === 'editor' ? 'محرر' : 'مشاهد' }}</span>.
          </p>
          <div class="actions">
            <button @click="collabStore.respondToInvite(req.id, 'rejected')" class="btn btn-outline-danger">
              رفض
            </button>
            <button @click="collabStore.respondToInvite(req.id, 'accepted')" class="btn btn-success">
              قبول
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue';
import { useRouter } from 'vue-router';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useHarvestStore } from '@/stores/harvest';
import PageHeader from '@/components/layout/PageHeader.vue';

const props = defineProps({
  title: { type: String, default: 'المشاركة والتعاون' },
  icon: { type: String, default: '🤝' },
  subtitle: { type: String, default: 'إدارة فريق العمل والمشاركة الحية' },
  itemType: { 
    type: String, 
    default: 'harvest',
    validator: (value) => ['harvest', 'collection'].includes(value)
  }
});

const collabStore = useCollaborationStore();
const harvestStore = useHarvestStore();
const router = useRouter();
const { addNotification } = inject('notifications');

const activeTab = ref('team');
const inviteCode = ref('');
const inviteRole = ref('editor');

onMounted(() => {
  collabStore.fetchCollaborators();
  collabStore.fetchIncomingRequests();
});

const handleSendInvite = async () => {
  try {
    await collabStore.sendInvite(inviteCode.value, inviteRole.value);
    addNotification('تم إرسال الدعوة بنجاح', 'success');
    inviteCode.value = '';
  } catch (err) {
    addNotification(err.message || 'حدث خطأ أثناء إرسال الدعوة', 'error');
  }
};

const watchUser = (collab) => {
  // 1. تحديد الجلسة في ستور التعاون
  collabStore.setActiveSession(collab.userId, collab.name);
  
  // 2. تبديل البيانات في ستور التحصيل (إذا كانت الدالة متوفرة)
  if (harvestStore.switchToUserSession) {
    harvestStore.switchToUserSession(collab.userId);
  }
  
  // 3. التوجيه للصفحة المناسبة
  const route = props.itemType === 'harvest' ? '/app/harvest' : '/app/collection';
  router.push(route);
  
  addNotification(`أنت الآن تشاهد بيانات ${collab.name}`, 'info');
};
</script>

<style scoped>
.collaboration-view { padding: 1rem; }
.tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); }
.tabs button { padding: 0.75rem 1rem; border: none; background: transparent; cursor: pointer; font-size: 1rem; position: relative; color: var(--text-muted); transition: all 0.3s; }
.tabs button.active { color: var(--primary); border-bottom: 2px solid var(--primary); font-weight: bold; }
.badge { background-color: #dc3545; color: white; border-radius: 50%; padding: 2px 6px; font-size: 0.7rem; position: absolute; top: 5px; left: 5px; }
.card { background-color: var(--surface-bg, #fff); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05); overflow: hidden; }
.card-header { font-size: 1.1rem; font-weight: bold; padding: 1rem; border-bottom: 1px solid var(--border-color); background: rgba(0,0,0,0.02); }
.card-body { padding: 1rem; }
.form-group { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.form-control, .form-select {
  padding: 8px;
  border: 1px solid var(--input-border, var(--border-color));
  border-radius: 8px;
  flex: 1;
  background-color: var(--input-bg);
  color: var(--input-text);
  transition: var(--transition, 0.2s ease);
}
.form-control::placeholder { color: var(--input-placeholder); }
.empty-state { text-align: center; padding: 2rem; color: var(--text-muted); }
.grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
.collab-card { display: flex; flex-direction: column; padding: 1rem; gap: 1rem; }
.collab-info { display: flex; justify-content: space-between; align-items: center; }
.collab-name { font-weight: bold; }
.collab-code { font-family: monospace; color: var(--text-muted); background: rgba(0,0,0,0.05); padding: 2px 5px; border-radius: 4px; }
.collab-actions { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 10px; }
.invite-card { padding: 1rem; }
.invite-card .actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
.animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>