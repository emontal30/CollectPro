import { defineStore } from 'pinia';
import { supabase } from '../supabase';
import { useAuthStore } from './auth';

export const useCollaborationStore = defineStore('collaboration', {
  state: () => ({
    collaborators: [],
    incomingRequests: [],
    activeSessionId: null,
    activeSessionName: null,
    isLoading: false
  }),

  actions: {
    // 1. جلب المتعاونين
    async fetchCollaborators() {
      const auth = useAuthStore();
      if (!auth.user) return;

      const { data: requests, error: reqError } = await supabase
        .from('collaboration_requests')
        .select('receiver_id, role')
        .eq('sender_id', auth.user.id)
        .eq('status', 'accepted');

      if (reqError || !requests) {
        this.collaborators = [];
        return;
      }

      const receiverIds = requests.map(r => r.receiver_id).filter(id => id);
      if (receiverIds.length === 0) {
        this.collaborators = [];
        return;
      }

      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, full_name, user_code')
        .in('id', receiverIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      this.collaborators = requests.map(item => {
        const profile = profilesMap.get(item.receiver_id);
        return {
          userId: item.receiver_id,
          name: profile?.full_name || 'Unknown User',
          code: profile?.user_code,
          role: item.role
        };
      });
    },

    // 2. إرسال دعوة جديدة
    async sendInvite(receiverCode, role = 'editor') {
      const auth = useAuthStore();
      if (receiverCode === auth.user.userCode) {
        throw new Error("لا يمكنك دعوة نفسك.");
      }

      const { error } = await supabase.from('collaboration_requests').insert({
        sender_id: auth.user.id,
        receiver_code: receiverCode,
        role: role
      });

      if (error) throw error;
      await this.fetchCollaborators();
    },

    // 3. جلب الدعوات الواردة
    async fetchIncomingRequests() {
      const auth = useAuthStore();
      if (!auth.user?.userCode) return;

      const { data: requests, error: reqError } = await supabase
        .from('collaboration_requests')
        .select('id, sender_id, role, status')
        .eq('receiver_code', auth.user.userCode)
        .eq('status', 'pending');

      if (reqError || !requests || requests.length === 0) {
        this.incomingRequests = [];
        return;
      }

      const senderIds = requests.map(r => r.sender_id).filter(id => id);
      if (senderIds.length === 0) {
        this.incomingRequests = requests;
        return;
      }

      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', senderIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      this.incomingRequests = requests.map(req => ({
        ...req,
        sender_profile: profilesMap.get(req.sender_id) || { full_name: 'Unknown User' }
      }));
    },

    // 4. الرد على الدعوة
    async respondToInvite(requestId, status) {
      const auth = useAuthStore();
      const updateData = { status };

      if (status === 'accepted') {
        updateData.receiver_id = auth.user.id;
      }

      const { error } = await supabase
        .from('collaboration_requests')
        .update(updateData)
        .eq('id', requestId);

      if (!error) {
        this.incomingRequests = this.incomingRequests.filter(req => req.id !== requestId);
      }
    },

    // 5. تعيين جلسة العمل النشطة
    setActiveSession(userId, userName) {
      this.activeSessionId = userId;
      this.activeSessionName = userName;
    }
  }
});