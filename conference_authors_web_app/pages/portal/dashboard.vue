<script setup>
definePageMeta({ layout: 'portal' });
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { Bell, CheckCircle2, Clock, FileText, Megaphone, X } from 'lucide-vue-next';
import { useAuth } from '~/composables/useAuth';
import { useSupabase } from '~/composables/useSupabase';

const router = useRouter();
const { userProfile } = useAuth();
const supabase = useSupabase();

const papers = ref([]);
const recentNews = ref([]);
const isLoading = ref(true);

// Conference settings
const conferenceName = ref('BRICC Festival');
const confDates = ref({ submissionClose: null, announcementDate: null, conferenceDate: null });

// Live countdown state
const countdown = ref({ days: 0, hours: 0, minutes: 0, seconds: 0 });
let countdownTimer = null;

// Determine current phase based on dates
const phase = computed(() => {
  const now = new Date();
  const d = confDates.value;
  const close = d.submissionClose ? new Date(d.submissionClose) : null;
  const announce = d.announcementDate ? new Date(d.announcementDate) : null;
  const conf = d.conferenceDate ? new Date(d.conferenceDate) : null;

  if (!close) return 'unknown';
  if (now < close) return 'submission';        // กำลังเปิดรับบทความ
  if (announce && now < announce) return 'reviewing'; // ปิดรับแล้ว รอประกาศผล
  if (conf && now < conf) return 'announced';  // ประกาศผลแล้ว รอวันจัดงาน
  if (conf && now >= conf) return 'done';      // จบงานแล้ว
  return 'closed'; // ปิดรับแล้ว ไม่มีวันถัดไป
});

const phaseConfig = computed(() => {
  const d = confDates.value;
  const configs = {
    submission:  { label: 'ระบบเปิดรับบทความ',     dot: 'bg-purple-500', badge: 'border-purple-200 text-purple-700 bg-white/60', title: 'ปิดรับบทความอีก', target: d.submissionClose,  countdownColor: 'text-purple-900', secColor: 'text-fuchsia-700', secLabelColor: 'text-fuchsia-400' },
    reviewing:   { label: 'อยู่ในช่วงพิจารณา',       dot: 'bg-amber-500',  badge: 'border-amber-200 text-amber-700 bg-white/60',  title: 'ประกาศผลอีก',    target: d.announcementDate, countdownColor: 'text-amber-900',  secColor: 'text-orange-600',  secLabelColor: 'text-orange-400' },
    announced:   { label: 'ประกาศผลแล้ว รอวันจัดงาน', dot: 'bg-emerald-500', badge: 'border-emerald-200 text-emerald-700 bg-white/60', title: 'วันจัดงานอีก', target: d.conferenceDate, countdownColor: 'text-emerald-900', secColor: 'text-teal-600',    secLabelColor: 'text-teal-400' },
    done:        { label: 'งานสิ้นสุดแล้ว',           dot: 'bg-slate-400',  badge: 'border-slate-200 text-slate-600 bg-white/60',  title: null, target: null, countdownColor: 'text-slate-700', secColor: 'text-slate-500', secLabelColor: 'text-slate-400' },
    closed:      { label: 'ปิดรับบทความแล้ว',        dot: 'bg-rose-500',   badge: 'border-rose-200 text-rose-700 bg-white/60',    title: null, target: null, countdownColor: 'text-slate-700', secColor: 'text-slate-500', secLabelColor: 'text-slate-400' },
    unknown:     { label: 'ระบบการประชุม',            dot: 'bg-slate-400',  badge: 'border-slate-200 text-slate-600 bg-white/60',  title: null, target: null, countdownColor: 'text-slate-700', secColor: 'text-slate-500', secLabelColor: 'text-slate-400' },
  };
  return configs[phase.value] || configs.unknown;
});

const updateCountdown = () => {
  const target = phaseConfig.value.target;
  if (!target) { countdown.value = { days: 0, hours: 0, minutes: 0, seconds: 0 }; return; }
  const diff = new Date(target) - new Date();
  if (diff <= 0) { countdown.value = { days: 0, hours: 0, minutes: 0, seconds: 0 }; return; }
  const t = Math.floor(diff / 1000);
  countdown.value = { days: Math.floor(t / 86400), hours: Math.floor((t % 86400) / 3600), minutes: Math.floor((t % 3600) / 60), seconds: t % 60 };
};

onMounted(async () => {
  if (userProfile.value) {
    const { data } = await supabase.from('papers').select('*').eq('author_id', userProfile.value.user_id).order('created_at', { ascending: false });
    papers.value = data || [];
  }

  const [newsRes, settingsRes] = await Promise.all([
    supabase.from('news').select('*').eq('status', 'published').order('published_at', { ascending: false }).limit(2),
    supabase.from('system_settings').select('config_json').single()
  ]);

  recentNews.value = newsRes.data || [];

  if (settingsRes.data?.config_json?.conference) {
    const conf = settingsRes.data.config_json.conference;
    if (conf.name) conferenceName.value = conf.name;
    if (conf.dates) {
      confDates.value = {
        submissionClose:  conf.dates.submissionClose  || null,
        announcementDate: conf.dates.announcementDate || null,
        conferenceDate:   conf.dates.conferenceDate   || null,
      };
    }
  }

  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);
  isLoading.value = false;
});

onUnmounted(() => { if (countdownTimer) clearInterval(countdownTimer); });

const padTwo = (n) => String(n).padStart(2, '0');

const formatDate = (v) => {
  if (!v) return '-';
  // Use Gregory calendar for A.D. year with Thai locale for month names
  return new Intl.DateTimeFormat('th-TH-u-ca-gregory', { dateStyle: 'medium' }).format(new Date(v));
};

const onNavigate = (path) => { router.push(`/portal/${path}`); };

const authorName = computed(() => {
  if (!userProfile.value) return 'ผู้ใช้งาน';
  const th = [userProfile.value.first_name_th, userProfile.value.last_name_th].filter(Boolean).join(' ');
  const en = [userProfile.value.first_name_en, userProfile.value.last_name_en].filter(Boolean).join(' ');
  return th || en || userProfile.value.email;
});

const getStatusLabel = (status) => {
  const map = { draft: 'ฉบับร่าง', pending: 'รอพิจารณา', pending_review: 'รอพิจารณา', revision: 'รอแก้ไข', accepted: 'ผ่าน', published: 'ตีพิมพ์', rejected: 'ไม่ผ่าน' };
  return map[(status || '').toLowerCase()] || status || 'รอพิจารณา';
};
</script>

<template>
  <div class="flex-1 px-6 pt-10 pb-10 no-scrollbar animate-in fade-in duration-500 max-w-6xl mx-auto font-['Sarabun']">
    <!-- Header space removed per user request -->
    
    <section class="mb-8">
      <h2 class="text-3xl font-black text-slate-900 mb-1.5 tracking-tight">สวัสดี, {{ authorName }}</h2>
      <p class="text-[15px] font-medium text-slate-500">ยินดีต้อนรับสู่แดชบอร์ดจัดการข้อมูลของคุณ</p>
    </section>
    
    <section class="mb-10">
      <div class="relative bg-gradient-to-br from-purple-200 via-fuchsia-100 to-indigo-200 rounded-[32px] p-8 md:p-12 text-slate-800 overflow-hidden shadow-sm border border-purple-100 transition-all duration-700 hover:shadow-purple-200/50 hover:shadow-xl group">
          <!-- Animated Background decoration -->
          <div class="absolute -right-20 -top-20 w-[400px] h-[400px] bg-purple-300/30 rounded-full blur-[60px] animate-[pulse_6s_ease-in-out_infinite] group-hover:scale-110 transition-transform duration-1000"></div>
          <div class="absolute right-40 bottom-[-100px] w-[300px] h-[300px] bg-fuchsia-300/20 rounded-full blur-[50px] animate-[pulse_8s_ease-in-out_infinite_reverse]"></div>
          
          <div class="relative z-10 flex flex-col lg:flex-row justify-between lg:items-center gap-8">
              <div class="max-w-2xl">
                <span :class="['backdrop-blur-md px-4 py-1.5 rounded-full text-[12px] font-black tracking-wide mb-6 inline-flex items-center gap-2 border shadow-sm animate-bounce', phaseConfig.badge]">
                  <span :class="['w-2 h-2 rounded-full animate-pulse', phaseConfig.dot]"></span>
                  {{ phaseConfig.label }}
                </span>
                <h2 class="text-4xl md:text-5xl font-black mb-4 tracking-tight leading-tight font-['Lato'] text-purple-950">
                  {{ conferenceName }}
                </h2>
                <p class="text-purple-800/80 text-[14px] md:text-[15px] font-semibold leading-relaxed max-w-xl">
                  ระบบส่งบทความและการจัดการพิจารณาออนไลน์ กรุณาตรวจสอบรูปแบบและข้อกำหนด<br class="hidden md:block"/> (Formatting Guidelines) ก่อนทำการส่งผลงานเข้าร่วมนำเสนอ
                </p>
                <div class="mt-8 flex items-center gap-4">
                  <button @click="onNavigate('submit')" class="h-12 px-8 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-[14px] hover:shadow-[0_8px_30px_rgb(147,51,234,0.3)] hover:-translate-y-0.5 transition-all duration-300">
                    ส่งบทความใหม่
                  </button>
                </div>
              </div>
              
              <!-- Countdown Card (Phase-aware) -->
              <div class="text-center bg-white/60 backdrop-blur-xl p-7 rounded-[24px] border border-white shadow-xl min-w-[300px] transform hover:scale-105 transition-transform duration-500">
                <p class="text-[13px] text-purple-600 mb-1 font-black font-['Sarabun'] tracking-normal">
                  {{ phaseConfig.title || 'สถานะงานประชุม' }}
                </p>

                <!-- No dates set -->
                <div v-if="phase === 'unknown'" class="text-slate-400 font-bold text-sm py-4">ยังไม่ได้กำหนดวันที่</div>

                <!-- Conference is done -->
                <div v-else-if="phase === 'done'" class="py-4">
                  <div class="text-2xl font-black text-slate-600 mb-1">🎉 งานสิ้นสุดแล้ว</div>
                  <div class="text-[12px] text-slate-500 font-semibold">ขอบคุณทุกท่านที่เข้าร่วม</div>
                </div>

                <!-- Closed but no next date -->
                <div v-else-if="phase === 'closed'" class="py-4">
                  <div class="text-xl font-black text-rose-600 mb-1">ปิดรับบทความแล้ว</div>
                  <div class="text-[12px] text-slate-500 font-semibold">กำลังอยู่ในขั้นตอนพิจารณา</div>
                </div>

                <!-- Active countdown -->
                <div v-else class="flex items-end justify-center gap-1.5 mt-2">
                  <div class="text-center">
                    <span class="text-[38px] font-black font-['Lato'] tracking-tighter leading-none" :class="phaseConfig.countdownColor">{{ countdown.days }}</span>
                    <span class="text-[10px] block font-bold tracking-widest mt-1 text-slate-500">DAYS</span>
                  </div>
                  <span class="text-2xl font-light text-purple-300 mb-4">:</span>
                  <div class="text-center">
                    <span class="text-[38px] font-black font-['Lato'] tracking-tighter leading-none" :class="phaseConfig.countdownColor">{{ padTwo(countdown.hours) }}</span>
                    <span class="text-[10px] block font-bold tracking-widest mt-1 text-slate-500">HRS</span>
                  </div>
                  <span class="text-2xl font-light text-purple-300 mb-4">:</span>
                  <div class="text-center">
                    <span class="text-[38px] font-black font-['Lato'] tracking-tighter leading-none" :class="phaseConfig.countdownColor">{{ padTwo(countdown.minutes) }}</span>
                    <span class="text-[10px] block font-bold tracking-widest mt-1 text-slate-500">MIN</span>
                  </div>
                  <span class="text-2xl font-light text-purple-300 mb-4">:</span>
                  <div class="text-center">
                    <span class="text-[38px] font-black font-['Lato'] tracking-tighter tabular-nums leading-none" :class="phaseConfig.secColor">{{ padTwo(countdown.seconds) }}</span>
                    <span class="text-[10px] block font-bold tracking-widest mt-1" :class="phaseConfig.secLabelColor">SEC</span>
                  </div>
                </div>
              </div>
          </div>
      </div>
    </section>

    <!-- Stats Cards -->
    <section class="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      <div class="bg-white rounded-[28px] p-7 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
            <FileText :size="18" />
          </div>
        </div>
        <div>
          <div class="text-3xl font-black text-slate-900 font-['Lato'] leading-none">{{ papers.length }}</div>
          <div class="text-[12px] font-bold text-slate-500 mt-1">บทความทั้งหมด</div>
        </div>
      </div>
      <div class="bg-white rounded-[28px] p-7 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <Clock :size="18" />
          </div>
        </div>
        <div>
          <div class="text-3xl font-black text-slate-900 font-['Lato'] leading-none">{{ papers.filter(p => p.status?.toLowerCase().includes('pending')).length }}</div>
          <div class="text-[12px] font-bold text-slate-500 mt-1">รอพิจารณา</div>
        </div>
      </div>
      <div class="bg-white rounded-[28px] p-7 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 :size="18" />
          </div>
        </div>
        <div>
          <div class="text-3xl font-black text-slate-900 font-['Lato'] leading-none">{{ papers.filter(p => p.status?.toLowerCase() === 'accepted').length }}</div>
          <div class="text-[12px] font-bold text-slate-500 mt-1">ผ่านการพิจารณา</div>
        </div>
      </div>
      <div class="bg-white rounded-[28px] p-7 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
            <X :size="18" />
          </div>
        </div>
        <div>
          <div class="text-3xl font-black text-slate-900 font-['Lato'] leading-none">{{ papers.filter(p => p.status?.toLowerCase() === 'rejected').length }}</div>
          <div class="text-[12px] font-bold text-slate-500 mt-1">ไม่ผ่านพิจารณา</div>
        </div>
      </div>
    </section>

    <!-- Recent Papers -->
    <section class="mb-10" v-if="papers.length > 0">
      <div class="bg-white/80 backdrop-blur-lg border border-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div class="flex justify-between items-center mb-8">
          <h3 class="font-black text-slate-900 text-xl flex items-center gap-3 tracking-tight">
            <div class="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <FileText :size="16" />
            </div>
            บทความล่าสุดของคุณ
          </h3>
          <button @click="onNavigate('articles')" class="h-10 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-[13px] font-black text-slate-600 transition-colors">
            ดูทั้งหมด
          </button>
        </div>
        <div class="space-y-4">
          <div v-for="paper in papers.slice(0, 3)" :key="paper.id" class="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-[20px] bg-slate-50/50 border border-slate-100 hover:border-purple-200 hover:bg-white hover:shadow-md transition-all duration-300 gap-4">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-3 mb-2">
                <span class="text-[11px] font-black text-slate-400 tracking-widest font-['Lato']">#{{ paper.paper_code || paper.paper_id?.slice(0, 8).toUpperCase() }}</span>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-white border border-slate-200 text-slate-600 uppercase tracking-wider shadow-sm">{{ getStatusLabel(paper.status) }}</span>
              </div>
              <div class="text-[15px] font-bold text-slate-900 truncate leading-snug">{{ paper.title_th || paper.title_en }}</div>
            </div>
            <button @click="onNavigate('articles')" class="h-11 px-6 rounded-xl bg-white border border-slate-200 text-slate-700 text-[13px] font-black hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm shrink-0">
              จัดการ
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- News -->
    <section class="mb-6">
       <div class="bg-white/80 backdrop-blur-lg border border-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
         <div class="flex justify-between items-center mb-8">
           <h3 class="font-black text-slate-900 text-xl flex items-center gap-3 tracking-tight">
             <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
               <Megaphone :size="16" />
             </div>
             ข่าวสารและประกาศ
           </h3>
           <button @click="onNavigate('news')" class="h-10 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-[13px] font-black text-slate-600 transition-colors">
             ดูทั้งหมด
           </button>
         </div>
         <div v-if="recentNews.length === 0" class="text-center py-6 text-slate-500 font-semibold w-full">
            ยังไม่มีข่าวสารในขณะนี้
         </div>
         <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
           <div v-for="news in recentNews" :key="news.id" @click="router.push(`/portal/news/${news.id}`)" class="flex flex-col sm:flex-row gap-5 p-5 rounded-[24px] border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
             <div class="w-full sm:w-28 h-40 sm:h-28 rounded-[18px] flex-shrink-0 bg-cover bg-center shadow-inner overflow-hidden" 
                  :class="!news.cover_image_url ? 'bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center' : ''"
                  :style="news.cover_image_url ? { backgroundImage: `url(${news.cover_image_url})` } : {}">
                  <Megaphone v-if="!news.cover_image_url" class="w-8 h-8 text-indigo-300" />
             </div>
             <div class="flex-1 flex flex-col justify-center">
               <span class="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md mb-2 inline-block w-fit font-['Sarabun']">
                 {{ news.category || 'ประกาศ' }}
               </span>
               <h4 class="text-[15px] font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2">
                 {{ news.title }}
               </h4>
               <p class="text-[11px] text-slate-400 mt-3 flex items-center gap-1.5 font-bold tracking-wider font-['Lato']">
                 <Clock :size="12"/> {{ formatDate(news.published_at || news.created_at) }}
               </p>
             </div>
           </div>
         </div>
       </div>
    </section>
  </div>
</template>
