import { defineStore } from 'pinia';
import { supabase } from '../supabase';
import { useAuthStore } from './auth';

export const useCollaborationStore = defineStore('collaboration', {
  state: () => ({
    collaborators: [],
    incomingRequests: [],

    // 1. استعادة الجلسة النشطة مباشرة من التخزين المحلي لضمان بقائها عند التحديث
    activeSessionId: localStorage.getItem('collab_active_session_id') || null,
    activeSessionName: localStorage.getItem('collab_active_session_name') || null,

    realtimeChannel: null,

    isLoading: false,

    // الأسماء المستعارة
    aliases: JSON.parse(localStorage.getItem('collab_aliases') || '{}'),

    // 2. تخزين "المستخدمين الأشباح" (Ghost Users) الذين يضيفهم الأدمن محلياً
    localGhostUsers: JSON.parse(localStorage.getItem('collab_ghost_users') || '[]')
  }),

  actions: {
    // دالة مساعدة لدمج مستخدمي السيرفر مع المحليين وتحديث القائمة
    refreshCollaboratorsList(serverUsers = null) {
      // نبدأ بالقائمة القادمة من السيرفر، أو نأخذ الموجودين حالياً (غير المحليين) إذا لم نمرر جديد
      let currentList = serverUsers ? [...serverUsers] : [...this.collaborators.filter(c => !c.isLocal)];

      // استخراج المعرفات الموجودة لتجنب التكرار
      const serverIds = new Set(currentList.map(u => u.userId));

      // إضافة المستخدمين المحليين (Ghost Users) إذا لم يكونوا موجودين في قائمة السيرفر
      this.localGhostUsers.forEach(ghost => {
        if (!serverIds.has(ghost.userId)) {
          const displayName = this.aliases[ghost.userId] || ghost.name;
          currentList.push({ ...ghost, displayName, isLocal: true });
        }
      });

      // تحديث الأسماء المستعارة للكل
      this.collaborators = currentList.map(user => ({
        ...user,
        displayName: this.aliases[user.userId] || user.name
      }));
    },

    setAlias(userId, newName) {
      this.aliases[userId] = newName;
      localStorage.setItem('collab_aliases', JSON.stringify(this.aliases));
      this.refreshCollaboratorsList(); // تحديث القائمة لتطبيق الاسم الجديد
    },

    async fetchCollaborators() {
      const auth = useAuthStore();
      if (!auth.user) return;

      const { data: requests, error: reqError } = await supabase
        .from('collaboration_requests')
        .select('receiver_id, role')
        .eq('sender_id', auth.user.id)
        .eq('status', 'accepted');

      let serverUsers = [];

      if (!reqError && requests && requests.length > 0) {
        const receiverIds = requests.map(r => r.receiver_id).filter(id => id);

        if (receiverIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, user_code')
            .in('id', receiverIds);

          const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

          serverUsers = requests.map(item => {
            const profile = profilesMap.get(item.receiver_id);
            const originalName = profile?.full_name || 'مستخدم غير معروف';

            return {
              userId: item.receiver_id,
              name: originalName,
              // displayName سيتم ضبطه في refreshCollaboratorsList
              code: profile?.user_code,
              role: item.role,
              isLocal: false
            };
          });
        }
      }

      // دمج القوائم
      this.refreshCollaboratorsList(serverUsers);
    },

    async sendInvite(receiverCode, role = 'editor') {
      const auth = useAuthStore();

      if (!auth.user) throw new Error("يجب تسجيل الدخول أولاً.");
      if (receiverCode === auth.user.userCode) throw new Error("لا يمكنك دعوة نفسك.");

      // التحقق في القائمة المدمجة الحالية
      const existing = this.collaborators.find(c => c.code === receiverCode);
      if (existing) {
        this.setActiveSession(existing.userId, existing.displayName);
        return existing.userId;
      }

      // --- وضع الأدمن (Ghost Mode) ---
      if (auth.isAdmin) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, full_name, user_code')
          .eq('user_code', receiverCode)
          .single();

        if (error || !profile) throw new Error("كود المستخدم غير صحيح أو غير موجود.");

        const originalName = profile.full_name || 'مستخدم';
        const displayName = this.aliases[profile.id] || originalName;

        const ghostUser = {
          userId: profile.id,
          name: originalName,
          displayName: displayName,
          code: profile.user_code,
          role: role,
          isLocal: true // تمييزه كمستخدم محلي
        };

        // 1. حفظه في LocalStorage لضمان بقائه في القائمة المنسدلة
        this.localGhostUsers.push(ghostUser);
        localStorage.setItem('collab_ghost_users', JSON.stringify(this.localGhostUsers));

        // 2. تحديث القائمة الحالية
        this.refreshCollaboratorsList();

        // 3. تفعيل الجلسة
        this.setActiveSession(profile.id, displayName);

        return profile.id;
      }

      // --- الوضع العادي ---
      const { error } = await supabase.from('collaboration_requests').insert({
        sender_id: auth.user.id,
        receiver_code: receiverCode,
        role: role
      });

      if (error) throw error;

      await this.fetchCollaborators();
      return null;
    },

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
        // If accepted, we might want to refresh to ensure everything is synced, 
        // though the realtime listener should handle the sender side.
        if (status === 'accepted') {
          await this.fetchCollaborators(); // Refresh my list (unlikely to change here but for safety)
        }
      }
    },

    setActiveSession(userId, userName) {
      this.activeSessionId = userId;
      this.activeSessionName = userName;

      // 3. حفظ الجلسة في التخزين المحلي
      if (userId) {
        localStorage.setItem('collab_active_session_id', userId);
        localStorage.setItem('collab_active_session_name', userName);
      } else {
        localStorage.removeItem('collab_active_session_id');
        localStorage.removeItem('collab_active_session_name');
      }
    },

    // --- Real-time Subscription ---
    subscribeToRequests() {
      const auth = useAuthStore();
      if (!auth.user) return;

      if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel);
      }

      this.realtimeChannel = supabase
        .channel('collab-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'collaboration_requests',
            filter: `receiver_code=eq.${auth.user.userCode}`
          },
          async (payload) => {
            // New invite for me
            if (payload.new && payload.new.status === 'pending') {
              // Fetch details to get name
              const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', payload.new.sender_id).single();
              const newReq = {
                ...payload.new,
                sender_profile: { full_name: profile?.full_name || 'مستخدم' }
              };
              this.incomingRequests.push(newReq);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'collaboration_requests',
            filter: `sender_id=eq.${auth.user.id}`
          },
          (payload) => {
            // My invite was accepted/rejected
            if (payload.new && payload.new.status === 'accepted') {
              this.fetchCollaborators(); // Reload list to show the new person
            }
          }
        )
        .subscribe();
    },

    unsubscribeFromRequests() {
      if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
      }
    },

    async revokeInvite(userId) {
      if (!userId) return;
      const auth = useAuthStore();

      // We need to find the request associated with this user
      // Since our collaborations list is derived, we might need to query first or update assuming we know the structure.
      // Optimally, we update based on sender_id (me) and receiver_id (them).

      const { error } = await supabase
        .from('collaboration_requests')
        .delete() // Deleting is cleaner than just marking revoked for this simple use case, allows re-invite easily
        .match({ sender_id: auth.user.id, receiver_id: userId });

      if (error) throw error;

      await this.fetchCollaborators();

      // If we were viewing this user, close the session
      if (this.activeSessionId === userId) {
        this.setActiveSession(null, null);
      }
    }
  }
});