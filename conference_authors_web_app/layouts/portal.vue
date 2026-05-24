<script setup>
// Portal layout — authenticated author pages
import {
  LayoutDashboard, FileText, Upload, Archive, CreditCard, CalendarDays,
  Trophy, Download, HelpCircle, Settings, BarChart3, LogOut,
  Bell, Menu, X, Newspaper, User, CheckCheck, ExternalLink,
  PartyPopper, AlertTriangle, CheckCircle, AlertOctagon, Hourglass, 
  FileEdit, CheckCircle2, Award, XCircle, Clock, CalendarCheck, Megaphone, DownloadCloud
} from 'lucide-vue-next';
import { useNotifications } from '~/composables/useNotifications';

const route = useRoute();
const router = useRouter();
const { userProfile, signOut, currentUser } = useAuth();

const sidebarOpen = ref(true);
const notifOpen = ref(false);
const notifRef = ref(null);
const showLogoutModal = ref(false);

const {
  notifications,
  unreadCount,
  hasUnread,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  subscribeRealtime,
  unsubscribeRealtime,
} = useNotifications();

const handleClickOutside = (e) => {
  if (notifRef.value && !notifRef.value.contains(e.target)) {
    notifOpen.value = false;
  }
};

const supabase = useSupabase();
const conferenceName = ref('BRICC Festival');

// --- Tab Resume Detection (Chrome Tab Switching) ---
// When Chrome suspends a background tab, WebSockets die and data becomes stale.
// This counter increments every time the tab becomes visible again.
// Child pages watch this to refetch their data.
const tabResumeCount = ref(0);
provide('tabResumeCount', tabResumeCount);

const handleTabResume = () => {
  if (document.visibilityState === 'visible') {
    console.log('[portal layout] Chrome tab resumed — broadcasting refresh');
    tabResumeCount.value++;
    // Re-subscribe realtime notifications (WebSocket was likely dead)
    unsubscribeRealtime();
    subscribeRealtime();
    fetchNotifications();
  }
};

onMounted(async () => {
  document.addEventListener('mousedown', handleClickOutside);
  document.addEventListener('visibilitychange', handleTabResume);
  await fetchNotifications();
  subscribeRealtime();

  try {
    const { data } = await supabase.from('system_settings').select('config_json').single();
    if (data?.config_json?.conference?.name) {
      conferenceName.value = data.config_json.conference.name;
    }
  } catch (err) {}
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
  document.removeEventListener('visibilitychange', handleTabResume);
  unsubscribeRealtime();
});

const menuItems = [
  { to: '/portal/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { to: '/portal/news', label: 'ข่าวสารประกาศ', icon: Newspaper },
  { to: '/portal/submit', label: 'ส่งบทความ', icon: Upload },
  { to: '/portal/articles', label: 'บทความของฉัน', icon: FileText },
  { to: '/portal/archives', label: 'คลังบทความ', icon: Archive },
  { to: '/portal/schedule', label: 'ตารางนำเสนอ', icon: CalendarDays },
  { to: '/portal/awards', label: 'รางวัล', icon: Trophy },
  { to: '/portal/downloads', label: 'ดาวน์โหลด', icon: Download },
  { to: '/portal/statistics', label: 'สถิติ', icon: BarChart3 },
  { to: '/portal/settings', label: 'ตั้งค่า', icon: Settings },
  { to: '/portal/help', label: 'ช่วยเหลือ', icon: HelpCircle },
];

const displayName = computed(() => {
  if (userProfile.value) {
    return `${userProfile.value.first_name_th || ''} ${userProfile.value.last_name_th || ''}`.trim() || userProfile.value.email;
  }
  return 'ผู้ใช้งาน';
});

const isAdmin = computed(() => userProfile.value?.role === 'admin');

const handleLogout = () => {
  showLogoutModal.value = true;
};

const confirmLogout = async () => {
  showLogoutModal.value = false;
  await signOut();
};

// Notification helpers
const notifIcon = (type) => {
  const map = {
    welcome: PartyPopper,
    profile_incomplete: AlertTriangle,
    paper_submitted: CheckCircle,
    paper_format_error: AlertOctagon,
    review_started: Hourglass,
    revision_required: FileEdit,
    revision_submitted: CheckCircle2,
    paper_accepted: Award,
    paper_rejected: XCircle,
    camera_ready_reminder: Clock,
    schedule_announced: CalendarCheck,
    event_reminder: Megaphone,
    download_ready: DownloadCloud,
  };
  return map[type] || Bell;
};

const notifIconColor = (type) => {
  const map = {
    welcome: 'text-amber-500',
    profile_incomplete: 'text-rose-500',
    paper_submitted: 'text-emerald-500',
    paper_format_error: 'text-rose-500',
    review_started: 'text-blue-500',
    revision_required: 'text-amber-500',
    revision_submitted: 'text-emerald-500',
    paper_accepted: 'text-emerald-600',
    paper_rejected: 'text-rose-600',
    camera_ready_reminder: 'text-rose-500',
    schedule_announced: 'text-purple-500',
    event_reminder: 'text-purple-500',
    download_ready: 'text-blue-500',
  };
  return map[type] || 'text-slate-500';
};

const notifBg = (n) => {
  if (n.is_urgent && !n.is_read) return 'bg-rose-50 border-rose-100';
  if (!n.is_read) return 'bg-purple-50/60 border-purple-100';
  return 'bg-white border-transparent';
};

const handleNotifClick = async (n) => {
  if (!n.is_read) await markAsRead(n.id);
  if (n.link) router.push(n.link);
  notifOpen.value = false;
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'เพิ่งแล้ว';
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  const d = Math.floor(h / 24);
  return `${d} วันที่แล้ว`;
};
</script>

<template>
  <ClientOnly>
    <div class="flex h-screen bg-slate-50 font-sans overflow-hidden selection:bg-purple-200 selection:text-purple-900">
      <!-- Sidebar -->
    <aside
      class="bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-40 transition-all duration-300 relative shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
      :class="sidebarOpen ? 'w-[280px]' : 'w-[88px]'"
    >
      <!-- Logo -->
      <NuxtLink to="/portal/dashboard" class="min-h-[80px] h-auto flex items-center gap-4 px-6 py-5 border-b border-slate-100/60 relative overflow-hidden group">
        <div class="absolute inset-0 bg-gradient-to-r from-purple-50/50 to-transparent pointer-events-none" />
        <img src="~/assets/bru-web-logo-en.png" alt="BRICC Logo" class="h-9 w-auto object-contain relative z-10 shrink-0 group-hover:scale-105 transition-transform duration-300" />
        <div v-if="sidebarOpen" class="min-w-0 relative z-10 flex-1 border-l-2 border-purple-200/50 pl-3 py-0">
          <h1 class="font-black text-[13px] leading-tight text-slate-900 font-['Lato'] tracking-tight">{{ conferenceName }}</h1>
          <p class="text-[10px] text-purple-600 mt-1 font-bold tracking-widest uppercase font-['Lato']">Author Portal</p>
        </div>
      </NuxtLink>

      <!-- Menu -->
      <div class="flex-1 overflow-y-auto px-4 py-6 no-scrollbar">
        <div class="space-y-1.5">
          <NuxtLink
            v-for="item in menuItems"
            :key="item.to"
            :to="item.to"
            class="group flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-[14px] font-bold transition-all duration-200 relative overflow-hidden"
            :class="route.path === item.to
              ? 'text-purple-700 bg-purple-50 shadow-sm border border-purple-100/50'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'"
          >
            <div v-if="route.path === item.to" class="absolute left-0 top-0 bottom-0 w-1 bg-purple-600 rounded-r-full" />
            <component 
              :is="item.icon" 
              class="w-[18px] h-[18px] shrink-0 transition-transform duration-300 group-hover:scale-110" 
              :class="route.path === item.to ? 'text-purple-600' : 'text-slate-400 group-hover:text-purple-500'" 
            />
            <span v-if="sidebarOpen" class="truncate tracking-wide">{{ item.label }}</span>
          </NuxtLink>
        </div>

        <!-- Admin Link — only shown for admin role -->
        <div v-if="isAdmin" class="mt-8 pt-6 border-t border-slate-100">
          <div v-if="sidebarOpen" class="px-3 mb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest font-['Lato']">Administration</div>
          <NuxtLink
            to="/admin"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            :class="route.path.startsWith('/admin')
              ? 'bg-amber-500 text-slate-900 shadow-md'
              : 'text-amber-400 hover:bg-amber-500/10 hover:text-amber-300'"
          >
            <svg class="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span v-if="sidebarOpen" class="truncate font-black">Admin Dashboard</span>
          </NuxtLink>
        </div>
      </div>

      <!-- User info -->
      <div class="p-6 mt-auto">
        <div class="flex items-center gap-3">
          <!-- Circular Avatar -->
          <div class="relative group">
            <div v-if="userProfile?.avatar_url" class="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-200">
              <img :src="userProfile.avatar_url" alt="Avatar" class="w-full h-full object-cover" />
            </div>
            <div v-else class="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-slate-200">
              <User class="w-5 h-5 text-slate-400" />
            </div>
          </div>
          
          <div v-if="sidebarOpen" class="min-w-0">
            <p class="text-[14px] font-bold text-slate-800 leading-tight truncate">
              {{ displayName }}
            </p>
            <p class="text-[12px] font-medium text-slate-400 mt-0.5 truncate">
              {{ userProfile?.academic_position || 'Author' }}
            </p>
          </div>
        </div>

        <!-- Dedicated Logout Button -->
        <div class="mt-6">
          <button
            v-if="sidebarOpen"
            @click="handleLogout"
            class="w-full flex items-center gap-3 px-1 text-slate-400 hover:text-rose-600 transition-all font-bold text-sm group"
          >
            <LogOut class="w-[18px] h-[18px] group-hover:-translate-x-1 transition-transform" />
            ออกจากระบบ
          </button>
          <button
            v-else
            @click="handleLogout"
            class="w-full flex justify-center py-2.5 text-slate-400 hover:text-rose-600 transition-all"
          >
            <LogOut class="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Top bar -->
      <header class="h-20 bg-white/70 backdrop-blur-2xl border-b border-slate-200/60 flex items-center justify-between px-8 sticky top-0 z-30 shrink-0">
        <button
          @click="sidebarOpen = !sidebarOpen"
          class="w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-200 flex items-center justify-center transition-all duration-300"
        >
          <Menu v-if="!sidebarOpen" class="w-[18px] h-[18px] text-slate-600" />
          <X v-else class="w-[18px] h-[18px] text-slate-600" />
        </button>

        <div class="flex items-center gap-5">
          <div class="relative" ref="notifRef">
            <button @click="notifOpen = !notifOpen" class="relative w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-sm text-slate-400 hover:text-purple-600 hover:border-purple-200 transition-all duration-300">
              <Bell class="w-5 h-5" />
              <span v-if="hasUnread" class="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 rounded-full text-white text-[10px] font-black flex items-center justify-center px-1 animate-pulse">
                {{ unreadCount > 99 ? '99+' : unreadCount }}
              </span>
            </button>
            
            <!-- Notification Dropdown -->
            <div v-if="notifOpen" class="absolute right-0 top-14 w-[400px] max-w-[calc(100vw-48px)] rounded-[24px] bg-white border border-slate-200 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
              <!-- Header -->
              <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div class="flex items-center gap-2">
                  <div class="text-[14px] font-black text-slate-900">การแจ้งเตือน</div>
                  <span v-if="hasUnread" class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-600">
                    {{ unreadCount }} ใหม่
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <button v-if="hasUnread" @click="markAllAsRead" class="text-[11px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1">
                    <CheckCheck class="w-3.5 h-3.5" />อ่านทั้งหมด
                  </button>
                  <button @click="notifOpen = false" class="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
                    <X class="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              </div>

              <!-- Notification List -->
              <div class="max-h-[420px] overflow-y-auto">
                <!-- Empty State -->
                <div v-if="notifications.length === 0" class="p-8 text-center">
                  <div class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bell class="w-5 h-5 text-slate-400" />
                  </div>
                  <p class="text-[13px] font-bold text-slate-600">ไม่มีการแจ้งเตือนใหม่</p>
                  <p class="text-[12px] text-slate-400 mt-1">คุณติดตามทุกความเคลื่อนไหวครบถ้วนแล้ว</p>
                </div>

                <!-- Notification Items -->
                <div
                  v-for="n in notifications"
                  :key="n.id"
                  @click="handleNotifClick(n)"
                  class="flex items-start gap-3 px-4 py-3.5 border-b border-slate-50 cursor-pointer hover:brightness-95 transition-all duration-200"
                  :class="notifBg(n)"
                >
                  <div
                    class="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
                    :class="n.is_urgent && !n.is_read ? 'bg-rose-100' : 'bg-slate-100'"
                  >
                    <component :is="notifIcon(n.type)" class="w-5 h-5" :class="notifIconColor(n.type)" />
                  </div>

                  <!-- Content -->
                  <div class="min-w-0 flex-1">
                    <div class="flex items-start justify-between gap-2">
                      <p class="text-[13px] font-black text-slate-900 leading-tight">{{ n.title }}</p>
                      <span v-if="!n.is_read" class="w-2 h-2 bg-rose-500 rounded-full shrink-0 mt-1"></span>
                    </div>
                    <p class="text-[12px] text-slate-500 font-semibold mt-0.5 leading-snug line-clamp-2">{{ n.message }}</p>
                    <div class="flex items-center gap-2 mt-1.5">
                      <span class="text-[10px] text-slate-400 font-bold">{{ timeAgo(n.created_at) }}</span>
                      <span v-if="n.link" class="inline-flex items-center gap-0.5 text-[10px] font-bold text-purple-600">
                        <ExternalLink class="w-2.5 h-2.5" />ดูรายละเอียด
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="text-right hidden md:block">
            <p class="text-[14px] font-bold text-slate-900 tracking-tight">{{ displayName }}</p>
            <p class="text-[10px] font-black uppercase tracking-widest font-['Lato'] mt-0.5 text-purple-600">
              Author
            </p>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        <div class="flex-1">
          <slot />
        </div>

        <footer class="text-center py-10 px-6 border-t border-slate-200/60 mt-auto">
           <p class="text-[12px] text-slate-400 font-semibold">© 2026 สงวนลิขสิทธิ์ โดย {{ conferenceName }}</p>
           <p class="text-[11px] text-slate-300 font-semibold mt-1">Webmaster : cs.bru.ac.th</p>
        </footer>
      </main>
    </div>

    <!-- Logout Modal -->
    <div v-if="showLogoutModal" class="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showLogoutModal = false"></div>
      <div class="bg-white rounded-3xl p-8 max-w-sm w-full relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div class="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <LogOut class="w-8 h-8 text-rose-500" />
        </div>
        <h3 class="text-xl font-black text-slate-900 text-center mb-2">ออกจากระบบ</h3>
        <p class="text-sm font-semibold text-slate-500 text-center mb-8">คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?</p>
        <div class="flex gap-3">
          <button @click="showLogoutModal = false" class="flex-1 py-3 px-4 rounded-2xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors">
            ยกเลิก
          </button>
          <button @click="confirmLogout" class="flex-1 py-3 px-4 rounded-2xl font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-sm transition-colors">
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
    </div>
    
    <template #fallback>
      <!-- SSR Fallback to prevent hydration mismatch entirely -->
      <div class="flex h-screen w-full items-center justify-center bg-slate-50">
        <div class="flex flex-col items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm animate-pulse">
            <div class="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p class="text-[13px] font-bold text-slate-400 uppercase tracking-widest">Loading Portal...</p>
        </div>
      </div>
    </template>
  </ClientOnly>
</template>
