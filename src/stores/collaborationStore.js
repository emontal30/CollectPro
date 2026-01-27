import { defineStore } from 'pinia';
import { supabase } from '@/supabase';
import { useAuthStore } from './auth';
import { useHarvestStore } from './harvest';
import logger from '@/utils/logger.js';

export const useCollaborationStore = defineStore('collaboration', {
  state: () => ({
    collaborators: JSON.parse(localStorage.getItem('collab_list') || '[]'),
    incomingRequests: [],
    activeSessionId: localStorage.getItem('collab_active_session_id') || null,
    activeSessionName: localStorage.getItem('collab_active_session_name') || null,
    activeSessionCode: localStorage.getItem('collab_active_session_code') || null,
    sessionType: localStorage.getItem('collab_session_type') || 'collab',
    isLoading: false,
    realtimeChannel: null,
    pgNotifyChannel: null,
    adminViewMode: 'sync',
    remoteArchiveDates: [],
    remoteArchiveRows: [],
    adminHistory: JSON.parse(localStorage.getItem('admin_history') || '[]'),
    isRemoteArchiveMode: false,
    selectedRemoteUserCode: null
  }),

  actions: {
    addNotification(message, type = 'info', duration = 5000) {
      window.dispatchEvent(new CustomEvent('app-notification', {
        detail: { message, type, duration }
      }));
    },

    async fetchCollaborators() {
      const auth = useAuthStore();
      if (!auth.user) return;
      this.isLoading = true;
      try {
        const { data, error } = await supabase
          .from('collaboration_requests')
          .select('*')
          .or(`sender_id.eq.${auth.user.id},receiver_id.eq.${auth.user.id}`)
          .eq('status', 'accepted');

        if (error) throw error;

        const otherUserIds = data.map(req =>
          req.sender_id === auth.user.id ? req.receiver_id : req.sender_id
        );

        if (otherUserIds.length === 0) {
          this.collaborators = [];
          return;
        }

        const { data: profiles, error: profError } = await supabase
          .from('profiles')
          .select('id, full_name, user_code')
          .in('id', otherUserIds);

        // محاولة جلب البريد بشكل اختياري
        let emailMap = new Map();
        try {
          const { data: emails } = await supabase.from('profiles').select('id, email').in('id', otherUserIds);
          if (emails) emails.forEach(e => emailMap.set(e.id, e.email));
        } catch (e) {
          logger.warn('Profiles email column not available yet');
        }

        if (profError) {
          logger.error('Error fetching collaborator profiles:', profError);
        }

        this.collaborators = data.map(req => {
          const otherId = req.sender_id === auth.user.id ? req.receiver_id : req.sender_id;
          const profile = profiles?.find(p => p.id === otherId);
          return {
            id: req.id,
            userId: otherId,
            userName: profile?.full_name || 'مستخدم',
            userEmail: emailMap.get(otherId) || '---',
            displayName: profile?.full_name || 'مستخدم',
            userCode: profile?.user_code || '---',
            role: req.role,
            status: req.status,
            isOwner: req.sender_id === auth.user.id
          };
        });
        localStorage.setItem('collab_list', JSON.stringify(this.collaborators));
      } catch (error) {
        logger.error('Error fetching collaborators:', error);
      } finally {
        this.isLoading = false;
      }
    },

    async fetchIncomingRequests() {
      const auth = useAuthStore();
      if (!auth.user) return;
      try {
        const { data: requests, error } = await supabase
          .from('collaboration_requests')
          .select('*')
          .eq('receiver_id', auth.user.id)
          .eq('status', 'pending');

        if (error) throw error;

        if (requests.length === 0) {
          this.incomingRequests = [];
          return;
        }

        const senderIds = requests.map(r => r.sender_id);

        // جلب البيانات الأساسية للمرسلين
        const { data: profiles, error: profError } = await supabase
          .from('profiles')
          .select('id, full_name, user_code')
          .in('id', senderIds);

        // محاولة جلب البريد بشكل اختياري
        let emailMap = new Map();
        try {
          const { data: emails } = await supabase.from('profiles').select('id, email').in('id', senderIds);
          if (emails) emails.forEach(e => emailMap.set(e.id, e.email));
        } catch (e) {
          logger.warn('Profiles email column not available yet for incoming requests');
        }

        if (profError) {
          logger.error('Error fetching sender profiles:', profError);
        }

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

        // تصفية الدعوات المكررة برمجياً (لإضافة طبقة حماية إضافية للواجهة)
        const seenSenders = new Set();
        this.incomingRequests = requests
          .filter(req => {
            if (seenSenders.has(req.sender_id)) return false;
            seenSenders.add(req.sender_id);
            return true;
          })
          .map(req => {
            const senderProfile = profilesMap.get(req.sender_id);
            return {
              ...req,
              sender_profile: {
                full_name: senderProfile?.full_name || 'مستخدم'
              },
              sender_email: emailMap.get(req.sender_id) || '---',
              sender_code: senderProfile?.user_code || '---',
              selectedRole: req.role // لتخزين الدور المختار بشكل مؤقت
            };
          });
      } catch (error) {
        logger.error('Error fetching incoming requests:', error);
      }
    },

    async sendInvite(receiverCode, role = 'viewer') {
      const auth = useAuthStore();
      if (!auth.user) throw new Error('يجب تسجيل الدخول أولاً');
      if (receiverCode === auth.user.userCode) throw new Error('لا يمكنك إرسال دعوة لنفسك');

      try {
        const { data: receiverProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('user_code', receiverCode)
          .single();

        if (profileError || !receiverProfile) throw new Error('كود المستخدم غير موجود');

        // Check if there is already an OUTGOING request from me to them
        const { data: existingOutgoing, error: outError } = await supabase
          .from('collaboration_requests')
          .select('id, status')
          .match({ sender_id: auth.user.id, receiver_id: receiverProfile.id })
          .maybeSingle();

        if (existingOutgoing) {
          if (existingOutgoing.status === 'pending') throw new Error('توجد دعوة معلقة بالفعل لهذا المستخدم');
          if (existingOutgoing.status === 'accepted') throw new Error('هذا المستخدم متعاون معك بالفعل');
          // If rejected/revoked, we delete old one and create new below
          await supabase.from('collaboration_requests').delete().eq('id', existingOutgoing.id);
        }

        // Check if there is already an INCOMING request from them to me (Reverse relationship)
        const { data: existingIncoming, error: inError } = await supabase
          .from('collaboration_requests')
          .select('id, status')
          .match({ sender_id: receiverProfile.id, receiver_id: auth.user.id })
          .maybeSingle();

        if (existingIncoming) {
          if (existingIncoming.status === 'pending') throw new Error('هذا المستخدم أرسل لك دعوة بالفعل! تفقد "الدعوات الواردة" لقبولها.');
          if (existingIncoming.status === 'accepted') throw new Error('أنت متعاون بالفعل مع هذا المستخدم (كمستقبل).');
        }

        const { error } = await supabase
          .from('collaboration_requests')
          .insert({
            sender_id: auth.user.id,
            receiver_id: receiverProfile.id,
            receiver_code: receiverCode,
            role,
            status: 'pending'
          });

        if (error) throw error;
        this.addNotification('تم إرسال الدعوة بنجاح', 'success');
        return { success: true };
      } catch (error) {
        logger.error('Error sending invite:', error);
        throw error;
      }
    },

    async respondToInvite(requestId, status, customRole = null) {
      const auth = useAuthStore();
      if (!auth.user) throw new Error('يجب تسجيل الدخول أولاً');

      try {
        // إذا كانت الحالة رفض، نقوم بالحذف مباشرة دون تحديث الحالة
        if (status === 'rejected') {
          const { error: deleteError } = await supabase
            .from('collaboration_requests')
            .delete()
            .eq('id', requestId);

          if (deleteError) throw deleteError;
          this.addNotification('تم حذف الدعوة بنجاح', 'info');
        } else {
          // الحالات الأخرى (Accepted) تحتاج تحديث
          const updatePayload = {
            status,
            responded_at: new Date()
          };

          if (customRole) {
            updatePayload.role = customRole;
          }

          const { error } = await supabase
            .from('collaboration_requests')
            .update(updatePayload)
            .eq('id', requestId);

          if (error) throw error;

          if (status === 'accepted') {
            const harvestStore = useHarvestStore();
            await harvestStore.forceSyncToCloud(auth.user.id);
            this.addNotification('تم قبول الدعوة بنجاح ✅', 'success');
          }
        }

        await this.fetchIncomingRequests();
        await this.fetchCollaborators();
        return { success: true };
      } catch (error) {
        logger.error('Error responding to invite:', error);
        return { success: false, error: error.message };
      }
    },

    async clearAllIncomingInvites() {
      const auth = useAuthStore();
      if (!auth.user) return;

      try {
        const { error } = await supabase
          .from('collaboration_requests')
          .delete()
          .eq('receiver_id', auth.user.id)
          .eq('status', 'pending');

        if (error) throw error;

        // Reset list purely locally first for speed
        this.incomingRequests = [];

        // Then double check with server
        await this.fetchIncomingRequests();

        this.addNotification('تم تنظيف كافة الدعوات الواردة بنجاح', 'success');
      } catch (error) {
        logger.error('Error clearing invites:', error);
        this.addNotification('فشل تنظيف الدعوات', 'error');
      }
    },

    async revokeInvite(userId) {
      if (!userId) return;
      const auth = useAuthStore();
      try {
        const { error } = await supabase
          .from('collaboration_requests')
          .delete()
          .or(`and(sender_id.eq.${auth.user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${auth.user.id})`);

        if (error) throw error;

        if (this.activeSessionId === userId) {
          this.setActiveSession(null, null);
        }
        await this.fetchCollaborators();
        this.addNotification('تم إلغاء المشاركة مع المستخدم', 'info');
      } catch (error) {
        logger.error('Error revoking invite:', error);
      }
    },

    setActiveSession(userId, userName, type = 'collab', userCode = null) {
      this.activeSessionId = userId;
      this.activeSessionName = userName;
      this.sessionType = type;
      this.activeSessionCode = userCode;

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

    async adminOpenUser(targetIdentifier, knownUserId = null) {
      const auth = useAuthStore();
      if (!auth.isAdmin) throw new Error('صلاحية مسؤول مطلوبة');

      try {
        let userId = knownUserId;
        let profile = null;

        if (!userId) {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, user_code')
            .eq('user_code', targetIdentifier)
            .maybeSingle();

          if (error) throw error;
          if (!data) throw new Error('لم يتم العثور على المستخدم');
          userId = data.id;
          profile = data;
        } else {
          const { data } = await supabase.from('profiles').select('id, full_name, user_code').eq('id', userId).single();
          profile = data;
        }

        this.setActiveSession(userId, profile?.full_name || 'مستخدم', 'admin', profile?.user_code);
        this.addToAdminHistory(userId, profile?.full_name || 'مستخدم', profile?.user_code);

        return { success: true };
      } catch (error) {
        logger.error('Admin open user failed:', error);
        throw error;
      }
    },

    addToAdminHistory(userId, name, code) {
      const existingIndex = this.adminHistory.findIndex(h => h.userId === userId);
      if (existingIndex !== -1) {
        this.adminHistory.splice(existingIndex, 1);
      }
      this.adminHistory.unshift({ userId, name, code, lastViewed: new Date().toISOString() });
      if (this.adminHistory.length > 20) this.adminHistory.pop();
      localStorage.setItem('admin_history', JSON.stringify(this.adminHistory));
    },

    updateAdminHistoryName(userId, newName) {
      const item = this.adminHistory.find(h => h.userId === userId);
      if (item) {
        item.name = newName;
        localStorage.setItem('admin_history', JSON.stringify(this.adminHistory));
      }
    },

    removeFromAdminHistory(userId) {
      this.adminHistory = this.adminHistory.filter(h => h.userId !== userId);
      localStorage.setItem('admin_history', JSON.stringify(this.adminHistory));
    },

    async fetchRemoteArchiveDates(targetIdentifier, knownUserId = null) {
      try {
        let userId = knownUserId;
        if (!userId) {
          const { data: prof, error: profErr } = await supabase.from('profiles').select('id, full_name, user_code').eq('user_code', targetIdentifier).single();
          if (profErr || !prof) return [];
          userId = prof.id;
          this.selectedRemoteUserCode = prof.user_code;
          this.addToAdminHistory(userId, prof.full_name, prof.user_code);
        } else {
          // If userId known, still try to find code in history or profile
          const fromHist = this.adminHistory.find(h => h.userId === userId);
          if (fromHist) this.selectedRemoteUserCode = fromHist.code;
        }

        this.selectedRemoteUserId = userId;

        const { data: resData, error } = await supabase.rpc('get_user_archive_dates_admin', {
          p_user_id: userId
        });

        if (error) throw error;
        // RPC returns array of objects with archive_date property
        this.remoteArchiveDates = (resData || []).map(d => d.archive_date);
        return this.remoteArchiveDates;
      } catch (error) {
        logger.error('Error fetching remote archive dates:', error);
        return [];
      }
    },

    async fetchRemoteArchiveData(dateStr) {
      if (!this.selectedRemoteUserId) return;
      this.isLoading = true;
      try {
        const { data, error } = await supabase.rpc('get_user_archive_data_admin', {
          p_user_id: this.selectedRemoteUserId,
          p_date: dateStr
        });

        if (error) throw error;

        // RPC returns the data JSONB directly.
        // Support both old format (direct array) and new format (object with rows property)
        const dataRows = Array.isArray(data) ? data : (data?.rows || []);
        this.remoteArchiveRows = dataRows;
        this.selectedArchiveDate = dateStr;
        this.isRemoteArchiveMode = true;
      } catch (error) {
        logger.error('Error fetching remote archive data:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    exitRemoteArchiveMode() {
      this.isRemoteArchiveMode = false;
      this.remoteArchiveRows = [];
      this.selectedArchiveDate = null;
    },

    setAlias(userId, alias) {
      const collab = this.collaborators.find(c => c.userId === userId);
      if (collab) {
        collab.displayName = alias;
      }
    },

    setAdminViewMode(mode) {
      this.adminViewMode = mode;
      this.isRemoteArchiveMode = (mode === 'archive');
    },

    subscribeToRequests() {
      const auth = useAuthStore();
      if (!auth.user?.id) return;

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
            filter: `receiver_id=eq.${auth.user.id}`
          },
          async (payload) => {
            if (payload.new && payload.new.status === 'pending') {
              await this.fetchIncomingRequests();
              const req = this.incomingRequests.find(r => r.id === payload.new.id);
              const senderName = req?.sender_profile?.full_name || 'مستخدم';
              const roleText = payload.new.role === 'editor' ? 'محرر (تعديل)' : 'مشاهد (قراءة فقط)';

              // إرسال تنبيه بسيط بدلاً من نافذة منبثقة تفاعلية
              this.addNotification(
                `📬 لديك دعوة مشاركة جديدة من: ${senderName} (${req?.sender_code || '---'})`,
                'info',
                8000
              );
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'collaboration_requests'
          },
          async (payload) => {
            const newData = payload.new;
            if (!newData) return;

            // If I am the receiver
            if (newData.receiver_id === auth.user.id) {
              if (newData.status === 'revoked' || newData.status === 'rejected') {
                this.fetchIncomingRequests();
                this.fetchCollaborators();
                if (this.activeSessionId === newData.sender_id) {
                  this.setActiveSession(null, null);
                  this.addNotification('تم إلغاء المشاركة من قبل المرسل', 'warning');
                }
              }
            }

            // If I am the sender
            if (newData.sender_id === auth.user.id) {
              if (newData.status === 'accepted') {
                if (newData.status === 'accepted') {
                  // جلب بيانات المُستقبِل لعرضها في الإشعار
                  const { data: receiverProfile } = await supabase
                    .from('profiles')
                    .select('full_name, user_code')
                    .eq('id', newData.receiver_id)
                    .single();

                  let receiverEmail = '---';
                  try {
                    const { data: emailData } = await supabase
                      .from('profiles')
                      .select('email')
                      .eq('id', newData.receiver_id)
                      .single();
                    if (emailData?.email) receiverEmail = emailData.email;
                  } catch (e) {
                    logger.warn('Receiver email column not available yet');
                  }

                  const receiverName = receiverProfile?.full_name || 'مستخدم';
                  const receiverCode = receiverProfile?.user_code || '---';

                  this.addNotification(
                    `✅ تم قبول دعوتك من ${receiverName}\n${receiverEmail}`,
                    'success',
                    10000
                  );

                  // تحديث القائمة فوراً
                  await this.fetchCollaborators();
                }
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'collaboration_requests'
          },
          async (payload) => {
            const oldData = payload.old;
            if (!oldData) return;

            // If the deleted request was relevant to me
            if (oldData.receiver_id === auth.user.id || oldData.sender_id === auth.user.id) {
              await this.fetchCollaborators();
              await this.fetchIncomingRequests();

              // If I was viewing this specific deleted session
              // Check if the other party matches the active session
              const otherPartyId = (oldData.sender_id === auth.user.id) ? oldData.receiver_id : oldData.sender_id;

              if (this.activeSessionId === otherPartyId) {
                this.setActiveSession(null, null);
                this.addNotification('تم إنهاء المشاركة (حذف الدعوة) من الطرف الآخر', 'warning');
              }
            }
          }
        )
        .on(
          'broadcast',
          { event: 'pulse-request' },
          (payload) => {
            const authStore = useAuthStore();
            if (payload.payload.targetUserId === authStore.user?.id) {
              logger.info('⚡ Received pulse request from admin, syncing data to cloud...');
              const harvestStore = useHarvestStore();
              harvestStore.syncToCloud(authStore.user.id);
            }
          }
        )
        .subscribe();
    },

    broadcastPulseRequest(targetUserId) {
      if (!this.realtimeChannel) return;
      logger.info(`📡 Sending pulse request for user: ${targetUserId}`);
      this.realtimeChannel.send({
        type: 'broadcast',
        event: 'pulse-request',
        payload: { targetUserId }
      });
    },

    unsubscribeFromRequests() {
      if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
      }
    },

    reconnectRealtime() {
      logger.info('🔄 Reconnecting collaboration realtime channel...');
      this.subscribeToRequests();
    }
  }
});