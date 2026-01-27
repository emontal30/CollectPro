import { defineStore } from 'pinia';
import { supabase } from '../supabase';
import { useAuthStore } from './auth';
import logger from '@/utils/logger.js';
import { archiveService } from '@/services/archiveService';
import { withTimeout } from '@/utils/promiseUtils';

export const useCollaborationStore = defineStore('collaboration', {
  state: () => ({
    collaborators: [],
    incomingRequests: [],

    // 1. استعادة الجلسة النشطة مباشرة من التخزين المحلي لضمان بقائها عند التحديث
    activeSessionId: localStorage.getItem('collab_active_session_id') || null,
    activeSessionName: localStorage.getItem('collab_active_session_name') || null,
    activeSessionCode: localStorage.getItem('collab_active_session_code') || null,
    // New flag to differentiate admin opened sessions vs normal collaboration
    sessionType: localStorage.getItem('collab_session_type') || 'collab', // 'admin' when admin silently opens a user

    realtimeChannel: null,
    pgNotifyChannel: null, // قناة للإشعارات الفورية من PostgreSQL

    isLoading: false,

    // الأسماء المستعارة
    aliases: JSON.parse(localStorage.getItem('collab_aliases') || '{}'),

    // 2. تخزين "المستخدمين الأشباح" (Ghost Users) الذين يضيفهم الأدمن محلياً
    localGhostUsers: JSON.parse(localStorage.getItem('collab_ghost_users') || '[]'),

    // 3. معرف جلسة الأدمن النشطة ومؤقت الـ ping
    activeAdminSessionId: null,
    adminSessionPingInterval: null,

    // --- ميزات الأدمن الجديدة ---
    // سجل المستخدمين الذين تمت مشاهدتهم مؤخراً
    adminHistory: JSON.parse(localStorage.getItem('admin_view_history') || '[]'),

    // وضع الرؤية الافتراضي للأدمن: 'sync' (مزامنة حية) أو 'archive' (عرض أرشيف) أو null (لم يتم الاختيار بعد)
    adminViewMode: null,

    // أرشيف المستخدمين (عن بعد)
    remoteArchiveDates: [],
    remoteArchiveRows: [],
    isRemoteArchiveMode: false,
    selectedArchiveDate: null,
    selectedRemoteUserId: null,
    selectedRemoteUserCode: null
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

      const { data: requests, error: reqError } = await withTimeout(
        (signal) => supabase
          .from('collaboration_requests')
          .select('receiver_id, role')
          .eq('sender_id', auth.user.id)
          .eq('status', 'accepted')
          .abortSignal(signal),
        20000, // Increased to 20s
        'Fetch collaborators timed out'
      ).catch(err => ({ data: [], error: err }));

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
        this.setActiveSession(existing.userId, existing.displayName, 'collab');
        return existing.userId;
      }

      // --- الوضع العادي (متاح للكل بمَن فيهم الأدمن) ---
      const { error } = await supabase.from('collaboration_requests').insert({
        sender_id: auth.user.id,
        receiver_code: receiverCode,
        role: role
      });

      if (error) throw error;

      await this.fetchCollaborators();
      return null;
    },

    async adminOpenUser(targetUid, knownUserId = null) {
      const auth = useAuthStore();
      if (!auth.isAdmin) return;

      // Ensure session is fresh and network is responsive (Hard Revival)
      const isAlive = await auth.reviveApp();
      if (!isAlive) throw new Error('لا يمكن الاتصال بالسيرفر، يرجى التحقق من الشبكة');

      this.isLoading = true;
      try {
        let profile = null;

        // Deep defense: Ensure knownUserId is a valid string (UUID or similar) and not an Event object
        if (knownUserId && typeof knownUserId === 'string') {
          // Optimization: Skip searching profiles table if we already have the ID
          profile = { id: knownUserId, full_name: '', user_code: targetUid };
        } else {
          const cleanUid = targetUid.trim();
          // Safe UUID detection 
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanUid);

          let query = supabase.from('profiles').select('id, full_name, user_code');
          if (isUuid) query = query.or(`id.eq."${cleanUid}",user_code.eq."${cleanUid}"`);
          else query = query.eq('user_code', cleanUid);

          // Use new withTimeout syntax to pass AbortSignal to query (Reduced timeout)
          const { data: profileResult, error: profileError } = await withTimeout(
            (signal) => query.maybeSingle().abortSignal(signal),
            12000,
            'User search timed out'
          );

          if (profileError) throw profileError;
          if (!profileResult) throw new Error('المستخدم غير موجود');
          profile = profileResult;

          this.addToAdminHistory({ userId: profile.id, name: profile.full_name, code: profile.user_code });
        }

        // التبديل لوضع المزامنة دائماً عند الضغط على زر المزامنة
        this.adminViewMode = 'sync';
        this.exitRemoteArchiveMode();

        this.setActiveSession(profile.id, profile.full_name, 'admin', profile.user_code);
        return profile;
      } catch (err) {
        if (err.message && err.message.includes('timed out')) {
          logger.info('Admin user search timed out (slow network).');
        } else {
          logger.error('Error admin opening user:', err);
        }
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    setAdminViewMode(mode) {
      this.adminViewMode = mode;
      this.isRemoteArchiveMode = (mode === 'archive');
      logger.info(`🛠️ Admin View Mode changed to: ${mode} (isRemoteArchiveMode: ${this.isRemoteArchiveMode})`);

      // If switching to sync, clear archive data
      if (mode === 'sync') {
        this.remoteArchiveRows = [];
        this.remoteArchiveDates = [];
      } else {
        // If switching to archive but no user selected yet, just prepare
        this.remoteArchiveRows = [];
      }
    },

    addToAdminHistory(user) {
      if (!user || !user.userId) return;

      const exists = this.adminHistory.find(h => h.userId === user.userId);
      if (exists) {
        // Move to top and preserve any current custom name
        this.adminHistory = [
          { ...exists, ...user, name: exists.name }, // keep existing name if it was edited
          ...this.adminHistory.filter(h => h.userId !== user.userId)
        ];
      } else {
        this.adminHistory = [user, ...this.adminHistory];
      }

      // Limit to 20 items
      if (this.adminHistory.length > 20) this.adminHistory.pop();
      localStorage.setItem('admin_view_history', JSON.stringify(this.adminHistory));
    },

    updateAdminHistoryName(userId, newName) {
      const idx = this.adminHistory.findIndex(h => h.userId === userId);
      if (idx !== -1) {
        this.adminHistory[idx].name = newName;
        localStorage.setItem('admin_view_history', JSON.stringify(this.adminHistory));
      }
    },

    removeFromAdminHistory(userId) {
      this.adminHistory = this.adminHistory.filter(h => h.userId !== userId);
      localStorage.setItem('admin_view_history', JSON.stringify(this.adminHistory));
    },

    async fetchRemoteArchiveDates(targetUid, knownUserId = null) {
      const auth = useAuthStore();
      if (!auth.isAdmin) return [];

      // 1. Hard Revival (proactively refresh session)
      const isAlive = await auth.reviveApp();
      if (!isAlive) throw new Error('لا يمكن الاتصال بالسيرفر، يرجى التحقق من الشبكة');

      this.isLoading = true;
      try {
        let profile = null;

        // Deep defense: Ensure knownUserId is a valid string (UUID or similar) and not an Event object
        if (knownUserId && typeof knownUserId === 'string') {
          // If we already have the user ID from history, we can skip searching profiles table
          profile = { id: knownUserId, full_name: '', user_code: targetUid };
        } else {
          const cleanUid = targetUid.trim();
          // Safe UUID detection 
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanUid);

          let query = supabase.from('profiles').select('id, full_name, user_code');
          if (isUuid) query = query.or(`id.eq."${cleanUid}",user_code.eq."${cleanUid}"`);
          else query = query.eq('user_code', cleanUid);

          const { data, error: pError } = await withTimeout(
            (signal) => query.maybeSingle().abortSignal(signal),
            12000, // Reduced timeout for profile search
            'Profile search timed out'
          );

          if (pError) throw pError;
          if (!data) throw new Error('المستخدم غير موجود (تحقق من الكود)');
          profile = data;

          // Add to history only if it's a new search
          this.addToAdminHistory({ userId: profile.id, name: profile.full_name, code: profile.user_code });
        }

        this.selectedRemoteUserId = profile.id;
        this.exitRemoteArchiveMode();

        const { dates, error } = await archiveService.getAvailableDatesAdmin(profile.id);
        if (error) throw error;

        logger.info(`📅 Fetched ${dates.length} archive dates for user`);

        if (dates.length === 0) {
          logger.warn('⚠️ No archives found for this user.');
        }

        // Clear previous rows to avoid flicker when switching users
        this.remoteArchiveRows = [];

        this.remoteArchiveDates = dates;
        this.selectedRemoteUserId = profile.id;
        this.selectedRemoteUserCode = profile.user_code;

        // إذا كنا بالفعل في وضع الأرشيف، نصل للجلسة تلقائياً للمستخدم الجديد
        if (this.adminViewMode === 'archive') {
          this.isRemoteArchiveMode = true; // نؤكد على وضع الأرشيف
          this.setActiveSession(profile.id, profile.full_name, 'admin', profile.user_code);
        }

        return dates;
      } catch (err) {
        if (err.message && err.message.includes('timed out')) {
          logger.info('Fetch remote archive dates timed out (slow network).');
        } else {
          logger.error('❌ Error fetching remote archive dates:', err);
        }
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchRemoteArchiveData(dateStr) {
      if (!this.selectedRemoteUserId) return;

      const auth = useAuthStore();
      // Ensure fresh session before fetching data
      await auth.reviveApp();

      this.isLoading = true;
      try {
        // Use Admin Direct Fetch (RPC) with timeout
        // Note: For now, we only apply timeout to the promise. If we decide to support abort in API layer, 
        // we'd pass signal here.
        const { data, error } = await withTimeout(
          archiveService.getArchiveByDateAdmin(this.selectedRemoteUserId, dateStr),
          20000,
          'Remote archive data fetch timed out'
        );
        if (error) throw error;

        this.remoteArchiveRows = data || [];
        this.selectedArchiveDate = dateStr;
        this.isRemoteArchiveMode = true;
        // لا نقوم بمسح الجلسة هنا لنحافظ على ظهور اسم المستخدم في الهيدر
      } catch (err) {
        if (err.message && err.message.includes('timed out')) {
          logger.info('Fetch remote archive data timed out (slow network).');
        } else {
          logger.error('❌ Error fetching remote archive data:', err);
        }
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    exitRemoteArchiveMode() {
      this.isRemoteArchiveMode = false;
      this.remoteArchiveRows = [];
      this.selectedArchiveDate = null;
      this.selectedRemoteUserId = null;
      this.selectedRemoteUserCode = null;
      this.remoteArchiveDates = [];
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

    async stopAdminGhostSession() {
      // Since we no longer use a complex ghost session tracking with pings for this silent access,
      // we just clear the active session.
      this.setActiveSession(null, null);
    },

    setActiveSession(userId, userName, type = 'collab', userCode = null) {
      this.activeSessionId = userId;
      this.activeSessionName = userName;
      this.sessionType = type;
      this.activeSessionCode = userCode;

      // 3. حفظ الجلسة في التخزين المحلي
      if (userId) {
        localStorage.setItem('collab_active_session_id', userId);
        localStorage.setItem('collab_active_session_name', userName);
        localStorage.setItem('collab_session_type', type);
        if (userCode) localStorage.setItem('collab_active_session_code', userCode);
      } else {
        localStorage.removeItem('collab_active_session_id');
        localStorage.removeItem('collab_active_session_name');
        localStorage.removeItem('collab_session_type');
        localStorage.removeItem('collab_active_session_code');
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
      // ... (rest of function)
      // (This is NOT where we add it, wait. I should append it to actions)
    }, // mistake in instruction parsing, let me find a better insertion point.
    // Actually, I'll insert it before 'revokeInvite' or at the end of actions.

    reconnectRealtime() {
      const auth = useAuthStore();
      if (auth.user && auth.user.userCode) {
        logger.info('🔌 Reconnecting Collaboration Realtime...');
        this.subscribeToRequests();
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