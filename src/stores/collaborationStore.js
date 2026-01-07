import { defineStore } from 'pinia';
import { supabase } from '../supabase';
import { useAuthStore } from './auth';

export const useCollaborationStore = defineStore('collaboration', {
  state: () => ({
    collaborators: [], // الزملاء الذين قبلوا دعوتي (أنا المشرف عليهم)
    incomingRequests: [], // دعوات وصلتني
    activeSessionId: null, // ID المستخدم الذي أراقبه حالياً (null = أنا)
    activeSessionName: null,
    isLoading: false
  }),

  actions: {
    // 1. جلب الزملاء (الذين قبلوا دعوتي)
    async fetchCollaborators() {
      const auth = useAuthStore();
      if (!auth.user) return;
      
      const { data, error } = await supabase
        .from('collaboration_requests')
        .select(`
          id, receiver_id, role, status,
          receiver:receiver_id ( email ),
          profile:receiver_id ( full_name, user_code )
        `)
        .eq('sender_id', auth.user.id)
        .eq('status', 'accepted');

      if (!error && data) {
        this.collaborators = data.map(item => ({
          userId: item.receiver_id,
          name: item.profile?.full_name || item.receiver?.email,
          code: item.profile?.user_code,
          role: item.role
        }));
      }
    },

    // 2. إرسال دعوة جديدة
    async sendInvite(receiverCode, role = 'editor') {
      const auth = useAuthStore();
      
      // التحقق من أن الكود ليس كودي أنا
      if (receiverCode === auth.user.userCode) throw new Error("لا يمكنك دعوة نفسك");

      const { error } = await supabase.from('collaboration_requests').insert({
        sender_id: auth.user.id,
        receiver_code: receiverCode,
        role: role
      });
      
      if (error) throw error;
      await this.fetchCollaborators(); // تحديث القائمة
    },

    // 3. جلب الدعوات الواردة
    async fetchIncomingRequests() {
      const auth = useAuthStore();
      if (!auth.user?.userCode) return;

      const { data } = await supabase
        .from('collaboration_requests')
        .select(`
          id, sender_id, role, status,
          sender:sender_id ( email ),
          sender_profile:sender_id ( full_name )
        `)
        .eq('receiver_code', auth.user.userCode)
        .eq('status', 'pending');

      this.incomingRequests = data || [];
    },

    // 4. الرد على الدعوة
    async respondToInvite(requestId, status) {
      const auth = useAuthStore();
      
      const updateData = { status };
      // إذا تم القبول، نربط الـ ID الحقيقي للمستخدم
      if (status === 'accepted') {
        updateData.receiver_id = auth.user.id;
      }

      const { error } = await supabase
        .from('collaboration_requests')
        .update(updateData)
        .eq('id', requestId);

      if (!error) {
        // إزالة الطلب من القائمة المحلية
        this.incomingRequests = this.incomingRequests.filter(req => req.id !== requestId);
      }
    },

    // 5. تحديد جلسة العمل الحالية
    setActiveSession(userId, userName) {
      this.activeSessionId = userId; // إذا كان null يعني أنا
      this.activeSessionName = userName;
    }
  }
});