import { ref, computed, watch } from 'vue';
import { useSupabase } from '~/composables/useSupabase';
import { useAuth } from '~/composables/useAuth';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  phase: string;
  title: string;
  message: string;
  is_read: boolean;
  is_urgent: boolean;
  paper_id?: string | null;
  paper_title?: string | null;
  link?: string | null;
  created_at: string;
}

const notifications = ref<Notification[]>([]);
const isLoading = ref(false);
let realtimeChannel: any = null;

export const useNotifications = () => {
  const supabase = useSupabase();
  const { currentUser } = useAuth();

  const unreadCount = computed(() => notifications.value.filter(n => !n.is_read).length);
  const hasUnread = computed(() => unreadCount.value > 0);

  const fetchNotifications = async () => {
    if (!currentUser.value?.id) return;
    isLoading.value = true;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.value.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error && data) {
        notifications.value = data as Notification[];
      } else if (error) {
        console.error('fetchNotifications error details:', error);
      }
    } catch (e) {
      console.error('fetchNotifications error:', e);
    } finally {
      isLoading.value = false;
    }
  };

  const createNotification = async (opts: {
    type: string;
    phase: string;
    title: string;
    message: string;
    is_urgent?: boolean;
    paper_id?: string | null;
    paper_title?: string | null;
    link?: string | null;
  }) => {
    if (!currentUser.value?.id) {
        console.warn('Cannot create notification: No currentUser ID');
        return;
    }
    try {
      const payload = {
        user_id: currentUser.value.id,
        type: opts.type,
        phase: opts.phase,
        title: opts.title,
        message: opts.message,
        is_urgent: opts.is_urgent || false,
        paper_id: opts.paper_id || null,
        paper_title: opts.paper_title || null,
        link: opts.link || null,
      };
      
      const { data, error } = await supabase.from('notifications').insert(payload).select();
      
      if (error) {
        console.error('Insert error details:', error);
        throw new Error(error.message || 'Insert failed');
      }

      // ดึงข้อมูลใหม่ทันทีหลังจากสร้าง
      await fetchNotifications();
      
      // DEBUG: เช็คว่ามีข้อมูลเข้ามาใน array จริงไหม
      // alert('DEBUG: ส่งแจ้งเตือนสำเร็จ! จำนวนที่มีตอนนี้: ' + notifications.value.length);
    } catch (e: any) {
      console.error('createNotification error:', e);
    }
  };

  const markAsRead = async (id: string) => {
    const idx = notifications.value.findIndex(n => n.id === id);
    if (idx !== -1) notifications.value[idx].is_read = true;
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    if (!currentUser.value?.id) return;
    notifications.value.forEach(n => { n.is_read = true; });
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUser.value.id)
      .eq('is_read', false);
  };

  const subscribeRealtime = () => {
    if (!currentUser.value?.id || realtimeChannel) return;
    
    console.log('🔔 Subscribing to notifications for:', currentUser.value.id);
    
    realtimeChannel = supabase
      .channel(`notifications:${currentUser.value.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.value.id}`,
        },
        (payload: any) => {
          console.log('📩 New notification received via Realtime');
          // ตรวจสอบว่ามีอยู่แล้วหรือยังป้องกันซ้ำ
          const exists = notifications.value.some(n => n.id === payload.new.id);
          if (!exists) {
            notifications.value.unshift(payload.new as Notification);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('📡 Realtime status:', status);
        if (err) {
          console.error('📡 Realtime subscription error:', err);
        }
      });
  };

  const unsubscribeRealtime = () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  };

  // Watcher was removed because it causes multiple subscriptions when called in multiple components.
  // Initialization is now safely handled by portal.vue (layout) onMounted hook.

  return {
    notifications,
    unreadCount,
    hasUnread,
    isLoading,
    fetchNotifications,
    createNotification,
    markAsRead,
    markAllAsRead,
    subscribeRealtime,
    unsubscribeRealtime,
  };
};
