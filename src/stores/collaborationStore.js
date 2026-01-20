import { defineStore } from 'pinia';
import { supabase } from '../supabase';
import { useAuthStore } from './auth';
import logger from '@/utils/logger.js';

export const useCollaborationStore = defineStore('collaboration', {
  state: () => ({
    collaborators: [],
    incomingRequests: [],

    // 1. استعادة الجلسة النشطة مباشرة من التخزين المحلي لضمان بقائها عند التحديث
    activeSessionId: localStorage.getItem('collab_active_session_id') || null,
    activeSessionName: localStorage.getItem('collab_active_session_name') || null,

    realtimeChannel: null,
    pgNotifyChannel: null, // قناة للإشعارات الفورية من PostgreSQL

    isLoading: false,

    // الأسماء المستعارة
    aliases: JSON.parse(localStorage.getItem('collab_aliases') || '{}'),

    // 2. تخزين "المستخدمين الأشباح" (Ghost Users) الذين يضيفهم الأدمن محلياً
    localGhostUsers: JSON.parse(localStorage.getItem('collab_ghost_users') || '[]'),

    // 3. معرف جلسة الأدمن النشطة ومؤقت الـ ping
    activeAdminSessionId: null,
    adminSessionPingInterval: null
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

        // 3. تفعيل الجلسة (بدون تسجيل في قاعدة البيانات)
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

      if (profError) {
        logger.error('❌ Error fetching sender profiles:', profError);
      }

      logger.info('📋 Fetched profiles:', profiles);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      this.incomingRequests = requests.map(req => {
        const profile = profilesMap.get(req.sender_id);
        const displayName = profile?.full_name || 'مستخدم';

        logger.info(`👤 Sender ${req.sender_id}: ${displayName}`);

        return {
          ...req,
          sender_profile: {
            full_name: displayName
          }
        };
      });
    },

    async respondToInvite(requestId, status) {
      const auth = useAuthStore();

      if (!auth.user) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }

      const updateData = { status };

      if (status === 'accepted') {
        updateData.receiver_id = auth.user.id;
      }

      logger.info(`📨 Responding to invitation ${requestId} with status: ${status}`);

      const { error } = await supabase
        .from('collaboration_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) {
        logger.error('❌ Failed to respond to invitation:', error);
        throw error;
      }

      logger.info('✅ Successfully responded to invitation');

      // Remove from incoming requests immediately
      this.incomingRequests = this.incomingRequests.filter(req => req.id !== requestId);

      // If accepted, refresh collaborators list (but don't wait indefinitely)
      if (status === 'accepted') {
        try {
          logger.info('🔄 Refreshing collaborators list...');
          await Promise.race([
            this.fetchCollaborators(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]);
          logger.info('✅ Collaborators list refreshed');
        } catch (err) {
          logger.warn('⚠️ Failed to refresh collaborators (non-critical):', err.message);
          // Don't throw - the realtime listener will eventually sync
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
      if (!auth.user || !auth.user.userCode) {
        logger.warn('🚫 Cannot subscribe to requests: Missing user or userCode');
        return;
      }

      if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel);
      }

      logger.info(`🔌 Subscribing to collaboration requests for code: ${auth.user.userCode}`);

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
            logger.info('🔔 New collaboration request received vi Realtime:', payload);
            // New invite for me
            if (payload.new && payload.new.status === 'pending') {
              // Fetch details to get name
              const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', payload.new.sender_id).single();
              const newReq = {
                ...payload.new,
                sender_profile: { full_name: profile?.full_name || 'مستخدم' }
              };
              // Avoid duplicates
              if (!this.incomingRequests.find(r => r.id === newReq.id)) {
                this.incomingRequests.push(newReq);
                // Trigger a notification via event bus or similar if possible, 
                // but for now the store update reacts in the UI
              }
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
            logger.info('🔔 Collaboration status update received:', payload);
            // My invite was accepted/rejected
            if (payload.new && payload.new.status === 'accepted') {
              this.fetchCollaborators(); // Reload list to show the new person
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.info('✅ Collaboration Realtime Channel Subscribed!');
          } else if (status === 'CHANNEL_ERROR') {
            logger.error('❌ Collaboration Realtime Channel Error');
          }
        });

      // الاستماع لإشعارات PostgreSQL الفورية
      this.subscribeToPgNotifications();
    },

    // دالة جديدة: الاستماع لإشعارات PostgreSQL
    subscribeToPgNotifications() {
      const auth = useAuthStore();
      if (!auth.user) return;

      if (this.pgNotifyChannel) {
        supabase.removeChannel(this.pgNotifyChannel);
      }

      this.pgNotifyChannel = supabase
        .channel('pg-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'collaboration_requests'
          },
          async (payload) => {
            // معالجة الإشعارات الفورية للدعوات
            if (payload.eventType === 'INSERT' && payload.new?.receiver_code === auth.user.userCode) {
              // دعوة جديدة - تحديث القائمة فوراً
              await this.fetchIncomingRequests();
              logger.info('New invitation received instantly via trigger');
            } else if (payload.eventType === 'UPDATE' && payload.new?.sender_id === auth.user.id) {
              // استجابة على دعوتي - تحديث المتعاونين فوراً
              await this.fetchCollaborators();
              logger.info('Invitation response received instantly via trigger');
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

      if (this.pgNotifyChannel) {
        supabase.removeChannel(this.pgNotifyChannel);
        this.pgNotifyChannel = null;
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

      // إيقاف جلسة الأدمن إذا كانت نشطة
      await this.stopAdminGhostSession();
    }
  }
});