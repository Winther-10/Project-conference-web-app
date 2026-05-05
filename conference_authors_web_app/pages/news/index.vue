<script setup>
definePageMeta({ layout: 'default' });
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
    return `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
  } catch { return iso; }
};

const formatDate = (v) => {
  if (!v) return '-';
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date(v));
};

// Build highlight banner from settings dates
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
  <div class="flex-1 bg-gradient-to-b from-purple-50 to-white overflow-hidden">

    <!-- Animated bg blobs -->
    <div class="fixed -top-40 right-[-150px] w-[450px] h-[450px] bg-fuchsia-200/25 rounded-full blur-[90px] animate-[pulse_9s_ease-in-out_infinite] pointer-events-none z-0"></div>
    <div class="fixed bottom-0 left-[-100px] w-[350px] h-[350px] bg-purple-200/20 rounded-full blur-[80px] animate-[pulse_7s_ease-in-out_infinite_reverse] pointer-events-none z-0"></div>

    <div class="relative z-10 max-w-5xl mx-auto px-6 py-12">

      <!-- Header -->
      <div class="mb-10">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 border border-purple-200 text-[11px] font-black uppercase tracking-widest text-purple-600 mb-4">
          <Newspaper class="w-3.5 h-3.5" />
          Latest News
        </div>
        <h1 class="text-4xl font-black text-purple-950 tracking-tight">ข่าวสารและประกาศ</h1>
        <p class="mt-2 text-[15px] font-semibold text-purple-700/60 font-['Sarabun']">
          ติดตามข่าวสารและประกาศสำคัญของงานประชุมวิชาการ
        </p>
      </div>

      <!-- Dynamic Highlight Banners from system_settings -->
      <div v-if="highlightItems.length" class="mb-6 space-y-3">
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
              ประกาศ
            </div>
            <div class="font-black text-[16px]">{{ item.text }}</div>
          </div>
        </div>
      </div>

      <!-- Fallback banner when no settings dates -->
      <div v-else-if="!isLoading" class="mb-8 rounded-[28px] bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 p-6 text-white flex items-center gap-5 shadow-lg shadow-purple-300/30 relative overflow-hidden">
        <div class="absolute -right-10 -top-10 w-[200px] h-[200px] bg-white/10 rounded-full blur-2xl animate-[pulse_5s_ease-in-out_infinite]"></div>
        <div class="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
          <Bell class="w-6 h-6" />
        </div>
        <div class="relative z-10">
          <div class="text-xs font-black text-white/70 uppercase tracking-widest mb-1">ยินดีต้อนรับ</div>
          <div class="font-black text-[16px]">ติดตามข่าวสารงานประชุมวิชาการ{{ conf.name ? ` ${conf.name}` : '' }}ได้ที่นี่</div>
        </div>
      </div>

      <!-- Important Dates Quick Bar -->
      <div v-if="conf.dates?.submissionClose || conf.dates?.conferenceDate" class="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div v-if="conf.dates?.submissionOpen" class="rounded-2xl bg-white/80 border border-purple-100 p-4 text-center">
          <div class="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">เปิดรับบทความ</div>
          <div class="text-sm font-black text-purple-900">{{ formatThaiDate(conf.dates.submissionOpen) }}</div>
        </div>
        <div v-if="conf.dates?.submissionClose" class="rounded-2xl bg-white/80 border border-purple-100 p-4 text-center">
          <div class="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">ปิดรับบทความ</div>
          <div class="text-sm font-black text-purple-900">{{ formatThaiDate(conf.dates.submissionClose) }}</div>
        </div>
        <div v-if="conf.dates?.announcementDate" class="rounded-2xl bg-white/80 border border-purple-100 p-4 text-center">
          <div class="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">ประกาศผล</div>
          <div class="text-sm font-black text-purple-900">{{ formatThaiDate(conf.dates.announcementDate) }}</div>
        </div>
        <div v-if="conf.dates?.conferenceDate" class="rounded-2xl bg-white/80 border border-purple-100 p-4 text-center">
          <div class="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">วันจัดงาน</div>
          <div class="text-sm font-black text-purple-900">{{ formatThaiDate(conf.dates.conferenceDate) }}</div>
        </div>
      </div>

      <!-- News Grid -->
      <div v-if="isLoading" class="text-center py-10">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
      </div>
      <div v-else-if="newsList.length === 0" class="text-center py-10 text-purple-700/60 font-semibold">
        ยังไม่มีข่าวสารในขณะนี้
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <NuxtLink
          v-for="item in newsList"
          :key="item.id"
          :to="`/news/${item.id}`"
          class="group rounded-[24px] bg-white/80 backdrop-blur-xl border border-purple-100 p-6 cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:border-purple-200 transition-all duration-300"
        >
          <div class="flex items-center justify-between mb-4">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border bg-purple-100 text-purple-700 border-purple-200">
              <span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              ข่าวสาร
            </span>
            <div class="flex items-center gap-1.5 text-[11px] font-semibold text-purple-400">
              <CalendarDays class="w-3.5 h-3.5" />
              {{ formatDate(item.published_at || item.created_at) }}
            </div>
          </div>
          <h3 class="text-[15px] font-black text-purple-950 leading-snug mb-2 group-hover:text-purple-700 transition-colors">{{ item.title }}</h3>
          <p class="text-[13px] font-semibold text-purple-700/60 leading-relaxed line-clamp-2" v-html="item.excerpt || (item.content || '').replace(/<[^>]+>/g, '').substring(0, 100) + '...'"></p>
        </NuxtLink>
      </div>

      <!-- Coming soon note -->
      <div class="mt-10 rounded-[24px] bg-white/60 backdrop-blur-xl border border-purple-100 p-8 text-center">
        <div class="w-14 h-14 bg-purple-50 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-100">
          <Tag class="w-7 h-7" />
        </div>
        <div class="text-[15px] font-black text-purple-950 mb-2">กำลังมีเพิ่มเติม...</div>
        <p class="text-[13px] font-semibold text-purple-600/60 max-w-sm mx-auto">หน้านี้จะอัปเดตข่าวสารและประกาศสำคัญของการประชุมวิชาการอย่างต่อเนื่อง</p>
      </div>

    </div>
  </div>
</template>
