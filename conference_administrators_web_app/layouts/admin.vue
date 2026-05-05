<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSupabase } from '~/composables/useSupabase';
import {
  LayoutDashboard, FileText, CalendarDays, Megaphone, CreditCard,
  BarChart3, ShieldCheck, Settings, LogOut, ChevronDown,
  Bell, Users, Trophy, Shield, Search, UserCheck, Menu, X, Check, BellRing,
  FolderOpen, PieChart, Activity, BellRing as BellIcon, User
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const supabase = useSupabase();

const settingsState = useState('system_settings');

// Load settings if not already present
onMounted(async () => {
  if (!settingsState.value) {
    const { data } = await supabase.from('settings').select('*').single();
    if (data) settingsState.value = data;
  }
});

const conferenceName = computed(() => settingsState.value?.conference?.name || 'BRICC Festival 2027');
const conferenceSubName = computed(() => settingsState.value?.conference?.sub_name || 'The 10th Buriram Rajabhat Conference');

const userProfile = ref(null);
const adminDisplayName = computed(() => {
  if (!userProfile.value) return 'Administrator';
  const u = userProfile.value;
  return `${u.first_name_th || ''} ${u.last_name_th || ''}`.trim() || u.email || 'Administrator';
});

const sidebarOpen = ref(true);
const mobileMenuOpen = ref(false);
const loggingOut = ref(false);

const navGroups = [
  {
    key: 'main',
    items: [
      { label: 'หน้าหลัก (Dashboard)', icon: LayoutDashboard, to: '/', exact: true },
      { label: 'จัดการตาราง', icon: CalendarDays, to: '/schedule' },
    ]
  },
  {
    key: 'papers',
    label: 'บทความ',
    items: [
      { label: 'จัดการบทความ', icon: FileText, to: '/papers' },
      { label: 'รายชื่อผู้เข้าร่วม', icon: Users, to: '/attendees' },
      { label: 'จัดการรางวัล', icon: Trophy, to: '/awards' },
      { label: 'จัดการเอกสาร', icon: FolderOpen, to: '/downloads' },
    ]
  },
  {
    key: 'news',
    label: 'ข่าวสาร',
    items: [
      { label: 'รายการข่าวสาร', icon: Megaphone, to: '/news' },
      { label: 'สร้างข่าวใหม่', icon: Megaphone, to: '/news/create' },
    ]
  },
  {
    key: 'reports',
    label: 'รายงาน',
    items: [
      { label: 'การส่งบทความ', icon: BarChart3, to: '/reports/submissions' },
      { label: 'ผู้สมัคร', icon: BarChart3, to: '/reports/attendees' },
    ]
  },
  {
    key: 'roles',
    label: 'สิทธิ์ & บุคลากร',
    items: [
      { label: 'จัดการกรรมการ', icon: Users, to: '/roles/reviewers' },
      { label: 'Phase 2 — สิทธิ์ & คะแนน', icon: Trophy, to: '/phase2/permissions' },
      { label: 'สิทธิ์การใช้งาน', icon: Shield, to: '/roles/permissions' },
      { label: 'ผู้ดูแลระบบ', icon: ShieldCheck, to: '/roles/admins' },
    ]
  },
  {
    key: 'settings',
    label: 'ระบบ',
    items: [
      { label: 'ตั้งค่าระบบ', icon: Settings, to: '/settings' },
    ]
  }
];

const expanded = ref({ papers: true, news: true, reports: true, roles: true, settings: true });
const toggleGroup = (key) => { expanded.value[key] = !expanded.value[key]; };
const isActive = (to, exact = false) => exact ? route.path === to : route.path.startsWith(to);
const isGroupExpanded = (key) => sidebarOpen.value ? !!expanded.value[key] : true;

onMounted(async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('users').select('*').eq('user_id', user.id).single();
      if (profile) userProfile.value = profile;
    }
  } catch (e) {}
});

const handleLogout = async () => {
  loggingOut.value = true;
  await supabase.auth.signOut();
  router.push('/admin/login');
};
</script>

<template>
  <div class="flex h-screen bg-slate-50 font-['Sarabun'] text-slate-800 overflow-hidden relative">
    
    <!-- Background Decoration -->
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-40">
      <div class="absolute top-[-10%] left-[-5%] w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div class="absolute top-[20%] right-[-5%] w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
    </div>

    <!-- Sidebar -->
    <ClientOnly>
      <aside
        class="fixed md:static left-0 top-0 h-full bg-white/95 backdrop-blur-2xl flex flex-col z-40 md:z-20 shadow-[20px_0_40px_-15px_rgba(139,92,246,0.08)] border-r border-purple-100/80 transition-all duration-300 ease-out"
        :class="[mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0', sidebarOpen ? 'md:w-80' : 'md:w-20', 'w-80']"
      >
        <!-- Sidebar Header (Matched to Author Image) -->
        <div class="py-7 flex items-center px-7 border-b border-purple-50 shrink-0 relative overflow-hidden bg-white/40 backdrop-blur-sm">
          <div class="flex items-center gap-2 relative z-10 w-full" :class="!sidebarOpen ? 'justify-center px-0' : ''">
            <img src="~/assets/bru-web-logo-en.png" alt="Logo" class="w-auto h-9 object-contain shrink-0" />
            
            <div v-if="sidebarOpen" class="min-w-0 flex-1 border-l-2 border-purple-100/80 pl-6 flex flex-col justify-center">
              <!-- Line 1: Bold, Uppercase -->
              <h1 class="font-black text-[15px] leading-tight text-slate-900 tracking-tight whitespace-normal">{{ conferenceName }}</h1>
              <!-- Line 3: Tag, Uppercase -->
              <p class="text-[10px] text-purple-700 font-black tracking-[0.2em] uppercase mt-3 font-['Lato']">ADMIN PORTAL</p>
            </div>
          </div>
        </div>

        <nav class="flex-1 overflow-y-auto px-3 py-6 space-y-1 custom-scrollbar">
          <template v-for="group in navGroups" :key="group.key">
            <template v-if="!group.label">
              <NuxtLink
                v-for="item in group.items" :key="item.to" :to="item.to"
                class="relative flex items-center gap-4 px-4 py-3 rounded-2xl text-[14px] font-black transition-all duration-300 group overflow-hidden"
                :class="[
                  isActive(item.to, item.exact) ? 'bg-[#F5F3FF] text-[#8B5CF6]' : 'text-slate-500 hover:bg-slate-50 hover:text-purple-600',
                  !sidebarOpen ? 'justify-center px-0' : ''
                ]"
                @click="mobileMenuOpen = false"
              >
                <div v-if="isActive(item.to, item.exact)" class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-purple-600 rounded-r-full"></div>
                <component :is="item.icon" class="w-[18px] h-[18px] shrink-0" :class="isActive(item.to, item.exact) ? 'text-purple-600' : 'text-slate-400'" />
                <span v-if="sidebarOpen" class="truncate ml-1">{{ item.label }}</span>
              </NuxtLink>
            </template>
            <div v-else class="pt-4">
              <button @click="toggleGroup(group.key)" class="w-full flex items-center justify-between px-4 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <span v-if="sidebarOpen">{{ group.label }}</span>
                <ChevronDown v-if="sidebarOpen" class="w-3 h-3 transition-transform duration-300" :class="isGroupExpanded(group.key) ? 'rotate-180' : ''" />
                <div v-if="!sidebarOpen" class="w-full h-px bg-slate-100 mx-1"></div>
              </button>
              <div v-if="isGroupExpanded(group.key)" class="mt-1.5 space-y-1">
                <NuxtLink
                  v-for="item in group.items" :key="item.to" :to="item.to"
                  class="relative flex items-center gap-4 px-4 py-2.5 rounded-2xl text-[14px] font-black transition-all duration-300 group overflow-hidden"
                  :class="[
                    isActive(item.to) ? 'bg-[#F5F3FF] text-[#8B5CF6]' : 'text-slate-500 hover:bg-slate-50 hover:text-purple-600',
                    !sidebarOpen ? 'justify-center px-0' : ''
                  ]"
                  @click="mobileMenuOpen = false"
                >
                  <div v-if="isActive(item.to)" class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-purple-600 rounded-r-full"></div>
                  <component :is="item.icon" class="w-4 h-4 shrink-0" :class="isActive(item.to) ? 'text-purple-600' : 'text-slate-400'" />
                  <span v-if="sidebarOpen" class="truncate ml-1">{{ item.label }}</span>
                </NuxtLink>
              </div>
            </div>
          </template>
        </nav>

        <!-- Sidebar Footer -->
        <div class="p-6 border-t border-purple-50 bg-white/50 shrink-0 space-y-5 flex flex-col items-center">
          <div class="flex items-center gap-4 w-full" :class="!sidebarOpen ? 'justify-center' : ''">
            <div class="w-12 h-12 rounded-full border-2 border-slate-100 p-0.5 overflow-hidden shrink-0 shadow-sm bg-slate-50 flex items-center justify-center">
               <img v-if="userProfile?.avatar_url" :src="userProfile.avatar_url" class="w-full h-full object-cover rounded-full" />
               <User v-else class="w-5 h-5 text-slate-300" />
            </div>
            <div v-if="sidebarOpen" class="min-w-0">
              <div class="text-[15px] font-black text-slate-800 truncate leading-tight">{{ adminDisplayName }}</div>
              <div class="text-[12px] font-bold text-slate-400 mt-0.5">Admin</div>
            </div>
          </div>
          
          <button 
            @click="handleLogout" 
            class="w-full flex items-center gap-3 text-slate-400 hover:text-rose-600 text-[14px] font-black transition-all group"
            :class="!sidebarOpen ? 'justify-center' : 'px-1'"
          >
            <LogOut class="w-5 h-5 transition-transform group-hover:translate-x-1" />
            <span v-if="sidebarOpen" class="ml-1">{{ loggingOut ? 'กำลังออก...' : 'ออกจากระบบ' }}</span>
          </button>
        </div>
      </aside>
    </ClientOnly>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0 relative z-10 overflow-hidden">
      <header class="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-6 md:px-10 sticky top-0 z-20 shrink-0 shadow-sm">
        <div class="flex items-center gap-4">
          <button @click="mobileMenuOpen = true" class="md:hidden p-2 text-slate-500"><Menu class="w-5 h-5" /></button>
          <button @click="sidebarOpen = !sidebarOpen" class="hidden md:flex h-10 w-10 items-center justify-center bg-white border border-slate-100 rounded-full text-slate-500 hover:text-purple-600 transition-all hover:shadow-lg">
            <X v-if="sidebarOpen" class="w-[18px] h-[18px]" />
            <Menu v-else class="w-[18px] h-[18px]" />
          </button>
        </div>
        
        <div class="flex items-center gap-4 sm:gap-6">
          <button class="relative w-10 h-10 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-purple-600 hover:border-purple-200 transition-all shadow-sm group">
            <BellIcon class="w-[18px] h-[18px]" />
            <span class="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white"></span>
          </button>

          <div class="text-right">
            <div class="text-[14px] font-black text-slate-900 leading-tight">{{ adminDisplayName }}</div>
            <div class="text-[9px] font-black text-purple-600 uppercase tracking-widest mt-1">ADMIN</div>
          </div>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto custom-scrollbar">
        <slot />
      </main>
    </div>
    
    <div v-if="mobileMenuOpen" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden" @click="mobileMenuOpen = false"></div>
  </div>
</template>

<style scoped>
.animate-blob { animation: blob 7s infinite; }
.animation-delay-2000 { animation-delay: 2s; }
@keyframes blob {
  0% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0, 0) scale(1); }
}
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
</style>
