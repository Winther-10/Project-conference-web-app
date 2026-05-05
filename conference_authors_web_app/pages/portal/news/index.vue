<script setup>
definePageMeta({ layout: 'portal' });
import { Newspaper, Bell, CalendarDays, Tag, Clock } from 'lucide-vue-next';
import { ref, computed, onMounted } from 'vue';
import { useSupabase } from '~/composables/useSupabase';

const supabase = useSupabase();
const newsList = ref([]);
const isLoading = ref(true);

const conf = ref({
  name: '',
  year: '',
  dates: { submissionOpen: '', submissionClose: '', announcementDate: '', conferenceDate: '' }
});

onMounted(async () => {
  const [newsRes, settingsRes] = await Promise.all([
    supabase.from('news').select('*').eq('status', 'published').order('published_at', { ascending: false }),
    supabase.from('system_settings').select('config_json').eq('id', 1).maybeSingle()
  ]);
  if (newsRes.data) newsList.value = newsRes.data;
  if (settingsRes.data?.config_json?.conference) {
    conf.value = { ...conf.value, ...settingsRes.data.config_json.conference };
  }
  isLoading.value = false;
});

const thaiMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const formatThaiDate = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    // Remove + 543 to stay in A.D. (Common Era)
    return `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear()}`;
  } catch { return iso; }
};

const formatDate = (v) => {
  if (!v) return '-';
  // Use Gregory calendar for A.D. year with Thai locale for month names
  return new Intl.DateTimeFormat('th-TH-u-ca-gregory', { dateStyle: 'medium' }).format(new Date(v));
};

const highlightItems = computed(() => {
  const items = [];
  const now = new Date();
  const d = conf.value.dates;

  if (d.submissionOpen && d.submissionClose) {
    const openDate = new Date(d.submissionOpen);
    const closeDate = new Date(d.submissionClose);
    if (now >= openDate && now <= closeDate) {
      items.push({ text: `ระบบส่งบทความเปิดรับแล้ว — กำหนดปิดรับ ${formatThaiDate(d.submissionClose)}`, urgent: true });
    } else if (now < openDate) {
      items.push({ text: `ระบบส่งบทความจะเปิดรับในวันที่ ${formatThaiDate(d.submissionOpen)}`, urgent: false });
    } else {
      items.push({ text: `ปิดรับบทความแล้ว — รอประกาศผล ${formatThaiDate(d.announcementDate)}`, urgent: false });
    }
  }
  if (d.conferenceDate) {
    const confDate = new Date(d.conferenceDate);
    const daysLeft = Math.ceil((confDate - now) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0 && daysLeft <= 60) {
      items.push({ text: `งานประชุมวิชาการเหลืออีก ${daysLeft} วัน — ${formatThaiDate(d.conferenceDate)}`, urgent: false });
    }
  }
  return items;
});
</script>

<template>
  <div class="p-8 max-w-6xl mx-auto font-['Sarabun'] animate-in fade-in duration-500">
    <!-- Header -->
    <div class="mb-10">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 border border-indigo-200 text-[11px] font-black uppercase tracking-widest text-indigo-600 mb-4">
        <Newspaper class="w-3.5 h-3.5" />
        Portal News
      </div>
      <h1 class="text-4xl font-black text-slate-900 tracking-tight">ข่าวสารและประกาศ</h1>
      <p class="mt-2 text-[15px] font-medium text-slate-500">
        ติดตามข่าวสารและประกาศสำคัญสำหรับผู้ส่งบทความ
      </p>
    </div>

    <!-- Dynamic Highlight Banners from system_settings -->
    <div v-if="highlightItems.length" class="mb-8 space-y-3">
      <div
        v-for="(item, i) in highlightItems"
        :key="i"
        :class="[
          'rounded-[28px] p-6 text-white flex items-center gap-5 shadow-lg relative overflow-hidden',
          item.urgent
            ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 shadow-purple-300/30'
            : 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-indigo-300/20'
        ]"
      >
        <div class="absolute -right-10 -top-10 w-[200px] h-[200px] bg-white/10 rounded-full blur-2xl animate-[pulse_5s_ease-in-out_infinite]"></div>
        <div class="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
          <Bell class="w-6 h-6" />
        </div>
        <div class="relative z-10">
          <div class="text-xs font-black text-white/70 uppercase tracking-widest mb-1 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full animate-pulse" :class="item.urgent ? 'bg-yellow-400' : 'bg-emerald-400'"></span>
            ประกาศสำคัญ
          </div>
          <div class="font-black text-[16px]">{{ item.text }}</div>
        </div>
      </div>
    </div>

    <!-- News Grid -->
    <div v-if="isLoading" class="text-center py-10">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
    </div>
    <div v-else-if="newsList.length === 0" class="text-center py-10 text-slate-500 font-semibold bg-white rounded-3xl border border-slate-200">
      ยังไม่มีข่าวสารในขณะนี้
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <NuxtLink
        v-for="item in newsList"
        :key="item.id"
        :to="`/news/${item.id}`"
        class="group flex flex-col sm:flex-row gap-5 p-5 rounded-[24px] border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
      >
        <div class="w-full sm:w-28 h-40 sm:h-28 rounded-[18px] flex-shrink-0 bg-cover bg-center shadow-inner overflow-hidden" 
             :class="!item.cover_image_url ? 'bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center' : ''"
             :style="item.cover_image_url ? { backgroundImage: `url(${item.cover_image_url})` } : {}">
             <Newspaper v-if="!item.cover_image_url" class="w-8 h-8 text-indigo-300" />
        </div>
        <div class="flex-1 flex flex-col justify-center">
          <span class="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md mb-2 inline-block w-fit font-['Sarabun']">
            {{ item.category || 'ประกาศ' }}
          </span>
          <h4 class="text-[15px] font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2">
            {{ item.title }}
          </h4>
          <p class="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5 font-bold tracking-wider font-['Lato']">
            <Clock :size="12"/> {{ formatDate(item.published_at || item.created_at) }}
          </p>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
