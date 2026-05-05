<script setup>
// Default layout — public pages (landing, news, about, etc.)
import { Home, Newspaper, Info, CalendarDays, Phone, HelpCircle, LogIn, UserPlus } from 'lucide-vue-next';
import { ref, onMounted } from 'vue';
import { useSupabase } from '~/composables/useSupabase';

const route = useRoute();
const supabase = useSupabase();

const navItems = [
  { to: '/', label: 'หน้าแรก', icon: Home },
  { to: '/news', label: 'ข่าวสาร', icon: Newspaper },
  { to: '/about', label: 'เกี่ยวกับ', icon: Info },
  { to: '/contact', label: 'ติดต่อ', icon: Phone },
];

const confName = ref('');
const confVenue = ref('');

onMounted(async () => {
  try {
    const { data } = await supabase.from('system_settings').select('config_json').eq('id', 1).maybeSingle();
    if (data?.config_json?.conference) {
      confName.value = data.config_json.conference.name || '';
      confVenue.value = data.config_json.conference.venue || '';
    }
  } catch {}
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-purple-50 to-white font-sans text-slate-900 flex flex-col">
    <!-- Top Navbar -->
    <nav class="bg-white/80 backdrop-blur-xl border-b border-purple-100/80 sticky top-0 z-50 shadow-[0_1px_20px_rgba(147,51,234,0.06)]">
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-3 sm:gap-4 group min-w-0">
          <img src="~/assets/bru-web-logo-en.png" alt="BRICC Logo" class="h-10 sm:h-12 w-auto object-contain shrink-0 group-hover:-translate-y-0.5 transition-transform duration-300" />
          <div class="hidden sm:block border-l-2 border-slate-200 pl-4 ml-1 min-w-0">
            <div class="text-[16px] font-black text-slate-900 tracking-tight group-hover:text-purple-700 transition-colors leading-tight truncate">
              {{ confName || 'BRICC Festival' }}
            </div>
            <div class="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 truncate font-['Sarabun']">
              {{ confVenue || 'Buriram Rajabhat University' }}
            </div>
          </div>
        </NuxtLink>

        <!-- Nav Links -->
        <div class="hidden lg:flex items-center gap-2">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="px-4 py-2.5 rounded-xl text-[14px] font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap"
            :class="route.path === item.to
              ? 'bg-purple-50 text-purple-700 shadow-sm'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'"
          >
            <component :is="item.icon" class="w-4 h-4" :class="route.path === item.to ? 'text-purple-600' : 'text-slate-400'" />
            {{ item.label }}
          </NuxtLink>
        </div>

        <!-- Auth Buttons -->
        <div class="flex items-center gap-3 shrink-0">
          <NuxtLink
            to="/login"
            class="h-11 px-5 rounded-[18px] border border-slate-200 text-[13px] font-black text-slate-700 hover:bg-slate-50 hover:border-slate-300 inline-flex items-center gap-2 transition-all shadow-sm whitespace-nowrap"
          >
            <LogIn class="w-4 h-4 shrink-0" />
            <span class="hidden sm:inline">เข้าสู่ระบบ</span>
          </NuxtLink>
          <NuxtLink
            to="/register"
            class="h-11 px-6 rounded-[18px] bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[13px] font-black hover:shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5 inline-flex items-center gap-2 transition-all duration-300 whitespace-nowrap"
          >
            <UserPlus class="w-4 h-4 shrink-0" />
            <span class="hidden sm:inline">ลงทะเบียน</span>
          </NuxtLink>
        </div>
      </div>
    </nav>

    <!-- Content -->
    <main class="flex-1 flex flex-col">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-slate-200/60 py-10 mt-auto">
      <div class="max-w-7xl mx-auto px-6 text-center">
        <p class="text-[14px] text-slate-600 font-bold">© {{ new Date().getFullYear() }} สงวนลิขสิทธิ์ โดย มหาวิทยาลัยราชภัฏบุรีรัมย์ (BRU)</p>
        <p class="text-[11px] font-['Lato'] text-slate-400 mt-2 uppercase tracking-widest font-black">
          {{ confName || 'BRICC Festival' }} System • Innovation &amp; Research
        </p>
      </div>
    </footer>
  </div>
</template>
