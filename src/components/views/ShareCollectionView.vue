<template>
  <div class="share-page p-4">
    <PageHeader title="مشاركة التحصيل" icon="🤝" subtitle="إدارة فريق العمل والمشاركة الحية" />

    <div class="tabs-container mb-4 flex gap-2">
      <button 
        @click="activeTab = 'team'" 
        class="btn" 
        :class="activeTab === 'team' ? 'btn-primary' : 'btn-outline-secondary'"
      >
        <i class="fas fa-users"></i> فريقي
      </button>
      <button 
        @click="activeTab = 'invites'" 
        class="btn relative"
        :class="activeTab === 'invites' ? 'btn-primary' : 'btn-outline-secondary'"
      >
        <i class="fas fa-envelope"></i> الدعوات الواردة
        <span v-if="collabStore.incomingRequests.length" class="badge-count">{{ collabStore.incomingRequests.length }}</span>
      </button>
    </div>

    <div v-if="activeTab === 'team'" class="team-section animate-fade-in">
      
      <div class="add-box bg-white p-4 rounded shadow-sm mb-4 border">
        <h3 class="text-md font-bold mb-2">إضافة زميل جديد</h3>
        <div class="flex gap-2">
          <input 
            v-model="inviteCode" 
            placeholder="أدخل كود الزميل (مثال: EMP-123)" 
            class="form-control flex-1"
          />
          <select v-model="inviteRole" class="form-select w-32">
            <option value="editor">محرر</option>
            <option value="viewer">مشاهد</option>
          </select>
          <button @click="handleSendInvite" class="btn btn-primary" :disabled="!inviteCode">
            <i class="fas fa-paper-plane"></i> إرسال
          </button>
        </div>
      </div>

      <div v-if="collabStore.collaborators.length === 0" class="text-center text-muted py-8">
        لا يوجد زملاء مضافين حالياً
      </div>
      
      <div v-else class="grid gap-3">
        <div v-for="collab in collabStore.collaborators" :key="collab.userId" class="collab-card flex justify-between items-center bg-white p-3 rounded shadow-sm border-r-4 border-green-500">
          <div>
            <div class="font-bold text-lg">{{ collab.name }}</div>
            <div class="text-sm text-muted font-mono">{{ collab.code }}</div>
          </div>
          <div class="flex items-center gap-3">
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
      <div v-if="collabStore.incomingRequests.length === 0" class="text-center text-muted py-8">
        لا توجد دعوات جديدة
      </div>
      <div v-else class="grid gap-3">
        <div v-for="req in collabStore.incomingRequests" :key="req.id" class="invite-card bg-white p-4 rounded shadow-sm border border-yellow-200">
          <p class="mb-3">
            قام <strong>{{ req.sender_profile?.full_name || 'مستخدم' }}</strong> بدعوتك للمشاركة كـ 
            <span class="font-bold">{{ req.role === 'editor' ? 'محرر' : 'مشاهد' }}</span>
          </p>
          <div class="flex gap-2 justify-end">
            <button @click="collabStore.respondToInvite(req.id, 'rejected')" class="btn btn-outline-danger">رفض</button>
            <button @click="collabStore.respondToInvite(req.id, 'accepted')" class="btn btn-success text-white">قبول</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useHarvestStore } from '@/stores/harvest';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/layout/PageHeader.vue';
import { inject } from 'vue';

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
    addNotification(err.message, 'error');
  }
};

const watchUser = (collab) => {
  // 1. تحديد المستخدم النشط
  collabStore.setActiveSession(collab.userId, collab.name);
  // 2. تفعيل المزامنة في الستور
  harvestStore.switchToUserSession(collab.userId);
  // 3. الذهاب لصفحة الجدول
  router.push('/app/harvest');
  addNotification(`أنت الآن تشاهد تحصيلات ${collab.name}`, 'info');
};
</script>

<style scoped>
.badge-count { background: red; color: white; border-radius: 50%; padding: 2px 6px; font-size: 0.7rem; position: absolute; top: -5px; left: -5px; }
.collab-card { transition: transform 0.2s; }
.collab-card:hover { transform: translateY(-2px); }
</style>